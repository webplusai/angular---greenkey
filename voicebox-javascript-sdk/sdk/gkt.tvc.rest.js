'use strict';


/**
 * Provides methods for network interoperation with Trader Voice Command (TVC)
 * REST API.
 *
 * TVC singleton creates instance of this class and manages login/logout.
 * @constructor
 *
 * @param {string} urlTVC URL of TVC REST API root.
 * @param {function} runtimeFatalErrorHandlerFunc Handler for fatal errors got during the app session.
 *                                                Can be used for logging out user if TVC API stops
 *                                                functioning for some reason.
 */
function TVCREST(gkt, urlTVC, runtimeFatalErrorHandlerFunc) {

  var loginSessionData;
  var storageLoginSessionKey = GKTAppConfig.storageLoginSessionKey;

  var _checkRuntimeError = function(code, error) {
    if (!runtimeFatalErrorHandlerFunc) {
      return;
    }

    if (code === 401 || code === 403 || code === 400) {
      runtimeFatalErrorHandlerFunc({
        error: error,
        code: code
      });
    }
  };

  /**
   * Sends request to TVC via selected http method
   * @param wsURL
   * @param method
   * @param data
   */
  var makeAjaxRequest = function(url, method, data) {
    return new Promise(function (resolve, reject) {
      if (!loginSessionData) {
        reject(new TVCWebServiceError("User not logged in", url, -1, undefined));
        return;
      }

      method = method || "GET";

      var headers = {
        "Access-Token": loginSessionData ? loginSessionData.tvcSessionAuthToken : null
      };
      var requestAddress = /^http(s)?:\/\/(\w)+/.test(url) ? url : urlTVC + url;
      var requestOptions = {
        url: requestAddress,
        method: method,
        headers: headers
      };

      if (method !== "GET") {
        if (data instanceof FormData) {
          requestOptions["data"] = data;
          headers["Content-Type"] = null;
        } else {
          headers["Content-Type"] = "application/json";
          requestOptions["data"] = JSON.stringify(data);
        }
      }

      ajax(requestOptions)
        .always(function (response, request) {
          if (request.status != 200) {
            var error = new TVCWebServiceError(urlTVC + url, request.status, request.responseText);
            reject(error);
            _checkRuntimeError(request.status, error);
          } else {
            resolve(response);
          }
        });
    });
  };

  /**
   * Common way to POST data to any TVC REST service providing the required auth data.
   * @param {string} wsURL URL starting from root (similar to "/api/v1/contact").
   */
  var httpGetJSON = function (wsURL) {
    return makeAjaxRequest(wsURL, 'GET');
  };

  /**
   * Common way to POST data to any TVC REST service providing the required auth data.
   * @param {string} wsURL URL starting from root (similar to "/api/v1/contact").
   * @param {object} bodyJSON Object to POST.
   */
  var httpPostJSON = function (wsURL, bodyJSON) {
    return makeAjaxRequest(wsURL, "POST", bodyJSON);
  };


  var httpDeleteJSON = function (wsURL, bodyJSON) {
    return makeAjaxRequest(wsURL, "DELETE", bodyJSON);
  };

  var httpPutJSON = function (wsURL, bodyJSON) {
    return makeAjaxRequest(wsURL, "PUT", bodyJSON);
  };

  /**
   * Executes login to TVC provision service with the specified username,
   * password. If "boolKickOthers" param is set to true - notifies TVC that it
   * should force-logout all other logged in TVB/TVB Web instances having the same user/pass.
   *
   * @param {GKTLoginData} loginData
   *
   */
  var loginAndGetAuthToken = function(loginData) {

    var preparedData = loginData.getPreparedData();

    preparedData['version'] = gkt.getVersion();

    var data = JSON.stringify(preparedData);
    var wsURL = urlTVC + loginData.endpointUrl;

    function getResponseError(code, response, responseText) {
      if (code === 400) {
        /*
         Currently TVC returns errors reasons in a tricky way.
         Response text can be either: { username: ["reason"] } (for 401 errors)
         or: { username: "reason" } (for 403 errors).
         */
        var tvcReason = (response && response.username) ? response.username : null;
        tvcReason = Array.isArray(tvcReason) && tvcReason[0] ? tvcReason[0] : tvcReason;
        if (tvcReason === "Wrong password.")
          return new TVCWrongPassword(wsURL, code, responseText);

        if (tvcReason === "Wrong cluster.")
          return new TVCLoginDisabledOnCluster(wsURL, code, responseText);

        if (tvcReason === "User not found.")
          return new TVCWrongUserName(wsURL, code, responseText);

        if (tvcReason === "IP is blocked")
          return new TVCIPBlocked(wsURL, code, responseText);

        //Falling back to default "login failed" error
        return new TVCLoginFailedError(null, wsURL, code, responseText);
      }

      if (code === 409)
        return new TVCDuplicateLoginError(wsURL, code, responseText);

      if (code !== 200)
        return new TVCWebServiceError("Can't login to TVC.", wsURL, code, responseText);

      //For example if CORS headers are configured wrong for this origin on TVC
      //- ajax request will return code 200 but empty response and it is actually an error.
      if (!response)
        return new TVCWebServiceError("TVC login service returned empty response.", wsURL, code, responseText);

      if (!response.token)
        return new TVCWebServiceError("TVC login service didn't return auth token.", wsURL, code, responseText);

      return undefined;
    }

    return new Promise(function(resolve, reject) {
      ajax({
        url: wsURL,
        method: 'POST',
        headers: {"Content-Type": "application/json"},
        data: data
      }).always(function (response, request) {
        var error = getResponseError(request.status, response, request.responseText);
          if (error) {
            reject(error);
            _checkRuntimeError(request.status, error);
            return;
          }

        resolve(response.token);
        }
      );
    });
  };

  this.getUrl = function(){
    return urlTVC;
  };

  /**
   * @typedef {object} TVCRESTSessionData
   * @param {string} username
   * @param {string} password
   * @param {string} hardwareId
   * @param {string} tvcSessionAuthToken
   */
  /**
   * @typedef {object} ConfigAndTVCRESTSessionData
   *                                      An internal type for login() workflow. Consists of the config JSON
   *                                      returned by provision service and auth session data which can be used
   *                                      further for restoring existing session after page reloading.
   * @property {object} config            Provision config in the form of JSON object having property names in
   *                                      its fields and values in field values.
   * @property {TVCRESTSessionData} loginSessionData
   *                                      Session data used by TVCREST component to authenticate on TVC services.
   *                                      Can be stored by the client code to restore existing sessions after
   *                                      page reloading.
   */


  /**
   * Logins at Trader Voice Command REST API.
   * This includes:
   * 1. Login at /provision service.
   * If "boolKickOthers" is set to false - TVC can respond with 409/Conflict.
   * This means there is another TVB/TVB Web app session already online with the same username/password.
   * User can either repeat login with "boolKickOthers" set to true - to kick that session or
   * go offline him/her-self.
   * 2. Login at TVC Marionette auth service and get its access token for further using the REST API.
   * Originally installable TVB was logging in at /provision only. And provision service was setting the cookie.
   * Now TVB Web is hosted on different domains and it is problematic to deal with cookies on cross-domain
   * requests. So TVB Web uses Marionette token for authenticating on the REST API and sends username/pass
   * to /provision every time it needs to post the config.
   * 3. Storing url, username, password, marionette token and other things to local vars.
   * They are needed for further accessing the REST API.
   * To clear the stored data - call logout().
   * @param {GKTLoginData} loginData data for TVC authorization
   * @returns {Promise<ConfigAndTVCRESTSessionData|TVCWebServiceError>} Promise providing an object with the
   *                            provision config and auth session data.
   */
  this.login = function (loginData) {
    var self = this;
    return loginAndGetAuthToken(loginData)
      .then(function (token) {
        loginSessionData = {
          tvcSessionAuthToken: token
        };
      });
  };

  /**
   * Register a new user.
   * @param options {Object}
   * @param options.email {String}
   * @param options.firstname {String}
   * @param options.lastname {String}
   */
  this.registration = function (options) {
    var url = urlTVC + '/marionette_api/auth/registration/';

    return ajax({
      url: url,
      method: 'POST',
      headers: {
        'Access-Token': null,
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(options)
    });
  };

  this.storeSession = function(sessionData) {
    sessionData[storageLoginSessionKey] = loginSessionData;
  };

  this.getAuthToken = function(){
    return loginSessionData ? loginSessionData.tvcSessionAuthToken : null;
  };

  /**
   *
   * @param {TVCRESTSessionData} sessionData
   */
  this.restoreSession = function (sessionData) {
    loginSessionData = sessionData[storageLoginSessionKey];
    return loginSessionData;
  };

  this.isLoggedIn = function() {
    return !!loginSessionData;
  };

  /**
   * Logout from TVC REST service API and clear all stored session data.
   */
  this.logout = function () {
    localStorage.removeItem(storageLoginSessionKey);
    loginSessionData = undefined;
  };


  /**
   * POSTs config properties to TVC provision service and gets updated
   * properties from its response.
   *
   * @param {object} [propertiesJSON]
   *            JSON object containing properties. Field names are property
   *            names, values are property values. Single level of nesting.
   *
   * @returns {Promise} Promise finishing when TVC responses. Resolve function
   *          is called with updated properties JSON object as a param. Reject
   *          function is called with { code: http_error_code, reason:
	 *          tvc_response_text }.
   */
  this.postConfigAndGetUpdated = function (propertiesJSON) {
    var wsURL = urlTVC + "/provision-web";

    return new Promise(function (resolve, reject) {
      if (!loginSessionData) {
        reject(new TVCWebServiceError("User not logged in", wsURL, -1, undefined));
        return;
      }

      var data = JSON.stringify(propertiesJSON || {});

      ajax({
        url: wsURL,
        method: 'POST',
        headers: {
          "Access-Token": loginSessionData ? loginSessionData.tvcSessionAuthToken : null,
          "Content-Type": "application/json"
        },
        data: data
      }).always(function (response, request) {
        if (request.status != 200) {
          var error = new TVCWebServiceError("Can't POST config to provision service and get updated.",
            wsURL, request.status, request.responseText);
          reject(error);
          _checkRuntimeError(request.status, error);
        } else {
          resolve(response);
        }
      });
    });
  };

  /**
   * Get current provision config - user needs to be logged in.
   */
  this.getCurrentConfig = function () {
    return httpGetJSON("/provision-web");
  };


  /**
   * Get direct or external contacts of the current user.
   * Direct contacts - hoots, ringdowns, team hoots, ransquawks, e.t.c.
   * External contacts - non-TVB contacts added by user to his address book.
   *
   * For understanding response structure:
   * 1. Login to TVC in browser (https://xxx.tradervoicebox.com)
   * 2. GET https://xxx.tradervoicebox.com/api/v1/contacts?direct=1 or 0
   *
   * @param boolDirect If true - load direct contacts. False - load external contacts.
   */
  this.getContacts = function (boolDirect) {
    return httpGetJSON("/api/v1/contacts?direct=" + (boolDirect ? "1" : "0"));
  };

  /**
   * Update direct contact with the specified UID.
   * Works at least for direct contact type updates: hoot vs ringdown.
   * To switch contact to "hoot" type: TVC.updateDirectContact(uid, { 'auto_answer': true })
   * To switch contact to "ringdown" type: TVC.updateDirectContact(uid, { 'auto_answer': false })
   * @param contactUID
   * @param updateData Any JSON object that will be POSTed to /api/v1/direct_contact/uid
   */
  this.updateDirectContact = function (contactUID, updateData) {
    return httpPostJSON("/api/v1/direct_contact/" + contactUID, updateData);
  };

  var generateUUID = function(){
    var d = new Date().getTime();
    if(window.performance && typeof window.performance.now === "function"){
      d += performance.now(); //use high-precision timer if available
    }
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  };

  var getCurrentDate = function() {
    var date = new Date();
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();
    return yyyy + "-" + (mm[1]?mm:"0"+mm[0]) + "-" + (dd[1]?dd:"0"+dd[0]);
  };

  this.getChatMessages = function(pageSize) {
    return httpGetJSON("/api/v1/chat/search?pagesize=" + (pageSize || 10000) + "&date=" + getCurrentDate());
  };

  /*
   * @param options {object}
   * @param opetions.messageText {string}
   * @param opetions.toUser {string}
   * @param opetions.fromUser {string}
   * @param opetions.subject {string}
   * @param opetions.messageDate {Date}
   * @param opetions.network {string}
   * @param opetions.userIsBlacklisted {boolean}
   * @param opetions.conversationId {string}
   * @param opetions.gktUserName {string}
   * @param opetions.gktUserId {string}
   * @param opetions.chatAccount {string}
   */
  this.logChatMessage = function (options) {

    var conversation = options.messageDate.format('YYYYMMDD') +
      (options.conversationId || generateUUID());

    // TODO: save message date as messageTimeStamp, instead of subject
    var msg = {
      "uid": generateUUID(),
      "content": options.userIsBlacklisted ? "User is blacklisted, message wasn't logged." : options.messageText,
      "subject": options.subject,
      "messageDate": options.messageDate.toISOString(),
      "contentType": "text/plain",
      "timeStamp": Date.now(),
      "timeStampISO": new Date().toISOString(),
      "network": options.network,
      "userIsBlacklisted": options.userIsBlacklisted,
      "from": {"id": options.fromUser, "uid": options.fromUserUid, "userName": options.fromUser},
      "to": {"id": options.toUser, "uid": options.toUserUid, "userName": options.toUser},
      "conversation": conversation,
      "userInfo": {
        "gktUserName": options.gktUserName,
        "gktUserId": options.gktUserId,
        "chatAccount": options.chatAccount
      },
      "type": options.type || "text",
      "attachmentCaption": options.attachmentCaption || "",
      "attachmentUrl": options.attachmentUrl || ""
    };

    return httpPostJSON("/api/v1/chat", msg);
  };

  this.getDirectUrlForUploadedFile = function(encodedUrl) {
    var urlParser = document.createElement('a');
    var address = [encodedUrl, 'no_redirect=1'].join(urlParser.search ? '&' : '?');

    return httpGetJSON(address).then(function(fileData) {
      return new Promise(function(resolve, reject) {
        if (fileData && fileData.url) {
          resolve(fileData.url);
          return;
        }
        reject();
      });
    });
  };

  /**
   * Search for a user in Green Key network by his/her name.
   * @param searchName
   */
  this.searchUserByName = function (searchName) {
    return httpGetJSON("/marionette_api/user/search/?search_name=" + searchName);
  };

  /**
   * Search for a user in Green Key network by his/her name.
   * @param searchName
   */
  this.getExternalTeamHoots = function (searchName) {
    return httpGetJSON("/marionette_api/teamhoot/public/");
  };

  /**
   * Get the company list.
   */
  this.getCompanies = function () {
    return httpGetJSON("/marionette_api/api/v2/directory");
  };

  /**
   * Get the products list.
   * @param options.q {String} query to filter products.
   * @param options.page {Integer} A given page to get.
   * @param options.page_limit {Integer} Page limit.
   */
  this.getProducts = function (options) {
    var defaultQuery = {
      q: '',
      page: 1,
      page_limit: 20
    };
    var query = _.defaults(options || {}, defaultQuery);

    return httpGetJSON("/marionette_api/auth/product/live-search/?q=" + query.q + "&page=" + query.page + "&page_limit=" + query.page_limit);
  };

  /**
   * Request the connection to a gicven company.
   * @param options.connection_type {String} ['ringdown' | 'hoot']
   * @param options.counterparty_company {Integer} company id.
   * @param options.message {String} A manager msg.
   * @param options.products {Array} Array of the products ids.
   */
  this.requestDirectCompanyConnection = function (options) {
    return httpPostJSON("/marionette_api/api/v1/direct-connection-request/", options);
  };

  /**
   * Request direct connection with a user in Green Key network.
   * @param data
   */
  this.createDirectConnection = function (data) {
    return httpPostJSON("/marionette_api/api/v1/contact", data);
  };

  /**
   * Load pending direct connection requests of the current user.
   */
  this.getDirectConnectionRequests = function () {
    return httpGetJSON("/marionette_api/on_net_directory/contact-request/");
  };

  /**
   * Accept direct connection request.
   * @param pendingConnection JSON object representing pending connection request
   *          as returned from getDirectConnectionRequests() function.
   * @param pendingConnection.id Identifier of the pending direct connection request.
   * @param pendingConnection.connection_type Either "Hoot" or "Ringdown".
   */
  this.acceptDirectConnectionRequest = function (pendingConnection) {
    return httpPostJSON("/marionette_api/on_net_directory/contact_request/incoming/accept/"
        + pendingConnection.id, {
      "auto_answer_from": (pendingConnection.connection_type === 'Hoot')
    });
  };

  /**
   * Reject direct connection request.
   * @param pendingConnection JSON object representing pending connection request
   *          as returned from getDirectConnectionRequests() function.
   * @param pendingConnection.id Identifier of the pending direct connection request.
   * @param pendingConnection.connection_type Either "Hoot" or "Ringdown".
   */
  this.rejectDirectConnectionRequest = function (pendingConnection) {
    return httpPostJSON("/marionette_api/on_net_directory/contact_request/incoming/reject/"
        + pendingConnection.id, {});
  };

  /**
   * Reject/Cancel an outgoing connection request.
   * @param pendingConnection JSON object representing pending connection request
   *          as returned from getDirectConnectionRequests() function.
   * @param pendingConnection.id Identifier of the pending direct connection request.
   */
  this.cancelOutgoingConnectionRequest = function (pendingConnection) {
    return httpPostJSON("/marionette_api/on_net_directory/contact_request/outgoing/delete/"
        + pendingConnection.id, {});
  };

  /**
   * Reject/Cancel an outgoing connection request.
   * @param pendingConnection JSON object representing pending connection request
   *          as returned from getDirectConnectionRequests() function.
   * @param pendingConnection.id Identifier of the pending direct connection request.
   */
  this.resendPendingConnection = function (pendingConnection) {
    return httpPostJSON("/marionette_api/on_net_directory/contact_request/outgoing/resend/"
        + pendingConnection.id, {});
  };

  /**
   * Remove a rejected connection request.
   * @param pendingConnection JSON object representing pending connection request
   *          as returned from getDirectConnectionRequests() function.
   * @param pendingConnection.id Identifier of the pending direct connection request.
   */
  this.removeRejectedRequest = function (connection) {
    return httpDeleteJSON("/marionette_api/on_net_directory/remove-rejected-request/", {
      id: connection.id
    });
  };

  /**
   * Post application event to elastic search.
   * This is a good way for posting debug and tracing info.
   * Next application events can be searched by different fields in Kibana app.
   * @param appEvent
   */
  this.postAppEventToKibana = function (appEvent) {
      return httpPostJSON("/api/v1/usage_events", appEvent);
  };

  /**
   * Load call history of the current user from TVC.
   * TVC retrieves call history straight from SIP backend.
   * @param from
   * @param limit
   */
  this.getCallHistory = function (from, limit) {
    return httpGetJSON("/call-history", {"from": from, "limit": limit});
  };

  /**
   * Post chat history entry to TVC.
   * @param data
   */
  this.postToChatAPI = function (data) {
    return httpPostJSON("/api/v1/chat", data);
  };


  this.getReferralLink = function() {
    return httpGetJSON("/marionette_api/auth/get-links/").then(function(data) {
      return data && data.referal || null;
    });
  };

  /**
   * @param emails {array}
   * @param greeting {string}
   */
  this.invitePersonsToGKTNetwork = function (emails, greeting) {
    return httpPostJSON("/marionette_api/referrals/user/send_invite/", {
      emails: emails,
      greeting: greeting
    });
  };

  this.deleteConnection = function (connection) {
    return httpDeleteJSON("/marionette_api/api/v1/contact/" + connection.uid);
  };


  this.updateExternalContact = function(updateData) {
    return httpPutJSON("/marionette_api/contact/", updateData);
  };

  /**
   * Sends request to backend for import contacts from attached file
   * @param contactsFile File
   * @returns {Promise}
   */
  this.importExternalContacts = function(contactsFile) {
    if (! contactsFile instanceof File) {
      return Promise.reject("wrong input format");
    }

    var contactsData = new FormData();
    contactsData.append("csv_file", contactsFile);

    return httpPostJSON("/marionette_api/address_book/contact/import", contactsData);
  };

  /**
   * Sends request to backend for uploading selected file to S3
   * @param file Blob
   * @returns Promise
   */
  this.uploadFileToS3 = function(file) {
    if (! file instanceof Blob) {
      return Promise.reject("wrong input format");
    }

    var uploadData = new FormData();
    uploadData.append("file", file);

    return httpPostJSON("/uploads/", uploadData);
  };

  /**
   * Sends request for updating user's avatar
   * @param avatarImage
   * @param xLeft
   * @param xRight
   * @param yTop
   * @param yBottom
   * @returns Promise
   */
  this.uploadNewAvatar = function(avatarImage, xLeft, xRight, yTop, yBottom) {
    if (! avatarImage instanceof Blob) {
      return Promise.reject("wrong input format");
    }

    var uploadData = new FormData();
    uploadData.append("avatar", avatarImage);
    uploadData.append("x1", xLeft);
    uploadData.append("x2", xRight);
    uploadData.append("y1", yTop);
    uploadData.append("y2", yBottom);

    return httpPutJSON("/marionette_api/auth/profile/avatar/", uploadData);
  };

  /**
   * Get the event log list.
   * @param from The number of previous days to fetch the history.
   * @param limit The number of days to limit the history list.
   */
  this.getEventLog = function (from, limit, page, pageSize) {
    var args = '';
    args += from ? 'date_from=' + from : '';
    args += limit ? '&date_limit=' + limit : '';
    args += pageSize ? '&page_size=' + pageSize : '';
    args += page ? '&page=' + page : '';

    return httpGetJSON("/tvbweb-events/?" + args);
  };

  /**
   * Create an event log.
   */
  this.createEventLogRecord = function (logData) {
    return httpPostJSON("/tvbweb-events/", logData);
  };

  /**
   * Update an event log.
   */
  this.updateEventLogRecord = function (id, logData) {
    return httpPutJSON("/tvbweb-events/" + id + "/", logData);
  };

  /**
   * Get the user's profile.
   */
  this.getProfile = function () {
    return httpGetJSON('/marionette_api/auth/profile/');
  };

  /**
   * Returns public profile info of a user with given uid
   * @param {String} uid uid of a user
   */
  this.getPublicProfile = function(uid) {
    return httpGetJSON('/marionette_api/user/public-profile/' + uid);
  }
}

/**
 * Common login data
 *
 * @param kickOthers {boolean} Notify TVC that you want force-logout all other
 *            client apps having the same username/password. On first try
 *            this probably should set to false - so TVC will return
 *            409/Conflict and the app should request user for the further
 *            actions - kick others or logout him/herself. Next if user
 *            selects kicking other - this request should be repeated with
 *            this param set to true.
 * @param endpointUrl TVC url to send request to
 * @constructor
 */
function GKTLoginData(kickOthers, endpointUrl) {
  this._kickOthers = !!kickOthers;

  this.hardwareId = undefined;
  this.endpointUrl = endpointUrl;
}

/**
 * Composes an object with required data to send to TVC
 * @returns {Object} object with authorization data
 */
GKTLoginData.prototype.getPreparedData = function() {
  return {
    hw_id: this.hardwareId,
    kick_others: this._kickOthers
  };
};

/**
 * Data for simple username/password login
 * @param user {string} username
 * @param password {string} password
 * @param kickOthers {boolean} Notify TVC that you want force-logout all other
 *            client apps having the same username/password
 * @constructor
 */
function SimpleLoginData(user, password, kickOthers) {
  GKTLoginData.call(this, kickOthers, '/marionette_api/auth/tvb-login/');
  this._username = user;
  this._password = password;
}
SimpleLoginData.prototype = Object.create(GKTLoginData.prototype);
SimpleLoginData.prototype.constructor = SimpleLoginData;
SimpleLoginData.prototype.getPreparedData = function() {
  return _.assign(GKTLoginData.prototype.getPreparedData.call(this), {
    username: this._username,
    password: this._password
  })
};

/**
 * Data for login via OAuth
 * @param code {string} LinkedIn authorization code
 * @param redirectUri {string} redirect uri from previous request (for auth code)
 * @param kickOthers {boolean} Notify TVC that you want force-logout all other
 *            client apps having the same username/password
 * @param endpointUrl {string} URL of TVC's endpoint to process this kind of login
 * @constructor
 */
function OAuthLoginData(code, redirectUri, kickOthers, endpointUrl) {
  GKTLoginData.call(this, kickOthers, endpointUrl);
  this._authCode = code;
  this._redirectUri = redirectUri;
}
OAuthLoginData.prototype = Object.create(GKTLoginData.prototype);
OAuthLoginData.prototype.constructor = OAuthLoginData;
OAuthLoginData.prototype.getPreparedData = function() {
  return _.assign(GKTLoginData.prototype.getPreparedData.call(this), {
    code: this._authCode,
    redirect_uri: this._redirectUri
  })
};

/**
 * Data for login via LinkedIn
 * @constructor
 */
function LinkedInLoginData(code, redirectUri, kickOthers) {
  OAuthLoginData.call(
    this, code, redirectUri, kickOthers, '/marionette_api/auth/oauth/linkedin/tvbw/');
}
LinkedInLoginData.prototype = Object.create(OAuthLoginData.prototype);
LinkedInLoginData.prototype.constructor = LinkedInLoginData;

/**
 * Data for login via Trader Technologies
 * @constructor
 */
function TTLoginData(code, redirectUri, kickOthers) {
  OAuthLoginData.call(
    this, code, redirectUri, kickOthers, '/marionette_api/auth/oaut/tt/tvbw/');
}
TTLoginData.prototype = Object.create(OAuthLoginData.prototype);
TTLoginData.prototype.constructor = TTLoginData;

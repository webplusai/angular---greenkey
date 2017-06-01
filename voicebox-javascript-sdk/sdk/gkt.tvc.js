'use strict';


/**
 * Error class representing an error thrown by a web service.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCWebServiceError(errorTypeMessage, url, code, responseText) {
  Error.call(this);
  this.name = this.constructor.name;
  Error.captureStackTrace(this, this.constructor);
  this.message = errorTypeMessage + "\n" +
    "URL: " + url + ", HTTP Code: " + code + ", response text: " + responseText;
  this.url = url;
  this.code = code;
  this.responseText = responseText;
}
TVCWebServiceError.prototype = Object.create(Error.prototype);

/**
 * Error class representing failed attempt to login at some webservice.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCLoginFailedError(message, url, code, responseText) {
  TVCWebServiceError.call(this, (message ? message : "Login failed."), url, code, responseText);
}
TVCLoginFailedError.prototype = Object.create(TVCWebServiceError.prototype);

/**
 * Error class representing the fact somebody else is already
 * logged in at this service with these username/password.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCDuplicateLoginError(url, code, responseText) {
  TVCLoginFailedError.call(this, "Duplicate login.", url, code, responseText);
}
TVCDuplicateLoginError.prototype = Object.create(TVCLoginFailedError.prototype);

/**
 * Error class representing the fact username is wrong on login attempt.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCWrongUserName(url, code, responseText) {
  TVCLoginFailedError.call(this, "Login failed. Username is wrong.", url, code, responseText);
}
TVCWrongUserName.prototype = Object.create(TVCLoginFailedError.prototype);

/**
 * Error class representing that login is disabled on the user's cluster for this client app version.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCLoginDisabledOnCluster(url, code, responseText) {
  TVCLoginFailedError.call(this, "User is not on supported cluster.", url, code, responseText);
}
TVCLoginDisabledOnCluster.prototype = Object.create(TVCLoginFailedError.prototype);

/**
 * Error class representing the fact password is wrong on login attempt.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCWrongPassword(url, code, responseText) {
  TVCLoginFailedError.call(this, "Login failed. Password is wrong.", url, code, responseText);
}
TVCWrongPassword.prototype = Object.create(TVCLoginFailedError.prototype);

/**
 * Error class representing the fact that this IP is blocked on login attempt.
 * @param code
 * @param responseText
 * @constructor
 */
function TVCIPBlocked(url, code, responseText) {
  TVCLoginFailedError.call(this, "Login failed. IP is blocked.", url, code, responseText);
}
TVCIPBlocked.prototype = Object.create(TVCLoginFailedError.prototype);

/**
 * Provides methods for network interoperation with Trader Voice Command (TVC)
 * server.
 *
 * It is a singletone - one instance per whole application.
 *
 */
function TVCService(gkt) {
  'use strict';

  this.CONNECTION_STATES = TVC_CONNECTION_STATES;

  var runtimeFatalErrorListeners = new Set();

  function fireRuntimeFatalError(error) {
    runtimeFatalErrorListeners.forEach(function (listenerFunc) {
      listenerFunc(error);
    });
  }

  /**
   * Add a listener for fatal runtime errors.
   * Such errors mean that TVC API stopped working correctly
   * and the user should be logged out.
   *
   * @param {function} listenerFunc
   */
  this.addRuntimeFatalErrorListener = function (listenerFunc) {
    runtimeFatalErrorListeners.add(listenerFunc);
  };

  /**
   * Remove a listener for fatal runtime errors.
   *
   *  @param {function} listenerFunc
   */
  this.removeRuntimeFatalErrorListener = function (listenerFunc) {
    runtimeFatalErrorListeners.delete(listenerFunc);
  };

  var rest = new TVCREST(gkt, GKTAppConfig.tvcUrl, fireRuntimeFatalError);

  this.getContacts = rest.getContacts;
  this.updateDirectContact = rest.updateDirectContact;
  this.getChatMessages = rest.getChatMessages;
  this.logChatMessage = rest.logChatMessage;
  this.getDirectUrlForUploadedFile = rest.getDirectUrlForUploadedFile;
  this.searchUserByName = rest.searchUserByName;
  this.getExternalTeamHoots = rest.getExternalTeamHoots;
  this.getCompanies = rest.getCompanies;
  this.getProducts = rest.getProducts;
  this.requestDirectCompanyConnection = rest.requestDirectCompanyConnection;
  this.createDirectConnection = rest.createDirectConnection;
  this.getDirectConnectionRequests = rest.getDirectConnectionRequests;
  this.acceptDirectConnectionRequest = rest.acceptDirectConnectionRequest;
  this.rejectDirectConnectionRequest = rest.rejectDirectConnectionRequest;
  this.cancelOutgoingConnectionRequest = rest.cancelOutgoingConnectionRequest;
  this.resendPendingConnection = rest.resendPendingConnection;
  this.removeRejectedRequest = rest.removeRejectedRequest;
  this.postAppEventToKibana = rest.postAppEventToKibana;
  this.getCallHistory = rest.getCallHistory;
  this.postToChatAPI = rest.postToChatAPI;
  this.getReferralLink = rest.getReferralLink;
  this.invitePersonsToGKTNetwork = rest.invitePersonsToGKTNetwork;
  this.deleteConnection = rest.deleteConnection;
  this.updateExternalContact = rest.updateExternalContact;
  this.importExternalContacts = rest.importExternalContacts;
  this.uploadFileToS3 = rest.uploadFileToS3;
  this.postConfigAndGetUpdated = rest.postConfigAndGetUpdated;
  this.getCurrentConfig = rest.getCurrentConfig;
  this.isLoggedIn = rest.isLoggedIn;
  this.storeSession = rest.storeSession;
  this.restoreSession = rest.restoreSession;
  this.registration = rest.registration;
  this.getEventLog = rest.getEventLog;
  this.createEventLogRecord = rest.createEventLogRecord;
  this.updateEventLogRecord = rest.updateEventLogRecord;
  this.getProfile = rest.getProfile;
  this.uploadNewAvatar = rest.uploadNewAvatar;
  this.getPublicProfile = rest.getPublicProfile;

  /**
   * Gets hardware id from local storage or calculates new one.
   *
   * Client application instances (TVB Web or TVB) are identified on the TVC
   * app server by username+hw_id. This is required, for example, to separate
   * configuration set of two TVB instances running on different laptops
   * having different audio devices (this is for installable TVB). User can
   * configure different audio devices on different devices and both configs
   * will exist and can be retrieved by specifying different hw_ids.
   */
  function getHardwareId() {
    var hwId = localStorage["hw_id"];
    if (!hwId) {
      hwId = (new Date().getTime().toString(16))
        + (Math.round(Math.random() * 10000000000000000)).toString(16)
        + (Math.round(Math.random() * 10000000000000000)).toString(16);
      localStorage["hw_id"] = hwId;
    }
    return hwId;
  }

  this.login = function (loginData) {
    loginData.hardwareId = getHardwareId();
    return rest.login(loginData);
  };
  this.logout = function() {
    rest.logout();
    socketIO.logout();
  };


  var webSocket = new TVCWebSocket();

  this.addMessageListener = webSocket.addMessageListener;
  this.removeMessageListener = webSocket.removeMessageListener;
  this.sendMessageToTVC = webSocket.sendMessageToTVC;
  this.sendMessageToContact = webSocket.sendMessageToContact;

  var socketIO = new TVCSocketIO();

  this.sendSocketIOMessageToTVC = socketIO.sendMessageToTVC;

  this.sendIdleStatusToTVC = function(isIdle) {
    webSocket.sendMessageToTVC("idle_status_update", {
      "idle": isIdle ? 1 : 0
    });
  };

  var contactManager = new ContactManagerService(rest, webSocket);
  var contactRequestManager = new ContactRequestManagerService(webSocket);

  this.getContactManager = function () {
    return contactManager;
  };

  this.getContactRequestManager = function () {
    return contactRequestManager;
  };

  var tvcConnectionManager = new TVCConnectionManger(webSocket, contactManager);

  this.connect = tvcConnectionManager.connect;
  this.disconnect = tvcConnectionManager.disconnect;
  this.addStateListener = tvcConnectionManager.addStateListener;
  this.removeStateListener = tvcConnectionManager.removeStateListener;

  this.configure = function (config) {
    var urlSocket = config["net.java.sip.communicator.url.WEBSOCKET_URL"];
    if (!urlSocket)
      throw new TVCWebServiceError("TVC WebSocket URL is not specified in the provision config.");
    webSocket.setUrl(urlSocket);

    var urlSocketIO = config["net.java.sip.communicator.url.SOCKET_IO_URL"];
    var pathSocketIO = config["net.java.sip.communicator.url.SOCKET_IO_PATH"];
    if (!urlSocketIO || !pathSocketIO)
      throw new TVCWebServiceError("TVC Socket.IO URL is not specified in the provision config.");
    socketIO.configure(urlSocketIO, pathSocketIO, rest.getAuthToken());
  };
}

'use strict';
var Connection = Connection;
var HootConnection = HootConnection;
var CONST_NOT_LOGGED_IN_TEXT = "<not logged in>";

/*
 * Copyright (C) 2015 Green Key Technologies <https://greenkeytech.com/>
 */

/**
 * @fileoverview This is the GKT Javascript SDK , it allows the integration of GKT voice api into any browser supporting webrtc .
 *
 * @name GKT Javascript SDK
 * @author      Green Key Technologies <https://greenkeytech.com/>
 * @version     0.1
 */



/**
 * @namespace
 * @description Root namespace.
 */


function GKTService () {

  /**
   * Default value for username, company and location fields in logs when
   * the user is not logged in at the moment.
   */

  /**
   * Current logged user name.
   *
   * Assigned at login time and unassigned back to "<not_logged_in>" a on logout.
   */
  this.userName = CONST_NOT_LOGGED_IN_TEXT;

  /**
   * Current logged user's company.
   *
   * Assigned at login time and unassigned back to "<not_logged_in>" a on logout.
   */
  this.company = CONST_NOT_LOGGED_IN_TEXT;

  /**
   * Current logged user's location.
   *
   * Assigned at login time and unassigned back to "<not_logged_in>" a on logout.
   */
  this.location = CONST_NOT_LOGGED_IN_TEXT;

  var tvc;

  var sipManager;

  /**
   * @type {GlobalAppConnectionManagerService}
   */
  var connection;

  var audioDevices;

  var callManager;

  var gktConfig;

  var status = GKTConstants.PRESENCE.offline;

  var self = this;

  this.eventsBus = new Mediator();

  this.registeredEvents = new Set();

  this.getTVC = function() {
    return tvc;
  };

  this.getSipManager = function(){
    return sipManager;
  };

  this.getCallManager = function() {
    return callManager;
  };

  this.getAudioDevices = function() {
    return audioDevices;
  };

  function init() {
    tvc = new TVCService(self);
    tvc.addRuntimeFatalErrorListener(function (errorEvent) {
      trigger(GKTConstants.APP_EVENTS.fatal_error, errorEvent);
    });
    tvc.addMessageListener('force_logout', function (eventType, sourceContactUID, data) {
      //Ignore possible force-logout joke messages sent by other clients
      if (sourceContactUID)
        return;

      var logoutReason = data && data.reason === 'another login' ?
        GKTConstants.FORCE_LOGOUT_REASONS.duplicate_login :
        GKTConstants.FORCE_LOGOUT_REASONS.kicked_by_admin;

      trigger(GKTConstants.APP_EVENTS.force_logout, logoutReason);
    });

    gktConfig = new RemoteConfig(tvc);
    window.GKTConfig = gktConfig;

    GKTLog.init(self, tvc, gktConfig);

    sipManager = new SipManagerSevice(self);
    window.SipManager = sipManager;

    connection = new GlobalAppConnectionManagerService(tvc);
    window.GlobalAppConnectionManager = connection;
    GlobalAppConnectionManager.addStateListener(function (oldState, newState) {
      if (newState === connection.STATES.force_logout) {
        self.forceLogout();
        return;
      }

      var newStatus = newState === connection.STATES.connected ?
        GKTConstants.PRESENCE.online : GKTConstants.PRESENCE.offline;
      if (newStatus != status) {
        status = newStatus;
        trigger(GKTConstants.APP_EVENTS.status_change, status);
      }
    });
    if (connection.getState() === connection.STATES.force_logout)
      self.forceLogout();


    audioDevices = new AudioDeviceService();
    callManager = new CallManagerService(self, tvc, sipManager, audioDevices, connection, gktConfig);
  }


  /**
   * Notifies global events
   * @since version 0.1a
   * @param {String} event - Sets the event to listen.
   * @param {Function} callback - The callback function called with the event information
   * @param {String} [clean] - This parameter will remove all the other listeners listen that event (use with care)
   */
  this.on = function (event, callback, clean) {
    if (clean) {
      self.eventsBus.remove(event);
    }

    self.eventsBus.subscribe(event, callback);
    self.registeredEvents.add(event);
  };

  /**
   * @ignore
   */
  function trigger(type, event) {
    self.eventsBus.publish(type, event);
  }

  this.containsSessionData = function(localStorage){
    return !!(localStorage.sessionData && localStorage.sessionData[GKTAppConfig.storageLoginSessionKey]);
  };

  function doLogin(loginData, localStorage) {

    var sessionData = localStorage.sessionData && !loginData ?  localStorage.sessionData : {};

    function connect() {
      return connection.connect();
    }

    function storeSession() {
      if (loginData) {
        sessionData = {};
        sessionData.userInfo = self.getUserInfo();
        tvc.storeSession(sessionData);
        localStorage.sessionData = sessionData;
      }
    }

    function restoreSession() {
      self.userName = sessionData.userInfo.userName;
      self.displayName = sessionData.userInfo.displayName;
      self.international = sessionData.userInfo.international;
      self.formatted_international = sessionData.userInfo.formatted_international;

      tvc.restoreSession(sessionData);
    }

    function configureUserData(data) {
      if (loginData) {
        var did = data['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.ACCOUNT_DID'];
        // resolve func
        self.userName = data['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.LOGIN_NAME'];
        if (!self.userName)
          throw new Error('No login name found in the provision data');
        self.displayName = data['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.DISPLAY_NAME'];
        self.international = did.replace(/ /g, '').replace(/-/g, '').replace('+', '');
        self.formatted_international = did;

        self.synapseToken = data["net.java.sip.communicator.synapse.access_token"];
        self.synapseHomeServer = data["net.java.sip.communicator.synapse.home_server"];
        self.synapseHomeServerUrl = data["net.java.sip.communicator.synapse.home_server_url"];
        self.synapseUserId = data["net.java.sip.communicator.synapse.user_id"];
        // TODO: Consider for refactoring
        window.localStorage.setItem("mx_hs_url",self.synapseHomeServerUrl);
        window.localStorage.setItem("mx_access_token",self.synapseToken);
        window.localStorage.setItem("mx_user_id",self.synapseUserId);

      }
    }

    function configureSip(data) {
      return new Promise(function(resolve){
        if (window.fin && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          fin.desktop.InterApplicationBus.publish('audio.init', data);

          setTimeout(function() {
            // Sip of main window needs to be registered after the previous to keep the invites.
            sipManager.configure(data);
            resolve();
          }, 2000);
        } else {
          sipManager.configure(data);
          resolve();
        }
      })
    }

    function configure(data) {
      configureUserData(data);

      self.company = data['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.COMPANY'];
      self.location = data['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.LOCATION'];
      self.version = getVersionForLog();

      GKTConfig.init(data);

      tvc.configure(data);

      return configureSip(_.assign({}, data, { displayName: self.displayName })).then(function() {
        audioDevices.init(gktConfig, callManager, self.userName, localStorage);
        trigger(GKTConstants.APP_EVENTS.configured, data);
        return data;
      });
    }

    function login(_loginData) {
      return _loginData ? tvc.login(_loginData) : null;
    }

    if (!loginData)
      restoreSession();
    else
      sessionData = {};

    return checkPermissions()
      .then(login.bind(self, loginData))
      .then(tvc.postConfigAndGetUpdated)
      .then(configure)
      .then(storeSession.bind(self, sessionData))
      .then(connect)
  }

  function checkPermissions() {
    return new Promise(function (resolve, reject) {
      if (SIP.WebRTC.isAllowed) {
        resolve();
        return
      }

      SIP.WebRTC.isAllowed = false;
      var timedOut = false;
      var rejectReason = GKTConstants.APP_EVENTS.webrtc_logout;

      try {
        SIP.WebRTC.isSupported()
      } catch (e) {
        reject(rejectReason)
      }
      SIP.WebRTC.getUserMedia({audio: true})
        .then(function () {
            if (!timedOut) {
              SIP.WebRTC.isAllowed = true;
              resolve();
            }
          }, function (err) {
            !timedOut && reject(rejectReason);
          }
        );
      setTimeout(function () {
        if (!SIP.WebRTC.isAllowed) {
          timedOut = true;
          reject(rejectReason);
        }
      }, 60000)
    });
  }

  function reset(localStorage) {
    self.userName = CONST_NOT_LOGGED_IN_TEXT;
    self.company = CONST_NOT_LOGGED_IN_TEXT;
    self.location = CONST_NOT_LOGGED_IN_TEXT;

    self.registeredEvents.forEach(self.eventsBus.remove.bind(self.eventsBus));
    self.registeredEvents.clear();

    delete localStorage.sessionData;
  }

  function getVersionForLog() {
    var version = "vbweb:";
    if (typeof GKT_APP_VERSION != 'undefined' && GKT_APP_VERSION != null) {
      version += GKT_APP_VERSION;
    } else {
      version += "unknown"
    }

    version += "/sdk:";
    if (typeof GKT_SDK_VERSION != 'undefined' && GKT_SDK_VERSION != null) {
      version += GKT_SDK_VERSION;
    } else {
      version += "unknown";
    }
    return version;
  }

  this.getVersion = getVersionForLog;

  this.getStatus = function () {
    return status;
  };

  /**
   * Gets the user session info.
   * @returns {Object} Object with the session info data: { sessionId, userId, userName, userUid, displayName, wsUrl }.
   */
  this.getUserInfo = function () {
    return {
      userName: self.userName,
      company: self.company,
      location: self.location,
      displayName: self.displayName,
      international: self.international,
      formatted_international: self.formatted_international,
      synapseToken: self.synapseToken,
      synapseHomeServer: self.synapseHomeServer,
      synapseHomeServerUrl: self.synapseHomeServerUrl,
      synapseUserId: self.synapseUserId
    };
  };

  /**
   * Inits the application.
   * @since version 0.1a
   * @param {GKTLoginData} data for tvc authorization
   * @returns {Promise} it is fullfilled if login works and sip stack is started, if it fails
   * an object with the following format is thrown
   * {
               *   code:'401',
               *   error: {
               *     "username": [
               *         "Wrong password."
               *     ]
               *  }
               * }
   */
  this.login = function (loginData, localStorage) {
    return doLogin(loginData, localStorage);
  };

  this.restoreSession = function (localStorage) {
    return doLogin(null, localStorage);
  };

  this.isLoggedIn = function () {
    return tvc && tvc.isLoggedIn();
  };

  /**
   * Log out the user and reset the library properties.
   * @since version 0.1a
   * @returns {Boolean} true if logout works, otherwise returns false
   */
  this.logout = function (localStorage) {
    if (!self.isLoggedIn()) {
      return Promise.resolve();
    }
    
    return connection.disconnect().then(function () {
      try {
        tvc.logout();
        reset(localStorage);
      } catch(error) {}
    });
  };

  // Currently when user is forced to log out, page is reloaded.
  // So it doesn't need to redefine this flag somewhere else.
  this.isForcedToLogout = false;

  this.forceLogout = function (error) {
    // to prevent several concurrent requests for logging out
    if (!self.isForcedToLogout) {
      trigger(GKTConstants.APP_EVENTS.force_logout, error);
      self.isForcedToLogout = true;
    }
  };

  init();
}

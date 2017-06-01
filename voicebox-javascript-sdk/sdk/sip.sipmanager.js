function SipManagerSevice(gktService) {
  'use strict';

  var connectionConfig = {};

  var stateChangeListeners = new Set();

  var incomingCallListeners = new Set();

  var callCancellationListeners = new Set();

  var callFailureListeners = new Set();

  var notificationsListeners = new Set();

  var sipSignaling;

  var audioContextHash = {};

  var ctx = new AudioContext();

  function triggerStateChangeEvent(type, event) {
    stateChangeListeners.forEach(function (listener) {
      listener(type, event);
    });
  }

  function triggerIncomingCallEvent(session, call) {
    incomingCallListeners.forEach(function (listener) {
      listener(session, call);
    });
  }

  function triggerCallCancellationEvent(args){
    callCancellationListeners.forEach(function (listener) {
      listener(args);
    });
  }

  function triggerCallFailureEvent(args){
    callFailureListeners.forEach(function (listener) {
      listener(args);
    });
  }

  function triggerNotificationEvent(sipIncomingRequest) {
    notificationsListeners.forEach(function(listener) {
      if (typeof listener !== 'function') {
        return;
      }
      listener(parseIncomingRequestBody(sipIncomingRequest));
    });
  }

  function parseIncomingRequestBody(request) {
    var parsedBody = {};

    if (request instanceof SIP.IncomingRequest) {
      var bodyRows = (request.body || '').split("\n");

      for (var row, i = 0, length = bodyRows.length; i < length; ++i) {
        row = bodyRows[i].split(': ');
        if (row.length === 2) {
          parsedBody[row[0]] = row[1];
        }
      }
    }

    return parsedBody;
  }

  function getUserAgentString() {
    var version = "GKTVoiceBox-";
    if (typeof GKT_SDK_VERSION != 'undefined' && GKT_SDK_VERSION != null) {
      version += GKT_SDK_VERSION;
    } else {
      version += "unknown"
    }
    return version;
  }


  function renderTransportForLog(transport) {
    return transport ? {
      "server": transport.server,
      "last_transport_error": transport.lastTransportError,
      "reconnection_attempts": transport.reconnection_attempts,
      "connected": transport.connected,
      "closed": transport.closed
    } : {};
  }

  function renderUADialogForLog(uaDialog) {
    return  uaDialog ? {
      "id": uaDialog.id,
      "route_set": uaDialog.route_set
    } : {};
  }

  function renderUAForLog(ua) {
    var res =  {
      "dialogs": []
    };

    if (ua && ua.dialogs) {
      for (var key in ua.dialogs) {
        res.dialogs.push(renderUADialogForLog(ua.dialogs[key]))
      }
    }

    return res;
  }

  function renderSessionForLog(session) {
    return  session ? {
      "id": session.id,
      "contact": session.contact,
      "start_time": session.startTime,
      "end_time" : session.endTime
    } : {};
  }

  function sendSessionEventToLog(eventName, session, body) {
    var data = session ? {
      "sip.session": renderSessionForLog(session),
      "sip.session.dialog": renderSessionForLog(session.dialog),
      "sip.ua": renderUAForLog(session.ua),
      "sip.ua.transport": renderTransportForLog(session.ua ? session.ua.transport : null)
    } : {};

    _.assign(data, body);
    GKTLog.sendAppEvent(eventName, data);
  }

  var sipManager = {

    notifications: {
      'overriding': {
        key: 'overriding_registration',
        message: 'You have overridden an existing registration for this device.'
      },
      'replaced': {
        key: 'replaced_registration',
        message: 'You have been disconnected: someone else has registered this device.'
      },
      'voicemail': {
        key: 'voicemail_notification',
        message: 'You have one or more voicemail message(s).'
      },
      'connectivity': {
        key: 'connectivity_notification',
        message: {
          online: 'You have recovered your connection to the network.',
          offline: 'You have lost your connection to the network.'
        },
        status : {
          online: 'online',
          offline: 'offline'
        }
      },
      'reconnecting': {
        key: 'reconnecting_notification',
        message: 'Attempting to reconnect...'
      },
      'transfered': {
        key: 'transfer_notification',
        message: 'Transfer successful.'
      },
      'default': {
        key: 'unknown_notification',
        message: 'You have received a SIP notification.'
      }
    },

    errors: {
      serverNotReachable: {
        key: "server_not_reachable",
        message: "Could not reach the server."
      },
      unauthorized: {
        key: "unauthorized",
        message: "Invalid credentials."
      },
      forbidden: {
        key: "forbidden",
        message: "Forbidden."
      },
      disconnected: {
        key: "disconnected",
        message: "You have been disconnected."
      }
    },

    events: {
      connected: "connected",
      disconnected: "disconnected",
      registered: "registered",
      unregistered: "unregistered",
      registration_failed: "registration_failed"
    },

    addStateListener: function(listener){
      stateChangeListeners.add(listener);
    },

    removeStateListener: function(listener) {
      stateChangeListeners.delete(listener);
    },

    addIncomingCallListener: function(listener){
      incomingCallListeners.add(listener);
    },

    removeIncomingCallListener: function(listener){
      incomingCallListeners.delete(listener);
    },

    addCallFailureListener: function(listener){
      callFailureListeners.add(listener);
    },

    removeCallFailureListener: function(listener){
      callFailureListeners.delete(listener);
    },

    addCallCancellationListener: function(listener){
      callCancellationListeners.add(listener);
    },

    removeCallCancellationListener: function(listener){
      callCancellationListeners.delete(listener);
    },

    addNotificationListener: function(listener) {
      notificationsListeners.add(listener);
      return this.removeNotificationListener.bind(this, listener);
    },

    removeNotificationListener: function(listener) {
      notificationsListeners.delete(listener);
    },

    getSessionInfo: function(){
      return connectionConfig.sessionInfo;
    },

    configure: function(config) {
      sipSignaling = new SipSignaling(config);

      var impi = config['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.USER_ID'];

      connectionConfig.realm = impi.split('@')[1];
      connectionConfig.impi = impi.split('@')[0];
      connectionConfig.impu = 'SIP:' + impi;
      connectionConfig.password = atob(config['net.java.sip.communicator.impl.protocol.sip.acc1375116183879.PASSWORD']);
      connectionConfig.displayName = config.displayName;
      connectionConfig.stunServers = config['net.java.sip.communicator.url.stunServers'];

      var customStun = config["net.java.sip.communicator.url.customStunServers"];
      if(customStun) {
        connectionConfig.stunServers = customStun;
      }

      var turnServersJSON = config['net.java.sip.communicator.url.turnServers.JSON'];

      if (turnServersJSON) {
        try {
          connectionConfig.turnServers = JSON.parse(turnServersJSON);
        } catch (e) {
          console.error("Provision property \"net.java.sip.communicator.url.turnServers.JSON\" is set to: \n"
              + turnServersJSON
              + "\nBut the value can not be parsed to a valid JSON object.", e);
        }
      } else {
        connectionConfig.turnServers = {
          urls: config['net.java.sip.communicator.url.turnServers.url'],
          username: config['net.java.sip.communicator.url.turnServers.username'],
          password: config['net.java.sip.communicator.url.turnServers.password']
        };
      }
      connectionConfig.iceTransports = config['net.java.sip.communicator.iceTransports'];
      connectionConfig.sessionInfo = {
        sipWsUrl: config['url.SIP_WEBSOCKET_URL'],
        username: connectionConfig.displayName
      };

    },

    isConfigured: function() {
      return !!connectionConfig.sessionInfo;
    },

    register: function(isFinAudioApp) {
      sipManager.logout();

      var stunServers = connectionConfig.stunServers || 'stun:cturn.tradervoicebox.com:443';
      var turnServers = _.clone(connectionConfig.turnServers) || {
          urls: "turn:cturn.tradervoicebox.com:443?transport=tcp",
          username: "tvblite",
          password: "GsTyusw#45"
        };
      var iceTransports = connectionConfig.iceTransports;

      var uaConfig = {
        uri: connectionConfig.impu,
        //reliable: SIP.C.supported.SUPPORTED,
        rel100: SIP.C.supported.SUPPORTED,
        wsServers: [connectionConfig.sessionInfo.sipWsUrl],
        authorizationUser: connectionConfig.impi,
        password: connectionConfig.password,
        traceSip: false,
        wsServerMaxReconnection: 1,
        wsServerReconnectionTimeout: 5000,
        connectionRecoveryMinInterval: 5,
        stunServers: stunServers,
        turnServers: turnServers,
        iceTransports: iceTransports,
        userAgentString: getUserAgentString(),
        log: {
          builtinEnabled: true,
          level: 'debug'
        }
      };

      sipManager.userAgent = new SIP.UA(uaConfig);

      this._bindUAEvents(sipManager.userAgent, isFinAudioApp);

      return sipManager.userAgent;
    },

    logout: function() {
      if (sipManager.userAgent) {
        sipManager.userAgent.stop();
      }
    },

    _bindUAEvents: function(userAgent, isFinAudioApp) {
      var that = this;

      userAgent.on('connected', function(arg) {
        sipManager.connected = true;
        console.info('connected', arg);
        triggerStateChangeEvent(sipManager.events.connected, arg);
      });

      userAgent.on('disconnected', function(arg) {
        console.log(sipManager.connected);
        sipManager.connected = false;
        triggerStateChangeEvent(sipManager.events.disconnected, arg);
        console.info('disconnected', arg);
      });


      userAgent.on('registered', function(arg) {
        sipManager.registered = true;
        triggerStateChangeEvent(sipManager.events.registered, arg);
        console.info('registered', arg);
      });


      userAgent.on('unregistered', function(arg) {
        sipManager.registered = false;
        console.info('unregistered', arg);
        triggerStateChangeEvent(sipManager.events.unregistered, arg);
      });


      userAgent.on('registrationFailed', function(e) {
        console.info('registrationFailed', e);
        var errCode = e ? e.status_code || 0 : 0;
        if(errCode !== 401)
          triggerStateChangeEvent(sipManager.events.registration_failed, e);
      });


      userAgent.on('invite', function(session, originalRequest) {
        var call, contact;

        console.info('invite', session);

        sipManager.bindSessionEvents(session);

        call = {
          accept: sipManager.acceptCall.bind(sipManager, session),
          callerName: session.request.from.displayName,
          callerNumber: session.request.from.uri.user,
          sessionId: session.id
        };
        triggerIncomingCallEvent(session, call);
      });


      userAgent.on('message', function(arg) {
        console.info('message', arg);
      });


      userAgent.on('notify', function(arg) {
        triggerNotificationEvent(arg);
        console.info('notify', arg);
      });
    },


    bindSessionEvents: function(session) {

      session.on('progress', function(response) {
        sendSessionEventToLog("events.sip.session.progress", session, {});
        console.info('progress', response);
      });

      session.on('accepted', function(arg) {
        sendSessionEventToLog("events.sip.session.accepted", session, {});
        console.info('accepted\n', arg);
      });

      session.on('rejected', function(arg) {
        sendSessionEventToLog("events.sip.session.rejected", session, {});
        console.info('rejected\n', arg);

        if (session.audioController) {
          session.audioController.dispose();
        }
        session.mute();

        if (arg) {
          triggerCallCancellationEvent({
            code: arg.status_code,
            message: arg.reason_phrase,
            source: arg,
            session: session
          });
        } else {
          triggerCallCancellationEvent({ session: session });
        }
      });

      session.on('failed', function(arg) {
        sendSessionEventToLog('events.sip.session.failed', session, {});
        console.warn('failed\n', arg);
        console.trace();

        session.mute();

        triggerCallFailureEvent({
          source: arg,
          session: session
        });

        if (session.audioController) {
          session.audioController.dispose();
        }
      });

      session.on('connecting', function(arg) {
        sendSessionEventToLog("events.sip.session.connecting", session, {});
        console.info('connecting\n', arg);
      });

      session.on('cancel', function(arg) {
        sendSessionEventToLog("events.sip.session.cancel", session, {});
        console.info('cancel\n', arg);
        if (session.audioController) {
          session.audioController.dispose();
        }
        triggerCallCancellationEvent();
      });

      session.on('refer', function(arg) {
        sendSessionEventToLog("events.sip.session.refer", session, {});
        console.info('refer\n', arg);
      });

      session.on('dtmf', function(arg) {
        sendSessionEventToLog("events.sip.session.dtmf", session, {});
        console.info('dtmf\n', arg);
      });

      session.on('muted', function(arg) {
        sendSessionEventToLog("events.sip.session.muted", session, arg);
        console.info('muted\n', arg);
      });

      session.on('unmuted', function(arg) {
        sendSessionEventToLog("events.sip.session.unmuted", session, arg);
        console.info('unmuted\n', arg);
      });

      session.on('bye', function(arg) {
        sendSessionEventToLog("events.sip.session.bye", session, {});
        console.info('bye\n', arg);
        if (session.audioController) {
          session.audioController.dispose();
        }
      });
    },

    getMediaConstraints: function(constraints) {
      var defaultCons = {
        audio: true,
        video: false
      };

      return _.assign(defaultCons, constraints || {});
    },

    // Destination should be a sip address like: sip:1234@realm.com
    connect: function(destination, constraints, tdmContext) {
      if (!destination) { return; }

      var audioController = new AudioController(ctx);
      var session = sipManager.userAgent.invite(destination, {
        media: {
          constraints: this.getMediaConstraints(constraints || {}),
          GKTConstraints: this._getGKTConstraints(tdmContext),
          render: {
            remote: audioController.getAudioElem()
          }
        }
      });

      // Session is an InviteClientContext and as such has a mute method available
      // Because we may want to make a call but not have our audio transmitted (use case: hoots)
      // Call mute per default; RingdownConnection and ExternalConnection must unmute themselves
     session.mute();
     audioController.setSession(session);
     session.audioController = audioController;

     sipManager.bindSessionEvents(session);
     sipSignaling.initSipSignaling(session, tdmContext);

     return session;
    },

    // Transfer call to sip address
    transfer: function(session, destination) {
        session.refer(destination);
    },

    _getGKTConstraints: function(tdmContext){
      return  { enableSipSignaling: tdmContext && tdmContext.enabled };
    },

    _generatePublicIdentity: function(username, realm) {
      return 'sip:' + username + '@' + realm;
    },

    connectTo: function(username, mediaConstraints, tdmContext) {
      var publicId = this._generatePublicIdentity(username, connectionConfig.realm);
      return this.connect(publicId, mediaConstraints, tdmContext);
    },

    acceptCall: function(session, mediaConstraints, tdmContext) {
        var audioController = new AudioController(ctx, session);
        session.accept({
          media: {
            constraints: this.getMediaConstraints(mediaConstraints),
            GKTConstraints: this._getGKTConstraints(tdmContext),
            render: {
              remote: audioController.getAudioElem()
            }
          }
        });
        session.audioController = audioController;
        sipSignaling.initSipSignaling(session, tdmContext);
    },

    pauseAudio: function(session) {
      if (!session) { return; }

      session.audioController.pause();
    },

    playAudio: function(session) {
      if (!session) { return; }

      session.audioController.play();
    },

    setAudio: function(session, outputDeviceId, inputDeviceId){
      if(session.audioController){
        session.audioController.setAudio(outputDeviceId, inputDeviceId);
      }
    },

    getTDMContext: function(contact){
      return sipSignaling.getTDMContext(contact);
    }

  };

  return sipManager;
}

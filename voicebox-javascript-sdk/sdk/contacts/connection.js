
// Time limit to wait for a connection request. After this time, the connection is
//  terminated and restarted.
var MIN_RECONNECTION_TIMEOUT = 60000;

/**
 * @namespace Connection
 * @description Root namespace, all actions silently fail if no session is active
 * @fires Connection#connection_status_change
 */
var Connection = function Connection(contact, callManager, SIP, tvc, interactionStatus) {
  //Outbound calls events configuation
  this.hash = Math.random();
  this.observers = {};
  this.contact = contact;
  this.SIP = SIP;
  this.muted = false;
  this.interact = interactionStatus || false;

  this.uid = Connection.prototype.getConnectionUidByContactUid(this.contact.uid);

  this._delayBetweenReconnects = 0;
  this._connectingTimeout = MIN_RECONNECTION_TIMEOUT;

  this.callManager = callManager;
  this.tvc = tvc;

  this.fsm = this._createFsm();

  this.update(contact);

  this._bindFSMTransitionLog();

  var audioDeviceProfile = null;

  this.setAudioDeviceProfile = function(newAudioDeviceProfile){
    audioDeviceProfile = newAudioDeviceProfile;
    this.initAudio();
  };

  this.updateAudioDeviceProfile = function(newAudioDeviceProfile){
    if(audioDeviceProfile.getId() === newAudioDeviceProfile.getId()){
      this.setAudioDeviceProfile(newAudioDeviceProfile);
    }
  };

  this.getAudioDeviceProfile = function(){
    return audioDeviceProfile;
  };

  this.getAudioOutputDeviceId = function(){
    return audioDeviceProfile.getOutputDeviceId();
  };

  this.getAudioInputDeviceId = function(){
    return audioDeviceProfile.getInputDeviceId();
  };

  this.initAudio = function(){
    if(this.session) {
      this.SIP.setAudio(this.session, audioDeviceProfile.getOutputDeviceId(), audioDeviceProfile.getInputDeviceId());
    }
  }
};


Connection.prototype = {
  session: undefined,

  audioConstraints: {},

  // {Boolean} Indicates if the output audio is paused.
  paused: false,

  OUTBOUND_NOTIFICABLE_EVENTS: [
    'm_stream_audio_local_added',
    'm_early_media', 'connected',
    'm_stream_audio_remote_added',
    'terminated'
  ],

  _createFsm: function() {
    var fsm = new machina.Fsm(callFsmConfig);
    fsm.setConnection(this);
    return fsm;
  },

  getConnectionUidByContactUid: function(uid){
    return uid.replace(/ /g, '_').replace(/\./g, '_');
  },

  makeSipTdmCall: function (resolve, reject) {
    if (this.session) {
      this.session.sendSipTDMConnectSignal();
      if (resolve) {
        resolve();
      }
      return true;
    } else if (reject) {
      reject();
    }
    return false;
  },

  hangupSipTdmCall: function () {
    if (this.session) {
      this.session.sendSipTDMDisconnectSignal();
    }
  },

  acceptSipTDMCall: function () {
    if (this.session) {
      this.session.acceptSipTDMConnectionRequest();
    }
  },

  /**
   * Makes a call
   * @since version 0.1a
   * @fires m_stream_audio_local_added,m_early_media,connected,m_stream_audio_remote_added,terminated
   * @param {Connection~callListener} [callListener] - Receives the status events from the outbound calls
   * @returns {boolean} true if the call can be stablished.
   */
  makeCall: function (onSuccessCallback, onFailCallback) {
    //If I'm already on a call do nothing
    if(this.type !== GKTConstants.CONTACT_TYPE.sipTDMRingdown){
      if (!this.callManager.isCallInProgress(this.contact)) {
        this._doCall(onSuccessCallback, onFailCallback);
      } else {
        // call could not be started.
        console.info('Already have session for contact');
        console.info(this.contact);

        onFailCallback && onFailCallback();
        return false; // call not started.
      }

      // Canceling the last flag when new connection starts.
      if (this._sessionTerminatedBeforeStart) {
        delete this._sessionTerminatedBeforeStart;
      }
      return true;
    } else {
      return this.makeSipTdmCall(onSuccessCallback, onFailCallback);
    }

  },


  _doCall: function(onSuccessCallback, onFailCallback) {
    if (this.contact.type !== GKTConstants.CONTACT_TYPE.external && !this.contact.last_status) {
      return;
    }

    // TODO: get rid of these callbacks inside the connection
    this.onSuccessCallback = onSuccessCallback;
    this.onFailCallback = onFailCallback;

    this.fsm.handle('invite');
  },

  /**
   * Abstract method.
   * Do nothing by default.
   * Reimplement it with the logic to recall.
   */
  _retryCall: function(onSuccessCallback, onFailCallback) {},

  _getDelayBetweenReconnects: function () {
    return this._delayBetweenReconnects;
  },

  _getConnectingTimeout: function() {
    return this._connectingTimeout;
  },

  _resetReconnectionDelays: function() {
    console.warn(this.contact.display_name + ': Resetting connection delays.');
    this._delayBetweenReconnects = 0;
    this._connectingTimeout = MIN_RECONNECTION_TIMEOUT;
  },

  /**
   * Accepts an incoming all call and sets the call status to 'active'. If called when no inbound call is beign
   * received it will do nothing
   * @since version 0.1a
   * @param {Connection~callListener} [callListener] - Receives the status events from the outbound calls
   */
  acceptCall: function (call) {
    if(this.type !== GKTConstants.CONTACT_TYPE.sipTDMRingdown){
      // TODO: get rid of this call property inside the connection
      this.call = call;
      this.fsm.handle('accept');
    } else {
      this.acceptSipTDMCall();
    }
  },

  /**
   * Rejects an incoming call.
   */
  rejectCall: function () {
    this.hangup();
  },

  receive: function (session) {
    // TODO: get rid of this new session instance inside the connection
    this.newSession = session;

    this.fsm.handle('gotInvite');
  },


  pauseAudio: function () {
    this.paused = true;

    if (this.session) {
      this.SIP.pauseAudio(this.session);
    }
  },

  playAudio: function () {
    this.paused = false;

    if (this.session) {
      this.SIP.playAudio(this.session);
    }
  },

  /**
   * Mutes the call
   * TODO: Clarify why these are exclusive states
   * @since version 0.1a
   * @param {Boolean} [mute] - True or undefined to mute, False to unmute
   */
  mute: function () {
    if (!this.session) {
      return;
    }

    var retVal = this.session.mute();
    this.muted = true;

    return retVal;
  },

  /**
   * Unmutes the call
   * @since version 0.1a
   */
  unmute: function () {
    if (!this.session) {
      return;
    }
    var retVal = this.session.unmute();
    this.muted = false;

    return retVal;
  },

  /**
   * Mutes the call it it is active and unmutes it if it is muted
   * @since version 0.1a
   */
  toggleMute: function () {
    if (!this.session) {
      this.makeCall();
    }
    this.muted ?
      this.unmute() :
      this.mute();

    if(this.session){
      this.session.sendMuteTDMSignal(this.muted);
    }
  },

  /**
   * Hangups the call
   * @since version 0.1a
   * @fires Connection#call_status_change
   */
  hangup: function () {
    if(this.type !== GKTConstants.CONTACT_TYPE.sipTDMRingdown){
      this.fsm.handle('bye');
    } else {
      this.hangupSipTdmCall();
    }

  },

  /**
   * Updates contact with the values provided in the param and fires
   * the corresponding events.
   *
   * @param newContact
   *            Contains updated fields of the contact. Field names are
   *            the same as for the full contact.
   */
  update: function (newContact) {
    this.fsm.handle(newContact.last_status ? 'userWentOnline' : 'userWentOffline');

    if (newContact.last_idle_status !== undefined) {
      if(isNaN(parseInt(newContact.last_idle_status))) {
        newContact.last_idle_status = 0;
      }
      else {
        this.contact.last_idle_status = parseInt(newContact.last_idle_status);
      }
    }

    if (newContact.display_name !== undefined &&
        this.contact.display_name !== newContact.display_name) {
      this.contact.display_name = newContact.display_name;
    }

  },

  isOnline: function() {
    return this.status === GKTConstants.PRESENCE.online;
  },

  setConnectionStatus: function(status, options) {
      //status change will only be triggered
      // if the status is different from te current one
      if (this.status !== status) {
          this.status = status;
          //only online and offline are permmited
          /* istanbul ignore else */
          if (status === GKTConstants.PRESENCE.online) {
              this.contact.last_status = 1;
          } else if ( status === GKTConstants.PRESENCE.offline ){
              this.contact.last_status = 0;
              this.muted = true; // updating the muted state when offline.
          }
          this._trigger('conn_status_change',this.status);
      }
  },

  setCallStatus: function(status) {
      var oldStatus = this.callStatus;
      var disabledStatus = [
        GKTConstants.CALL_STATUS.connecting,
        GKTConstants.CALL_STATUS.disconnected,
        GKTConstants.CALL_STATUS.muted
      ];

      this.callStatus = status;

      if (_.includes(disabledStatus, this.callStatus)) {
        this.muted = true;
      }

      this._trigger('call_status_change', { newStatus: status, oldStatus: oldStatus });
  },

  on: function (event, callback, removeAll) {
    //only if not observer for the event exists
    //of if want to remove all a new array will be
    //created
    /* istanbul ignore else */
    if (this.observers[event] === undefined || removeAll) {
      this.observers[event] = new Set();
    }
    this.observers[event].add(callback);

    return this.off.bind(this, event, callback);
  },
  
  off: function (event, callback) {
      if (this.observers[event] === undefined)
        return;
      this.observers[event].delete(callback);
  },

  _trigger: function (type, event) {
    var callbacks = this.observers[type];

    if (!callbacks)
      return;

    var contactUid = this.uid;
    var thisConnection = this;

    callbacks.forEach(function (callback) {
      if (callback)
        callback(event, contactUid, thisConnection);
    });
  },

    onConnectionStatusChange: function (statusListener, removeAll) {
        return this.on('conn_status_change', statusListener, removeAll);
    },

    offConnectionStatusChange: function (statusListener) {
      return this.off('conn_status_change', statusListener);
    },

    onCallStatusChange: function (statusListener, removeAll) {
        return this.on('call_status_change', statusListener, removeAll);
    },

    onSipTDMStatusChanged: function (statusListener, removeAll) {
      return this.on(GKTConstants.CALL_EVENTS.sipTDMStatusChanged, statusListener, removeAll);
    },

    onIncomingCall: function (statusListener, removeAll) {
        return this.on('incoming_call', statusListener, removeAll);
    },

    //it received the status of the 'parent' connection,
    // no calls can be made and received over sip if the users
    // is not online in TVB. Only support online and offline
    setInteractionStatus: function(status) {
        var initialInteractStatus = this.interact;
        this.interact = status === GKTConstants.PRESENCE.online;
        if(this.interact !== initialInteractStatus) {
          this._trigger('interact_status_change', this.interact);
          this.fsm.handle(this.interact ? 'appWentOnline' : "appWentOffline");
        }
    },

    getStream: function() {
        //it is ignored becuse the default will be return undefined
        /* istanbul ignore else */
        if ( this.session !== undefined ){
            return this.session.getLocalStreams()[0];
        }
    },

    getRemoteStream: function() {
        if (this.session) {
            return this.session.getRemoteStreams()[0];
        }
    },

  /**
   * Sends a SIP DTMF digit.
   * @since version 0.1a
   * @param {Char} [digit] - The digit to send.
   */
  sendDTMF: function(digit) {
        //else option is ignored because only when
        //the user is online the connection can interact
        //with the session
        /* istanbul ignore else */
        if (this.session !== undefined){
            this.session.dtmf(digit);
        }
  },

  /**
   * Moves a connection to the other type (Hoot <-> Ringdown)
   * @param {Object} params for direct connection
   * @returns {Promise} when resolved it returns true
   */
  moveConnection: function (data) {
    var uid = this.uid;
    var autoAnswer;
    var validTypes = [GKTConstants.CONTACT_TYPE.ringdown, GKTConstants.CONTACT_TYPE.hoot, GKTConstants.CONTACT_TYPE.sipTDMRingdown];

    if (validTypes.indexOf(this.type) < 0) {
      return;
    }

    autoAnswer = (this.type === GKTConstants.CONTACT_TYPE.ringdown || this.type === GKTConstants.CONTACT_TYPE.sipTDMRingdown);
    return this.tvc.updateDirectContact(uid, data || {auto_answer: autoAnswer});
  },

  logChat : function(chat) {
    return this.tvc.logWhatsAppChatMessage;
  },

  restart: function() {
    var args = arguments;
    var that = this;

    this.hangup();

    setTimeout(function() {
      that.makeCall.apply(that, args);
    }, 1000);
  },

  _bindFSMTransitionLog: function() {
    var self = this;
    this.fsm.on('transition', function(data) {
      if (this.connection && this.connection.uid !== self.uid) {
        return;
      }

      var message;

      if (data.fromState) {
        message = 'FSM Connection: "' + self.uid + '" - Transition from "' + data.fromState + '" to "' + data.toState + '".';
      } else {
        message = 'FSM Connection: "' + self.uid + '" - Started from "' + data.toState + '" state.';
      }

      GKTLog.sendAppEvent('events.fsm.transition', {
        'message': message
      });
    });
  },

  isSipTDMConnection: function(){
    var res = this.type === GKTConstants.CONTACT_TYPE.sipTDMRingdown;
    if(!res){
      var tdmContext =  this.SIP.getTDMContext(this.contact);
      res = tdmContext && tdmContext.enabled;
    }
    return res;
  },

  sipTDMConnectionNeeded: function () {
    return this.type === GKTConstants.CONTACT_TYPE.sipTDMRingdown && this.sipTDMStatus === GKTConstants.SIP_EVENTS.sipTDMDisconnected;
  },

  sipTDMConnected: function () {
    return this.type === GKTConstants.CONTACT_TYPE.sipTDMRingdown && this.sipTDMStatus !== GKTConstants.SIP_EVENTS.sipTDMDisconnected;
  }
};


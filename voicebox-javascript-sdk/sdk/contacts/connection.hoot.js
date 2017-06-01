// Begin Hoot Connection Classes
var HootConnection = function HootConnection(contact, callManager, SIP, tvc, audioDevices, interactionStatus) {
  var sipTDMContext = SIP.getTDMContext(contact);
  this.type = !sipTDMContext || !sipTDMContext.enabled ? GKTConstants.CONTACT_TYPE.hoot : sipTDMContext.connectionType;
  this.contact = contact;
  this.sipTDMStatus = GKTConstants.SIP_EVENTS.sipTDMDisconnected;
  Connection.call(this, contact, callManager, SIP, tvc, interactionStatus);
  this.setAudioDeviceProfile(audioDevices.getAudioDeviceProfile(this,
    this.type !== GKTConstants.CONTACT_TYPE.sipTDMRingdown ?
      HootConnection.getDefaultAudioDeviceProfileId() :
      RingdownConnection.getDefaultAudioDeviceProfileId()));
  // Note: Call cannot be muted until it's established
  var that = this;
  this.on('interact_status_change', function (interact) {
    //else option is ignored because only when
    //the user is online the hoot can interact
    /* istanbul ignore else */
    if (interact) {
      that.setConnectionStatus(that.status);
    }
  });
  this._maxCallDelay = 300000; // 5 min
  this._counterpartyShouting = false;
  this.addShoutListener(function (msg) {
    that._counterpartyShouting = msg.data.shout;
  });
  this.constructor = HootConnection;
  // Hoots are muted by default
  this.muted = true;
  this.mutedUser = contact.muted_user;
};

HootConnection.getDefaultAudioDeviceProfileId = function(){
  return GKTConstants.AUDIO_DEVICE_PROFILE_IDS.audio2;
};

/**
 * @namespace Connection#HootConnection
 * @description Root namespace.
 */
_.assign(HootConnection.prototype, {

  constructor: HootConnection,

  DEFAULT_CONNECTION_ATTEMPTS_LIMIT: 7,
  DEFAULT_CONNECTION_ATTEMPTS_INTERVAL: 30,

  _createFsm: function () {
    var fsm = new machina.Fsm(hootFsmConfig);
    fsm.setConnection(this);
    return fsm;
  },

  _retryCall: function (onSuccessCallback, onFailCallback) {
    if (!this.contact.last_status)
      return;

    var that = this, delay;

    var inactiveStates = [
      GKTConstants.CALL_STATUS.disconnected,
      GKTConstants.CALL_STATUS.canceled,
      GKTConstants.CALL_STATUS.rejected,
      GKTConstants.CALL_STATUS.connection_paused,
      GKTConstants.CALL_STATUS.connecting
    ];

    if (_.includes(inactiveStates, this.callStatus)) {
      console.warn(this.contact.display_name + ': Retring call to: ' + this.contact.phone_numbers.internal);

      if (this.session) {
        console.warn(this.contact.display_name + ": terminating prev hoot call to start a new one." +
          " Prev one did not get connected in time.");
        this.session.terminate();
        // delete this.session;
      }

      this.setCallStatus(GKTConstants.CALL_STATUS.connection_paused);
      this.connectionPaused = true;

      if (this.contact.last_status) {
        delay = this._getDelayBetweenReconnects();

        setTimeout(
          this.makeCall.bind(this, function () {
            that.session.mute();
            onSuccessCallback && onSuccessCallback();
          }, onFailCallback),
          delay
        );

      } else {
        this._resetReconnectionDelays();
      }

    }
  },

  _initCall: function () {
    this.fsm.handle('userWentOnline');
  },

  /**
   * Redial after 20 seconds (fixed).
   * @returns {number}
   * @private
   */
  _getDelayBetweenReconnects: function () {
    return 20000;
  },

  receive: function (session, call) {
    // TODO: get rid of this call instance inside the connection
    this.newSession = session;
    this.call = call;

    this.fsm.handle('gotInvite');
  },

  /**
   * Emmits a socket event indicating that the user is shouting.
   * @method Connection#HootConnection#shout
   * @param {boolean} shoutOnBool True - is user pressed Shout button, false if unpressed.
   */
  sendShoutStatus: function () {
    // When it's a team hoot, 'shout_change' event is sent, custom 'shout' in other case.
    var msgType = this.isTeamHoot() ? 'shout_change' : 'shout';

    this.tvc.sendMessageToContact(this.uid, msgType, {
      'shout': !this.muted,
      'sip_call_id': this.session.id
    });
  },

  isTeamHoot: function() {
    return this.contact.type === GKTConstants.CONTACT_TYPE.conference;
  },

  /**
   * Notify counterparty and TVC that I am online and maybe their presence understanding is wrong
   * if they think I am offline.
   */
  sendIAmOnline: function () {
    this.tvc.sendMessageToContact(this.uid, "i_am_online", {});
    this.tvc.sendMessageToTVC("tvb_status_update", {
      "new_status": 1
    });
  },

  reloadContacts: function() {
    tvc.getContactManager().requestReloadingContacts();
  },

  isCounterpartyShouting: function () {
    return this._counterpartyShouting;
  },

  isShouting: function () {
    return ( this.callStatus === GKTConstants.CALL_STATUS.active || this.callStatus === GKTConstants.CALL_STATUS.muted ) && !this.muted;
  },

  /**
   * Adds a listener for 'shout' event.
   * Shout event arrives if the counterparty starts or stops shouting.
   * @method Connection#HootConnection#addShoutListener
   * @param cbk Callback that sill execute when the 'shout' socket event fires.
   */
  addShoutListener: function (cbk) {
    return this.on('shout', cbk);
  },

  removeShoutListener: function (cbk) {
    this.off('shout', cbk);
  },

  isRansquawk: function () {
    return this.contact.type === GKTConstants.CONTACT_TYPE.ransquawk;
  },

  restart: function () {
    this.fsm.handle('restart');
  },

  getConnectionAttemptsLimit: function() {
    return GKTConfig.getInteger('tvb.HOOT_CONNECTION_ATTEMPTS_LIMIT', this.DEFAULT_CONNECTION_ATTEMPTS_LIMIT);
  },

  getConnectionAttemptsInterval: function() {
    return GKTConfig.getInteger('tvb.HOOT_CONNECTION_ATTEMPTS_INTERVAL', this.DEFAULT_CONNECTION_ATTEMPTS_INTERVAL);
  }

});

extend(Connection, HootConnection);

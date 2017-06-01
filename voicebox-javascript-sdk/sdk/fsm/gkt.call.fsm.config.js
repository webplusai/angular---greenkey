/**
 * State machine config for ringdowns and external calls
 */
var callFsmConfig = (function () {
  'use strict';

  return {
    namespace: 'call-fsm-config',

    initialState: 'initial',

    initialize: function (options) {
      console.info(this.namespace, 'initialize', options);
    },

    setConnection: function (connection) {
      this.connection = connection;
    },

    /**
     * Check if we can wait for call or make a call
     *
     * @returns {boolean}
     * @private
     */
    _isReady: function () {
      return this.connection ? !!this.connection.contact.last_status && this.connection.interact : false;
    },

    _goToInitial: function () {
      this.connection.setConnectionStatus(GKTConstants.PRESENCE.offline);
      this.transition('initial');
    },

    _makeCall: function () {
      // Terminating existing session.
      // TODO: may be session is already terminated in _hangup()
      if (this.connection.session)
        this.connection.session.terminate();

      var dest = this.connection.contact.phone_numbers.internal;

      console.warn(this.connection.contact.display_name + ': Calling...');

      this.connection.session = this.connection.SIP.connectTo(dest, this.connection.audioConstraints,
        this.connection.SIP.getTDMContext(this.connection.contact));

      this.connection.setCallStatus(GKTConstants.CALL_STATUS.connecting);

      this.connection.session.once(GKTConstants.SIP_EVENTS.accepted, function () {
        this.handle('answered');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.bye, function () {
        this.handle('bye');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.rejected, function () {
        this.handle('bye');
      }.bind(this));

      if (this.connection.onSuccessCallback) {
        this.connection.onSuccessCallback();
      }
    },

    _answerCall: function () {
      if (this.connection.call && this.connection.call.accept) {
        this.connection.call.accept(this.connection.audioConstraints,
          this.connection.SIP.getTDMContext(this.connection.contact));
      } else {
        this.connection.SIP.acceptCall(this.connection.session, this.connection.audioConstraints,
          this.connection.SIP.getTDMContext(this.connection.contact));
      }

      this.connection.session.once(GKTConstants.SIP_EVENTS.accepted, function () {
        this.handle('accepted');
      }.bind(this));
    },

    _hangup: function () {
      if (!this.connection.session)
        return;

      if (this.connection.callStatus === GKTConstants.CALL_STATUS.connecting) {
        this.connection.session.terminate();
        this.connection._sessionTerminatedBeforeStart = true;
      } else {
          try {
            this.connection.session.bye();
          } catch (e) {
            if(this.connection.session){
              this.connection.session.terminate();
            }
          }
      }

      this.connection.session = undefined;
      this.connection.paused = false;
      this.connection.setCallStatus(GKTConstants.CALL_STATUS.disconnected);
    },

    _receiveCall: function () {
      this.connection.session = this.connection.newSession;

      this.connection.session.once(GKTConstants.SIP_EVENTS.bye, function () {
        this.handle('bye');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.canceled, function () {
        this.handle('bye');
      }.bind(this));

      this.connection.setCallStatus(GKTConstants.CALL_STATUS.connecting);

      this.connection._trigger('incoming_call', this.connection.session);
    },

    _checkReadyAndTryToStart: function () {
      if (this._isReady())
        this.transition('waitingForCall');
    },

    eventListeners: {
      transition: [function (data) {
        console.log("SIP state changed, from " + data.fromState + ", to " + data.toState);
      }]
    },

    states: {
      initial: {
        _onEnter: function () {
          this._checkReadyAndTryToStart();
        },

        userWentOnline: function () {
          this.connection.setConnectionStatus(GKTConstants.PRESENCE.online);
          this._checkReadyAndTryToStart();
        },

        appWentOnline: function () {
          this._checkReadyAndTryToStart();
        },

        // TODO: fix the following after release
        // when user dials phone number external contact is created and it's fsm is initialized
        // but the first _onEnter() call in Initial state have undefined in this.connection
        // so state can't be changed to waitingForCall for external contact
        invite: function () {
          if (this.connection.contact.isRingdown() || this.connection.contact.isExternal()) {
            this._makeCall();
            this.transition('waitingForAnswer');
          }
        },

        // TODO: fix the following after release
        // see previous comment
        gotInvite: function () {
          if (this.connection.contact.type === GKTConstants.CONTACT_TYPE.external) {
            this._receiveCall();
            this.transition('waitingForReactionOnIncomingCall');
          }
        }
      },

      waitingForCall: {
        invite: function () {
          this._makeCall();
          this.transition('waitingForAnswer');
        },
        gotInvite: function () {
          this._receiveCall();
          this.transition('waitingForReactionOnIncomingCall');
        },
        userWentOffline: function () {
          this._goToInitial();
        },
        appWentOffline: 'initial'
      },

      waitingForAnswer: {
        answered: 'callInProgress',
        bye: function () {
          this._hangup();
          this.transition('waitingForCall');
        },
        userWentOffline: function () {
          this._hangup();
          this._goToInitial();
        },
        appWentOffline: 'initial'
      },

      waitingForReactionOnIncomingCall: {
        accept: function () {
          this._answerCall();
        },
        accepted: 'callInProgress',
        bye: function () {
          this._hangup();
          this.transition('waitingForCall');
        },
        userWentOffline: function () {
          this._hangup();
          this._goToInitial();
        },
        appWentOffline: 'initial'

      },

      callInProgress: {
        _onEnter: function () {
          this.connection.setCallStatus(GKTConstants.CALL_STATUS.active);

          this.connection.initAudio();

          if (this.connection.muted) {
            this.connection.mute();
          } else {
            this.connection.unmute();
          }
        },

        bye: function () {
          this._hangup();
          this.transition('waitingForCall');
        },
        userWentOffline: function () {
          this._goToInitial();
        },
        appWentOffline: 'initial',

        _onExit: function () {
          this._hangup();
        }
      }
    }
  };
})();
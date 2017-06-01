/**
 * State machine config for hoots
 */
var hootFsmConfig = (function () {
  'use strict';

  // Time limit to wait for a connection request. After this time, the connection is
  // terminated and restarted.
  var MIN_RECONNECTION_TIMEOUT = 60000;

  var DELAY_BETWEEN_RECONNECTS = 20000;

  return {
    namespace: 'hoot-fsm-config',

    initialState: 'initial',

    initialize: function (options) {
      console.info(this.namespace, 'initialize', options);
    },

    setConnection: function (connection) {
      this.connection = connection;
      this.connection._connectionAttempts = 0;
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

    _makeCall: function () {
      // Terminating existing session.
      if (this.connection.session) {
        this.connection.session.terminate();
        this.connection.session = null;
        this.handle('bye');
        return;
      }

      if (this.connection.type === GKTConstants.CONTACT_TYPE.hoot) {
        var hoot = this.connection;

        clearTimeout(hoot._successTimeoutID);
        hoot._successTimeoutID = setTimeout(function () {
          hoot._connectionAttempts = 0;
        }, hoot.getConnectionAttemptsInterval()*1000);
        hoot._connectionAttempts++;
        // TVBWEB-2659: If some hoot call appeared less than 30 seconds 7 times in a row
        // stop redialing and move this hoot to ringdowns
        if (hoot._connectionAttempts > hoot.getConnectionAttemptsLimit()
          && !hoot.isTeamHoot() && !hoot.isRansquawk()) {
          console.warn("Change connection's type from hoot to ringdown because of connect issues", hoot.uid);
          hoot.moveConnection();
          hoot.tvc.sendMessageToTVC("unable_to_dial_hoot_changed_to_ringdown", { 'contact': hoot.contact.uid });
          return;
        }
      }

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
        this.handle('rejected');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.failed, function () {
        this.handle('failed');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.terminated, function () {
        this.handle('terminated');
      }.bind(this));
      this.connection.session.on(GKTConstants.SIP_EVENTS.shoutChange, this._handleShoutChange.bind(this));

      if (this.connection.onSuccessCallback) {
        this.connection.session.mute();
        this.connection.onSuccessCallback();
      }
    },

    _answerCall: function () {
      if (this.connection.call && this.connection.call.accept) {
        this.connection.call.accept(this.connection.audioConstraints,
          this.connection.SIP.getTDMContext(this.connection.contact));
      } else {
        this.connection.SIP.acceptCall(this.connection.session, null,
          this.connection.SIP.getTDMContext(this.connection.contact));
      }

      this.connection.session.once(GKTConstants.SIP_EVENTS.accepted, function () {
        this.handle('accepted');
      }.bind(this));
    },

    _hangup: function () {
      if (!this.connection || !this.connection.session)
        return;

      this.connection._counterpartyShouting = false;

      if (this.connection.callStatus === GKTConstants.CALL_STATUS.connecting) {
        this.connection.session.terminate();

        // Fix for asynch issue: counterpart accepts the connection at the same
        //  time we are hanging up.
        this.connection._sessionTerminatedBeforeStart = true;
      } else {
        try {
          this.connection.session.bye();
        } catch (e) {
          this.connection.session.terminate();
        }
      }
      this.connection.session = null;

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
      this.connection.session.once(GKTConstants.SIP_EVENTS.rejected, function () {
        this.handle('rejected');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.failed, function () {
        this.handle('failed');
      }.bind(this));
      this.connection.session.once(GKTConstants.SIP_EVENTS.terminated, function () {
        this.handle('terminated');
      }.bind(this));
      this.connection.session.on(GKTConstants.SIP_EVENTS.shoutChange, this._handleShoutChange.bind(this));

      this.connection.setCallStatus(GKTConstants.CALL_STATUS.connecting);

      this.connection._trigger('incoming_call', this.connection.session);
    },

    _handleShoutChange: function (evt) {
      if (!evt || !evt.data || !evt.data || evt.data.shout === undefined) {
        return;
      }

      var contactUid = this.connection.contact.uid;
      var msg = {
        type: "shout-change",
        source_contact: contactUid,
        data: {
          speaking_contact_uid: contactUid,
          shout: evt.data.shout
        }
      };
      this.connection._trigger('shout', msg);
    },

    _checkReadyAndTryToStart: function () {
      if (this._isReady()) {
        this.transition(this.connection.contact.direct.role === 'initiator'
            ? 'hootDialing'
            : 'hootWaitingForIncomingCall');
      }
    },

    _goOfflineTransition: function () {
      this.connection.setConnectionStatus(GKTConstants.PRESENCE.offline);
      this.transition('initial');
    },

    _getContactName: function(){
      return this.connection && this.connection.contact ? this.connection.contact.display_name : "";
    },

    _setSipTdmStatus: function(status) {
      var oldState = this.connection.sipTDMStatus;
      this.connection.sipTDMStatus = status;
      this.connection._trigger(GKTConstants.CALL_EVENTS.sipTDMStatusChanged, { oldStatus: oldState, newStatus: status }, this.connection.uid);
    },


    _onSipTDMConnected: function () {
      this.connection.playAudio();
      this.connection.unmute();
      this._setSipTdmStatus(GKTConstants.SIP_EVENTS.sipTDMConnected);
    },

    _onSipTDMDisconnected: function () {
      if (this.connection.type === GKTConstants.CONTACT_TYPE.sipTDMRingdown) {
        this.connection.pauseAudio();
        this.connection.mute();
        this._setSipTdmStatus(GKTConstants.SIP_EVENTS.sipTDMDisconnected);
      }
    },

    _onSipTDMIncomingConnectionRequest: function () {
      this._setSipTdmStatus(GKTConstants.SIP_EVENTS.sipTDMIncomingConnectionRequest);
    },

    _initSipTdm: function () {
      this._onSipTDMDisconnected();
      if (this.connection.session && this.connection.type === GKTConstants.CONTACT_TYPE.sipTDMRingdown) {
        this.connection.session.on(GKTConstants.SIP_EVENTS.sipTDMConnected, this._onSipTDMConnected.bind(this));
        this.connection.session.on(GKTConstants.SIP_EVENTS.sipTDMDisconnected, this._onSipTDMDisconnected.bind(this));
        this.connection.session.on(GKTConstants.SIP_EVENTS.sipTDMIncomingConnectionRequest, this._onSipTDMIncomingConnectionRequest.bind(this));
      }
    },

    eventListeners: {
      "transition": [function (data) {
        console.info((new Date()).toLocaleTimeString() + " " + this._getContactName() + ". HOOT connection state changed, old state: " + data.fromState + ", new state: " + data.toState);
      }],
      "handling": [function (data) {
        console.info((new Date()).toLocaleTimeString()  + " " + this._getContactName() + ". Handling HOOT event, trigger: " + data.inputType);
      }]
    },

    states: {
      initial: {
        _onEnter: function () {
          this._hangup();
          this._checkReadyAndTryToStart();
        },

        gotInvite: function () {
          this._hangup();
        },

        userWentOnline: function () {
          this.connection.setConnectionStatus(GKTConstants.PRESENCE.online);
          this._checkReadyAndTryToStart();
        },

        appWentOnline: function () {
          this._checkReadyAndTryToStart();
        },

        userWentOffline: function () {
          this.connection.setConnectionStatus(GKTConstants.PRESENCE.offline);
        }
      },

      hootDialing: {
        _onEnter: function () {
          this._makeCall();

          this.hootDialingTimer = setTimeout(function () {
            this.handle('callFailed');
          }.bind(this), MIN_RECONNECTION_TIMEOUT);
        },

        _onExit: function () {
          clearTimeout(this.hootDialingTimer);
        },

        answered: 'inProgress',
        bye: 'delayBeforeNextTry',
        rejected: 'delayBeforeNextTry',
        failed: 'delayBeforeNextTry',
        terminated: 'delayBeforeNextTry',
        callFailed: 'delayBeforeNextTry',
        userWentOffline: function () {
          this._goOfflineTransition();
        },
        appWentOffline: 'initial'
      },

      delayBeforeNextTry: {
        _onEnter: function () {
          var self = this;

          clearTimeout(self.connection._successTimeoutID);

          GKTLog.sendAppEvent("presence.warning", {
            message: "Hoot redialing. Possible presence problem. Contact: " + self.connection.contact.display_name
          });
          this.connection.sendIAmOnline();
          this.connection.tvc.getContactManager().requestReloadingContacts();
          if(this.connection.session){
            this.connection.session.terminate();
            this.connection.session = null;
          }
          this.delayBeforeNextTryTimer = setTimeout(function () {
            this.handle('timer');
          }.bind(this), DELAY_BETWEEN_RECONNECTS);
        },

        _onExit: function () {
          clearTimeout(this.delayBeforeNextTryTimer);
        },

        timer: 'hootDialing',
        userWentOffline: function () {
          this._goOfflineTransition();
        },
        appWentOffline: 'initial'
      },

      hootWaitingForIncomingCall: {
        _onEnter: function() {
          this.connection.sendIAmOnline();
          var self = this;

          //If no incoming call in 15 seconds then maybe the presence is broken and we need to reload contacts
          //This solves problem when this users presence is wrong - he will reload it after some time.
          //Also send a PTP message to the counterparty notifying that this user is online and the counterparty
          //should reload its contacts if it thinks differently.
          //This solves problem of bad presence on other side.
          this.connection.waitingTooLongCheckID = setInterval(function () {
            GKTLog.sendAppEvent("presence.warning", {
              message: "Hoot waiting for incoming call too long. " +
              "Possible presence problem. Contact: " + self.connection.contact.display_name
            });
            self.connection.tvc.getContactManager().requestReloadingContacts();
            self.connection.sendIAmOnline();
          }, 15000);
        },
        _onExit: function() {
          clearInterval(this.connection.waitingTooLongCheckID);
        },
        gotInvite: function () {
          this._receiveCall();
          this._answerCall();
        },

        bye: function() {
          this._hangup();
        },
        accepted: 'inProgress',
        userWentOffline: function () {
          this._goOfflineTransition();
        },
        appWentOffline: 'initial'
      },

      inProgress: {
        _onEnter: function () {
          this.connection.setCallStatus(GKTConstants.CALL_STATUS.active);
          this.connection.connectionPaused = false;
          this.connection.session.mute();

          this.connection.initAudio();

          // Allow to pause even when offline.
          if (this.connection.paused) {
            this.connection.pauseAudio();
          }

          this._initSipTdm();
        },

        bye: "initial",
        userWentOffline: function () {
          this._goOfflineTransition();
        },
        appWentOffline: 'initial',
        restart: function () {
          if (this.connection.session) {
            this.connection.session.terminate();
            this.connection.session = null;
          }

          this.transition('initial');
        },

        _onExit: function () {
          this._hangup();
          this.connection._counterpartyShouting = false;
          this._onSipTDMDisconnected();
        }
      }

    }
  }
})();
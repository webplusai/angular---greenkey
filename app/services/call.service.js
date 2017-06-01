(function() {
  'use strict';
  angular.module('gkt.voiceBox.services')
    .service('CallService', [
      '$rootScope',
      '$timeout',
      'commonConstants',
      'Notifications',
      'CallManager',
      function($rootScope, $timeout, constants, Notifications, CallManager) {
        var ACTIVE_TYPES = [
          constants.GKT.CALL_STATUS.active,
          constants.GKT.CALL_STATUS.connecting,
          constants.GKT.CALL_STATUS.muted
        ];

        // {uid => {isActive => Bool, connection => ConnectionInstance}}
        var _registeredConnections = {};
        // active calls and hoots counters
        var _activeCallsQty = 0;
        var _shoutingHootsQty = 0;
        var _shoutedHootsQty = 0;


        function _registerConnection(connection) {
          if (connection instanceof Connection && !_registeredConnections[connection.uid]) {
            _registeredConnections[connection.uid] = {
              isActive: false,
              connection: connection
            };
          }
        }

        function _unregisterConnection(connectionUid) {
          if (connectionUid) {
            _registeredConnections[connectionUid] = null;
          }
        }

        function _isConnectionRegistered(connectionUid) {
          return Boolean(_registeredConnections[connectionUid]);
        }

        function _getConnection(connectionUid) {
          return _isConnectionRegistered(connectionUid) ? _registeredConnections[connectionUid].connection : null;
        }

        function _handleCall(inbound, connection) {
          var connectionUid = connection.uid;
          // handle only ringdowns and external calls
          if (connection.type === constants.GKT.CONTACT_TYPE.hoot || connection.sipTDMConnectionNeeded()) {
            return;
          }

          // external call could be unregistered yet
          if (!_isConnectionRegistered(connectionUid)) {
            _registerConnection(connection);
          }

          if (!_registeredConnections[connectionUid].isActive) {
            _registeredConnections[connectionUid].isActive = true;
            _activeCallsQty++;
            _updateOutboundStreamsCount();
          }
        }

        function _handleHangup(event, connection) {
          var connectionUid = connection.uid;
          // handle only registered calls
          if (connection.type === constants.GKT.CONTACT_TYPE.hoot || !_isConnectionRegistered(connectionUid)) {
            return;
          }

          if (_registeredConnections[connectionUid].isActive) {
            _registeredConnections[connectionUid].isActive = false;
            _activeCallsQty--;
            _updateOutboundStreamsCount();
          }
          // to prevent memory leaks it needs to deregister all external calls when they are over
          if (connection instanceof ExternalConnection) {
            _unregisterConnection(connectionUid);
          }
        }

        function _updateShoutingHoots(value) {
          _shoutingHootsQty += value;
          _updateOutboundStreamsCount();
        }

        function _updateShoutedHoots(value) {
          _shoutedHootsQty += value;
        }

        function _updateOutboundStreamsCount() {
          $rootScope.$emit(constants.UI_EVENTS.outbound_streams_count_updated, _activeCallsQty + _shoutingHootsQty);
        }

        function _makeExternalCall(phoneNumber, contactName) {
          phoneNumber = _formatPhoneNumber(phoneNumber);
          if (phoneNumber === null || _isCallInProgress(phoneNumber)) {
            return;
          }

          var contact = CallManager.createExternalConnection(phoneNumber, contactName);
          _callExternalContact(contact);

          return contact;
        }

        function _formatPhoneNumber(phoneNumber) {
          phoneNumber = phoneNumber.replace(/[-\\(\\)\\.\\\\\\/\s\t]/gm, '');
          return /^\+?(0|[1-9]\d*)$/.test(phoneNumber) ? phoneNumber : null;
        }

        function _isCallInProgress(phoneNumber) {
          var isInProgress = false;

          _.forEach(_registeredConnections, function(call) {
            if (!call || !call.isActive) {
              return;
            }

            var phones = call.connection.contact.phone_numbers;
            if (phones.international === phoneNumber || phones.internal === phoneNumber) {
              isInProgress = true;
              return false;
            }
          });

          return isInProgress;
        }

        function _correctExternalContactPhoneNumbers(contact) {
          var phones = contact.contact.phone_numbers;

          if (!phones.intercluster) {
            phones.intercluster = phones.international;
          }

          if (!phones.internal) {
            phones.internal = phones.international;
          }
        }

        function _callExternalContact(contact) {
          if ( !(contact instanceof ExternalConnection) ) {
            return;
          }

          // to prevent very unpleasant bug when sip service tries to call null@cluster.name
          // we need to correct contact numbers and replace all nulls with correct records
          _correctExternalContactPhoneNumbers(contact);

          contact.makeCall(function () {
              CallManager.triggerOutboundCall(contact);
              contact.unmute();
            }, function () {
              Notifications.createSimpleNotification({
                body: 'Call cannot be established.'
              });
            }
          );
        }

        function _handleConnectionRemove(connection) {
          _unregisterConnection(connection.uid);
        }


        // events that are common for hoots, ringdowns and external calls
        CallManager.addInboundCallListener(_handleCall.bind(this, true));
        CallManager.addOutboundCallListener(_handleCall.bind(this, false));
        CallManager.addOnRemoveConnectionListener(_handleConnectionRemove);

        $rootScope.$on(constants.GKT.CALL_EVENTS.hangup_call, _handleHangup);
        // hoots events
        $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout, _updateShoutedHoots.bind(null, 1));
        $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout_end, _updateShoutedHoots.bind(null, -1));
        $rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout, _updateShoutingHoots.bind(null, 1));
        $rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout_end, _updateShoutingHoots.bind(null, -1));


        return {
          makeRingdownCall: function(ringdownUid, doNotHangup) {
            var callStarted;
            var ringdown = _getConnection(ringdownUid);

            if (!ringdown) {
              return;
            }

            ringdown.caller = 'self';
            if (!_.includes(ACTIVE_TYPES, ringdown.callStatus)
              || ringdown.sipTDMConnectionNeeded()) {
              callStarted = ringdown.makeCall(function(){
                ringdown.unmute();
              });
              // This is supposing the call is going to execute (which not always happen).
              if (callStarted) {
                CallManager.triggerOutboundCall(ringdown);
                ringdown.inCall = true;
              }
            } else if (!doNotHangup) {
              ringdown.hangup();
              ringdown.inCall = false;
            }
          },

          makeExternalCall: _makeExternalCall,

          callExternalContact: _callExternalContact,

          isCorrectNumber: function(phoneNumber) {
            return _formatPhoneNumber(phoneNumber) !== null;
          },

          getConnection: _getConnection,

          registerConnection: _registerConnection,

          unregisterConnection: _unregisterConnection,

          isCallInProgress: _isCallInProgress,

          isAnyActiveLines: function() {
            return (_activeCallsQty + _shoutedHootsQty + _shoutingHootsQty) > 0;
          },

          outboundStreamExists: function() {
            return (_activeCallsQty + _shoutingHootsQty) > 0;
          },

          getActiveCallsQty: function() {
            return _activeCallsQty;
          }
        };
      }]);
})();
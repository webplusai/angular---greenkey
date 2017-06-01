(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .factory('MissedEventsService', ['$rootScope', 'commonConstants', 'tvbUIState', 'CallManager',
      function($rootScope, constants, tvbUIState, CallManager) {
          var missedEvents = [];

          function addMissedEvent(connData, shoutEvent, ringdownEvent){
              missedEvents.push({
                user: connData.contact.display_name,
                connection: connData,
                shoutEvent: shoutEvent,
                ringdownEvent: ringdownEvent,
                time: new Date()
              });
              $rootScope.$emit('missed_events_changed');
          }

          function _removeEvent(index) {
              missedEvents.splice(index, 1);
              $rootScope.$emit('missed_events_changed');
          }

          function logShout(event, hootConnection) {
              if (!tvbUIState.idle) { return; }
              addMissedEvent(hootConnection, true, false);
          }

          function logIncomingRingdown(data) {
            if (!tvbUIState.idle || data.type === constants.GKT.CONTACT_TYPE.hoot || data.sipTDMConnectionNeeded()) {
              return;
            }
            addMissedEvent(data, false, true);
          }

          $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout, logShout);
          CallManager.addInboundCallListener(logIncomingRingdown);

          return{
              getMissedEvents: function(){ return missedEvents; },
              removeEvent: _removeEvent
          };
      }]);
})();

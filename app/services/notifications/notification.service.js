(function() {
  'use strict';

  angular.module('gkt.voiceBox.notifications').service('Notifications',
    ['$rootScope', 'NotificationsFactory', 'commonConstants', 'OpenFin',
      'HootNotificationHelper', '$timeout', 'CallManager', 'OpenfinMessage',
      NotificationService]);


  function NotificationService($rootScope, NotificationsFactory, constants,
                               OpenFin, HootNotificationHelper, $timeout,
                               CallManager, OpenfinMessage) {
    var notifications = {};
    var openingInProgressIds = [];
    var updateQueue = {};

    function _init() {
      _subscribeHoots();
      _subscribeActiveCalls();
    }

    function _update(uid, property, value) {
      var notification = notifications[uid];
      if(!notifications[uid] || !_.isFunction(notification.sendMessage)) {

        if(openingInProgressIds.indexOf(uid) > -1) {
          if(!updateQueue[uid])
            updateQueue[uid] = [];

          updateQueue[uid].push({
            property: property,
            value: value
          })
        }
        return;
      }

      notification.sendMessage(
        OpenfinMessage
          .create(OpenfinMessage.ACTIONS.TO_FIN.update, uid)
          .withProperty(property, value));
    }

    function _releaseUpdateQueue(uid) {
      if(updateQueue[uid]) {
        _.each(updateQueue[uid], function (updateData) {
          _update(uid, updateData.property, updateData.value);
        });
        delete updateQueue[uid];
      }
    }

    function _createConnectionNotification(connection, options) {
      var uid = connection.uid;
      openingInProgressIds.push(uid);

      var creatingPromise = NotificationsFactory.createConnectionNotification(
        connection, options, function () {
          delete notifications[uid];
        });

      creatingPromise.then(function (notification) {

        notifications[uid] = notification;

        _releaseUpdateQueue(uid);

        var index = openingInProgressIds.indexOf(uid);
        if(index > -1) {
          openingInProgressIds.splice(index, 1);
        }

      }).catch(function () {
        console.warn("Could not create notification");
      });
    }

    function _closeNotificationSafe(uid) {
      var notification = notifications[uid];
      if(!notification) return;

      if(_.isFunction(notification.close)) {
        // TODO: discuss with OpenFin team an unavailability of closing notification this way
        // see TVBWEB-2888
        notification.close();
      }
    }

    function _subscribeActiveCalls() {

      // subscribe on incoming call
      CallManager.addInboundCallListener(function(call) {
        if(call.type === constants.GKT.CONTACT_TYPE.hoot || call.sipTDMConnectionNeeded() ||
          notifications[call.uid]) return;

        var options = {
          uid: call.uid,
          body: 'Incoming Call from: "' + call.contact.display_name + '"',
          displayName: call.contact.display_name,
          ringing: true,
          muted: false,
          selected: false,
          poppedOut: false
        };

        _createConnectionNotification(call, options);
      });

      // subscribe on hangup
      $rootScope.$on(constants.GKT.CALL_EVENTS.hangup_call, function(event, call) {
        _closeNotificationSafe(call.uid);
      });

    }

    function _subscribeHoots() {

      $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout, function(event, hoot, shoutMsg) {
        // no need to show notification if it exists already
        // when there's active torn out window for this hoot
        if(OpenFin.hasHoot(hoot.uid) || notifications[hoot.uid]) {
          return;
        }

        CallManager.getHootConnections().then(function(hoots) {
          var shoutNames = HootNotificationHelper.resolveIncomingShoutName(shoutMsg, hoots);
          var options = {
            uid: hoot.uid,
            isOnline: true,
            shouting: !hoot.muted,
            inboundShout: true,
            contactName: shoutNames.shoutName,
            name: shoutNames.displayName,
            silenced: hoot.paused,
            body: shoutNames.displayName + ' is shouting !'
          };

          _createConnectionNotification(hoot, options);
        });
      });

      $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout_end, function(event, hoot) {
        _closeNotificationSafe(hoot.uid);
      });
    }

    return {
      init: _init,
      update: _update,
      createSimpleNotification: NotificationsFactory.createSimpleNotification,
      closeConnectionNotification: _closeNotificationSafe
    };
  }
})();

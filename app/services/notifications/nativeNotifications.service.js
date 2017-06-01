(function() {
  'use strict';

  angular.module('gkt.voiceBox.notifications')
    .factory('NativeNotifications', ['QueueFactory', '$q', NotificationsService]);

  function NotificationsService(Queue, $q) {

    var NotificationQueue = Queue.create({
      worker: function(item) {
        item.close();
      },
      interval: 5000
    });

    function _ensurePermissionsGranted() {
      var deferred = $q.defer();
      if (Notification.permission === 'granted') {
        deferred.resolve();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function(permission) {
          permission === 'granted' ?
            deferred.resolve() :
            deferred.reject();
        });
      } else
        deferred.reject();

      return deferred.promise;
    }

    // TODO temporary
    function _getStub() {
      return {
        close: function() {
        },
        sendMessage: function() {
        },
        test: 1
      };
    }

    function _showNotification(options, onClose) {
      if (!('Notification' in window)) {
        return;
      }

      _ensurePermissionsGranted().then(function() {
        var notification = new Notification(options.title, options);
        _.isFunction(onClose) && notification.addEventListener('close', onClose);
        NotificationQueue.push(notification);
      });

      // TODO temporary, use promises
      return _getStub();
    }

    return {
      show: _showNotification
    };
  }
})();

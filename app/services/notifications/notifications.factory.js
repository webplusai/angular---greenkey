(function() {
  'use strict';

  angular.module('gkt.voiceBox.notifications')
    .service('NotificationsFactory',
      ['$q', 'NativeNotifications', 'OpenFinNotifications', 'OpenFin', 'commonConstants', NotificationsFactory]);

  function NotificationsFactory($q, NativeNotifications, OpenFinNotifications, OpenFin, constants) {

    var DEFAULT_OPTIONS = {
      title: 'Green Key Notification',
      body: '',
      icon: 'images/jira-logo-scaled.png'
    };

    return {
      createSimpleNotification: function(options, onClose) {
        _.defaults(options, DEFAULT_OPTIONS);
        return NativeNotifications.show(options, onClose);
      },

      /**
       *
       * @param connection
       * @param options
       * @param onClose
       * @returns {Promise}
       */
      createConnectionNotification: function(connection, options, onClose) {

        var deferred = $q.defer();

        _.defaults(options, DEFAULT_OPTIONS);
        if(!OpenFin.exists()) {
          deferred.resolve(NativeNotifications.show(options, onClose));
          return deferred.promise;
        }

        if (connection.type === constants.GKT.CONTACT_TYPE.hoot) {
          var finWindow =  OpenFinNotifications.showHoot(connection, options,
            onClose, function() {
              // on open
              deferred.resolve(finWindow)
            });
          return deferred.promise;
        }

        if (connection.type === constants.GKT.CONTACT_TYPE.ringdown ||
          connection.type === constants.GKT.CONTACT_TYPE.external ||
          connection.sipTDMConnected()) {
          var finWindow = OpenFinNotifications.showRingdown(connection, options,
            onClose, function () {
              // on open
              deferred.resolve(finWindow)
            });
          return deferred.promise;
        }

        deferred.reject();
        return deferred.promise;
      }
    };

  }
})();
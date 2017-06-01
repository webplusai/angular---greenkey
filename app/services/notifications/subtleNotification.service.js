(function() {
  'use strict';

  angular.module('gkt.voiceBox.notifications')

  .factory('SubtleNotificationService', function(notify) {

    notify.config({
      duration: 3000,
      position: 'right',
      maximumOpen: 4,
      templateUrl: '/partials/notification/customMsg.html'
    });

    return {
      notify: function(msg) {
        return notify(msg);
      }
    };
  });

})();

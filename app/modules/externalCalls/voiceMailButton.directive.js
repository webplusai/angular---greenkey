(function() {
  'use strict';

  angular.module('gkt.voiceBox.activeCalls')
    .directive('voiceMailButton', function() {
      return {
        restrict: 'E',
        scope: {},
        controller: [
          '$scope',
          'CallService',
          'Notifications',
          'CallManager',
          voiceMailButtonController
        ],
        templateUrl: '/partials/ringdowns/voiceMailButton.html',
        replace: true
      };
    });

  function voiceMailButtonController($scope, CallService, Notifications, CallManager) {

    $scope.voiceMessagesCount = 0;

    SipManager.addNotificationListener(function(notification) {
      if (notification.hasOwnProperty('Voice-Message')) {
        var voiceMessagesCount = parseInt(notification['Voice-Message']);
        if (!isNaN(voiceMessagesCount)) {
          $scope.voiceMessagesCount = voiceMessagesCount;
          $scope.$apply();
        }
      }
    });


    $scope.dialVoiceMail = function() {
      CallManager.getExternalConnectionByDisplayName('Voicemail')
        .then(function(connection) {
          CallService.callExternalContact(connection);
        })
        .catch(function() {
          Notifications.createSimpleNotification({
            body: 'Call cannot be established.'
          });
        });
    };

  }

})();

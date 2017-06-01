(function() {
  'use strict';
  angular.module("openFinIntegration")

    .directive('hootOnPanel', function() {
      return {
        restrict: 'E',
        scope: {
          hoot: '='
        },
        replace: true,
        controller: ['$scope', 'commonConstants', 'MessageService',
          hootInTornPanelCtrl],
        templateUrl: '/openfin/modules/hoot/tornHoot.tpl.html'
      };
    });

  function hootInTornPanelCtrl($scope, constants, MessageService) {

    $scope.initialized = true;
    $scope.inPanel = true;

    function sendActionToApplication(signal) {
      MessageService.sendSignalAction($scope.hoot.uid, signal);
    }

    $scope.handleShoutPressed = sendActionToApplication.bind(
      this, constants.UI_EVENTS.openfin_push_shout_button);
    $scope.handleShoutDepressed = sendActionToApplication.bind(
      this, constants.UI_EVENTS.openfin_release_shout_button);
  }
})();
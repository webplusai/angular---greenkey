(function () {
    'use strict';

    angular.module('gkt.voiceBox.common').directive('statusSwitcher', function () {
      return {
        restrict: 'E',
        scope: {},
        controller: [
          '$scope',
          'tvbUIState',
          'UserAwayTrackingService',
          statusSwitcherController
        ],
        templateUrl: '/partials/common/statusSwitcher.html'
      };
    });

    function statusSwitcherController($scope, tvbUIState, UserAwayTrackingService) {
      // don't delete, it is used in template
      $scope.uiState = tvbUIState;

      $scope.toggleIdle = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        UserAwayTrackingService.toggleStatus();
      };
    }
})();

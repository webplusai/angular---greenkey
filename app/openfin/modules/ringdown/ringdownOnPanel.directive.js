(function() {
  'use strict';
  angular.module("openFinIntegration")

    .directive('ringdownOnPanel', function() {
      return {
        restrict: 'E',
        scope: {
          ringdown: '='
        },
        replace: true,
        controller: ['$scope', 'MessageService', ringdownOnPanelCtrl],
        templateUrl: '/openfin/modules/ringdown/tornRingdown.partial.html'
      };
    });

  function ringdownOnPanelCtrl($scope, MessageService) {

    $scope.initialized = true;
    $scope.inPanel = true;

    $scope.call = function() {
      MessageService.sendSignalAction($scope.ringdown.uid, 'call');
    }
  }
})();
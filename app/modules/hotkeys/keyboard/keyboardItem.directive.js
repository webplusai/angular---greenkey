(function () {
  'use strict';

  angular.module('gkt.voiceBox.hotkeys')
    .directive('keyboardItem', function () {
      return {
        restrict: 'E',
        controller: itemController,
        scope: {
          item: '=',
          onSelect: '=',
          onUnsetKey: '='
        },
        templateUrl: '/partials/hotkeys/keyboard/keyboardItem.html'
      };
    });

  function itemController($scope, commonConstants) {

    $scope.isBlast = $scope.item.hoot.type === commonConstants.GKT.CONTACT_TYPE.blastGroup;
    $scope.online = false;

    function _handleConnectionStatus(newValue) {
      $scope.online = newValue === commonConstants.GKT.PRESENCE.online;
      $scope.$apply();
    }

    // this is for hoots only
    if (!$scope.isBlast) {
      $scope.online = $scope.item.hoot.status === commonConstants.GKT.PRESENCE.online;
      $scope.item.hoot.onConnectionStatusChange(_handleConnectionStatus);

      $scope.$on('$destroy', function() {
        $scope.item.hoot.offConnectionStatusChange(_handleConnectionStatus);
      });
    }

  }
})();

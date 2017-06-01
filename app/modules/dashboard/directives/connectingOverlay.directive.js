(function() {
  'use strict';

  angular.module('gkt.voiceBox.dashboard')
    .directive('connectingOverlay', function() {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        templateUrl: '/partials/connectingOverlay.html',
        controller: ['$scope', '$timeout', '$sessionStorage', 'commonConstants', connectingOverlayController]
      };
    });

  function connectingOverlayController($scope, $timeout, $sessionStorage, constants) {

    $scope.connected = false;
    $scope.connecting = true;
    $scope.preloading = true;
    $scope.reconnect = GlobalAppConnectionManager.connect;

    // show just spinner first, and other info in 15 seconds
    $timeout(function() {
      $scope.preloading = false;
    }, 15000);
    
    initListener();

    function initListener() {
      GlobalAppConnectionManager.addStateListener(function(oldState, newState) {
        isEnabled() && $timeout(function() {
          $scope.connected = newState === GlobalAppConnectionManager.STATES.connected;
          $scope.connecting = !$scope.connected &&
            newState !== GlobalAppConnectionManager.STATES.disconnected;
        });
      });
    }

    function isEnabled() {
      return !$sessionStorage[constants.APP.disable_overlay_flag];
    }
  }
})();

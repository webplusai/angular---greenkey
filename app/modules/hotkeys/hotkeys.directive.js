(function () {
  'use strict';

  angular.module('gkt.voiceBox.hotkeys')
    .directive('hotkeysConfigPanel', function () {
      return {
        restrict: 'E',
        controller: hotkeysController,
        templateUrl: '/partials/hotkeys/hotkeys.html',
      };
    });

  function hotkeysController($scope, HotkeysService) {
    $scope.goToMidiConfig = function() {
      HotkeysService.openMidiConfigDialog();
      $scope.closeThisDialog();
    };

    $scope.goToKeyboardConfig = function() {
      HotkeysService.openKeyboardConfigDialog();
      $scope.closeThisDialog();
    };
  }

})();

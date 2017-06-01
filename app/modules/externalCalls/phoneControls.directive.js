(function() {
  'use strict';

  angular.module('gkt.voiceBox.activeCalls')
    .directive('phoneControls', function() {
      return {
        restrict: 'E',
        scope: {},
        controller: phoneControlsController,
        templateUrl: '/partials/ringdowns/phoneControls.html',
        replace: true
      };
    });

  function phoneControlsController($scope, $rootScope, Notifications, CallService) {

    $scope.inputNumber = '';
    $scope.isNumpadShown = false;

    var resetDialer = function() {
      $scope.inputNumber = '';
    };
    $rootScope.$on('dialer:reset', resetDialer);

    $scope.onInputKeyPress = function(event) {
      if (event.which === 13) {
        $scope.dial();
        event.preventDefault();
      }
    };

    $scope.dial = function() {
      if(CallService.isCorrectNumber($scope.inputNumber)) {
        CallService.makeExternalCall($scope.inputNumber);
        resetDialer();
      }
    };

    $scope.isCorrectNumber = function() {
      return CallService.isCorrectNumber($scope.inputNumber);
    };

    $scope.toggleNumpad = function() {
      $scope.isNumpadShown = !$scope.isNumpadShown;
    };

    // Controller's sharable methods
    this.handleInputFromDialPad = function(button) {
      $scope.inputNumber += button;
    };

    this.handleBackspaceFromDialPad = function() {
      $scope.inputNumber = $scope.inputNumber.slice(0, -1);
    };

    this.closeNumpad = function() {
      $scope.isNumpadShown = false;
    };



  }

})();

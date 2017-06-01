(function() {
  'use strict';

  angular.module('gkt.voiceBox.activeCalls').directive('dialerNumpad', function() {
    return {
      restrict: "E",
      replace: true,
      scope: {},
      require: '^^phoneControls',
      link: function(scope, element, attrs, parentController) {
        scope.phoneCtrl = parentController;
      },
      controller: ['$scope', '$rootScope', 'commonConstants', dialerNumpadController],
      templateUrl: '/partials/dialerNumpad.html'
    };
  });

  function dialerNumpadController($scope, $rootScope, constants) {

    var selectedCalls = {};

    $scope.toneMode = false;

    function updateMode() {
      $scope.toneMode = $scope.isToneModeAllowed();
    }

    $scope.isToneModeAllowed = function() {
     return _.values(selectedCalls).length === 1;
    };

    $scope.numpadButtonClick = function(value) {
      if(!$scope.toneMode) {
        $scope.phoneCtrl.handleInputFromDialPad(value);
        return;
      }

      // not supported by dtmf tones
      if(value === '+')
        return;

      var call = _.values(selectedCalls)[0];
      call.sendDTMF(value);
    };

    $scope.setToneMode = function(value) {
      $scope.toneMode = value && $scope.isToneModeAllowed();
    };

    $scope.close = function() {
      $scope.phoneCtrl.closeNumpad();
    };

    $scope.backspaceClicked = function() {
      if(!$scope.toneMode)
        $scope.phoneCtrl.handleBackspaceFromDialPad();
    };

    $rootScope.$on(constants.UI_EVENTS.active_call_selected, function(event, call) {
      selectedCalls[call.uid] = call;
      updateMode();
    });

    $rootScope.$on(constants.UI_EVENTS.active_call_unselected, function(event, call) {
      selectedCalls = _.omit(selectedCalls, call.uid);
      updateMode();
    });

  }


})();

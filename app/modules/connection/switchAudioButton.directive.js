(function() {
  'use strict';

  var app = angular.module('gkt.voiceBox.connection');

  app.directive('switchAudioButton', function() {
    return {
      restrict: 'E',
      scope: {
        connection: '='
      },
      templateUrl: '/partials/connection/switchAudioButton.html',
      controller: ['$scope', '$attrs', 'OpenFin', 'AudioDevices', function($scope, $attrs, OpenFin, AudioDevices) {
        $scope.switchAudioLabel = null;
        $scope.isHootAudioSet = null;
        $scope.toolTipPlacement = $attrs.toolTipPlacement;
        $scope.toolTipPlacement = $scope.toolTipPlacement ? $scope.toolTipPlacement : 'bottom';
        $scope.buttonStyle = $attrs.buttonStyle;
        $scope.buttonStyle = $scope.buttonStyle ?  $scope.buttonStyle : 'volume';
        $scope.isOpenFin = OpenFin.exists();

        $scope.isHootAudioSet = function(){
          return AudioDevices.isHootAudioDeviceProfileSet($scope.connection);
        };

        $scope.getLabel = function() {
          return $scope.isHootAudioSet() ? "Set ringdown device" : "Set hoot device";
        };

        $scope.switchAudio = function(){
          AudioDevices.switchAudioDeviceProfile($scope.connection);
        };
      }],
      replace: true
    };
  });

})();
(function () {
  'use strict';

  angular.module('gkt.voiceBox.eventsLog')
    .directive('autoFocus', function ($timeout) {
      return {
        restrict: 'A',
        scope: { 
          addMode: '=addMode' 
        },
        link: function($scope, element) {
          $scope.$watch('addMode', function() {
            if($scope.addMode) {
              $timeout(function() {
                element[0].focus();
              }, 100);
            }
          });
        }
      };
    });
})();
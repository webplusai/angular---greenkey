(function () {
  'use strict';

  angular.module('gkt.voiceBox.eventsLog')
    .directive('elastic', function ($timeout) {
      return {
        restrict: 'A',
        link: function($scope, element) {
            $scope.initialHeight = $scope.initialHeight || element[0].style.height;
            var resize = function() {
                element[0].style.height = $scope.initialHeight;
                element[0].style.height = element[0].scrollHeight + "px";
            };

            angular.element(element[0]).bind('keyup', resize);
            $timeout(resize, 0);
        }
      };
    });
})();
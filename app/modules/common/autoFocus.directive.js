(function () {
  'use strict';

  angular.module('gkt.voiceBox.common')
    .directive('autoFocus', ['$timeout', function ($timeout) {
      return {
        restrict: 'A',
        link : function($scope, $element) {
          $timeout(function() {
            //auto-focus element
            $element[0].focus();
          });
        }
      };
    }]);
})();

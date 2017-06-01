(function() {
  'use strict';
  angular.module("openFinIntegration").directive('preloader', function() {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        controller: Function(),
        templateUrl: '/openfin/modules/preloader/preloader.tpl.html'
      };
    });
})();
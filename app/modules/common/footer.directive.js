(function () {
  'use strict';

  angular.module('gkt.voiceBox.common')

  .directive('gktFooter', function() {
    return {
      restrict: 'E',
      templateUrl: '/partials/footer.html'
    };
  });

})();

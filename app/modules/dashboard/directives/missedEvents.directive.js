(function() {
  'use strict';

  angular.module('gkt.voiceBox.dashboard')

  .directive('missedEvents', function() {
    return {
      restrict: 'E',
      scope: {
        compactMode: '@'
      },
      replace: true,
      templateUrl: '/partials/missed-events.html',
      controller: ['$scope', '$rootScope', 'commonConstants', 'MissedEventsService',
        function($scope, $rootScope, constants, MissedEvents) {

        $scope.getEvents = MissedEvents.getMissedEvents;
        $scope.updateTimeAgo = 0;
        var intervalId;

        $scope.removeEvent = MissedEvents.removeEvent;

        var init = function() {
          // Periodically updating the time ago values.
          intervalId = setInterval(function() {
            $scope.updateTimeAgo++;
          }, 5000);
        };

        $scope.$on('$destroy', clearInterval.bind(this, intervalId));

        init();
      }]
    };
  });

})();

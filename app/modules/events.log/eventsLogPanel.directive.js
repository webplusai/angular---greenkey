(function () {
  'use strict';

  angular.module('gkt.voiceBox.eventsLog')
    .directive('eventsLogPanel', function () {
      return {
        restrict: 'A',
        scope: {},
        replace: true,
        controllerAs: 'eventsLogCtrl',
        controller: ['$scope', 'EventsLog', eventsLogController],
        templateUrl: '/partials/eventsLog/eventsLogPanel.html'
      };
    });

  function eventsLogController($scope, EventsLog) {
    $scope.records = EventsLog.getEvents();
    $scope.isLoading = false;

    $scope.sortings = [
      {
        title: 'Time: Newest First',
        column: 'time',
        desc: true
      },
      {
        title: 'Time: Newest Last',
        column: 'time',
        desc: false
      },
      {
        title: 'Type: Asc',
        column: 'typeOrder',
        desc: false
      },
      {
        title: 'Type: Desc',
        column: 'typeOrder',
        desc: true
      },
      {
        title: 'Contact: A-Z',
        column: 'contact',
        desc: false
      },
      {
        title: 'Contact: Z-A',
        column: 'contact',
        desc: true
      }
    ];
    $scope.selectedSorting = $scope.sortings[0];

    $scope.sortBy = function(column) {
      $scope.selectedSorting = _.find($scope.sortings, function(item){
        return item.column === column && item.desc !== $scope.selectedSorting.desc;
      });
    };

    $scope.hasMorePages = EventsLog.hasMorePages;

    $scope.loadMore = function() {
      if ($scope.isLoading) { return; }

      $scope.isLoading = true;

      EventsLog.loadNextPage()
        .then(function() {
          $scope.records = EventsLog.getEvents();
          $scope.isLoading = false;
        });
    };

  }

})();

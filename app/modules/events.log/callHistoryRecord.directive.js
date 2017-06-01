(function () {
  'use strict';

  angular.module('gkt.voiceBox.eventsLog')
    .directive('callHistoryRecord', function () {
      return {
        restrict: 'A',
        scope: {
          record: '='
        },
        replace: false,
        link: function (scope, element) {
          element.find(".edit-icon").on("click", function (e) {
            $(this).siblings('.note-text').focus();
            e.preventDefault();
          });
        },
        controllerAs: 'recordCtrl',
        controller: ['$scope', '$filter', 'commonConstants', 'tvbUIState', 'EventsLog', callHistoryRecordController],
        templateUrl: '/partials/eventsLog/callHistoryRecord.html'
      };
    });

  function callHistoryRecordController($scope, $filter, constants, tvbUIState, EventsLog) {
    if (!$scope.record)
      return;

    $scope.uiState = tvbUIState;

    $scope.startTime = $filter('date')($scope.record.time, 'short');
    $scope.constants = constants;

    $scope.addMode = false;
    this.addNote = function() {
      $scope.addMode = !$scope.addMode;
    };

    $scope.makeCallBack = function() {
      $scope.record.makeCallBack();
    };

    $scope.saveNote = function() {
      EventsLog.updateEventNote($scope.record);
    };

  }

})();

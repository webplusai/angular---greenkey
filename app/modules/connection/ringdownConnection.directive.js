(function() {
  'use strict';

  var app = angular.module('gkt.voiceBox.connection');

  app.directive('ringdownConnection', function() {
    return {
      restrict: 'E',
      scope: {
        connection: '=',
        compact: '=',
        columns: '=',
        draggingData: '='
      },
      templateUrl: '/partials/connection/ringdown-connection.html',
      controller: ['$scope', 'commonConstants', 'tvbUIState', function($scope, constants, tvbUIState) {
        $scope.connectionTypes = constants.GKT.CONTACT_TYPE;
        $scope.uiState = tvbUIState;
      }],
      replace: true
    };
  });

})();
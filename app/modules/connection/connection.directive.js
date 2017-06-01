(function() {
  'use strict';

  var app = angular.module('gkt.voiceBox.connection');

  app.directive('connection', function() {
    return {
      restrict: 'E',
      scope: {
        connection: '=',
        compact: '=',
        columns: '=',
        draggingData: '='
      },
      templateUrl: '/partials/connection/connection.html',
      controller: ['$scope', 'commonConstants', function($scope, constants) {
        $scope.contactTypes = constants.GKT.CONTACT_TYPE;
      }],
      replace: true
    };
  });

})();
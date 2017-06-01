(function () {
  'use strict';

  angular.module('openFinIntegration')
    .directive('tabsPanel', ['PaginatorFactory', function (PaginatorFactory) {

      function TornPaginator($scope, $rootScope) {
        PaginatorFactory.call(this, $scope, $rootScope);

        $scope.uiState = {
          compactMode: false
        };
      }

      TornPaginator.prototype = Object.create(PaginatorFactory.prototype);
      TornPaginator.prototype.constructor = TornPaginator;

      TornPaginator.prototype.checkItemForBlinking = function (connection) {
        if (connection.inboundShout)
          this.updateInboundCallsQty(connection, true);

        if (connection.shouting)
          this.updateOutboundCallsQty(connection, true);
      };

      TornPaginator.prototype.customInit = function () {
      };

      return {
        restrict: 'AE',
        scope: {
          size: '@',
          initEventName: '@',
          changeEventName: '@',
          tabName: '@',
          fixedCount: '@'
        },
        templateUrl: '/openfin/modules/panel/tabPanel.html',
        controller: [
          '$scope',
          '$rootScope',
          TornPaginator
        ]
      };
    }]);
})();

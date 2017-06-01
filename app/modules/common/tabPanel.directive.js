(function() {
  'use strict';

  angular.module('gkt.voiceBox.common')
    .directive('tabsPanel', ['PaginatorFactory', function(PaginatorFactory) {

      function MainPaginator($scope, $rootScope, $q, tvbUIState) {
        PaginatorFactory.call(this, $scope, $rootScope);

        this.$q = $q;
        $scope.uiState = tvbUIState;
      }

      MainPaginator.prototype = Object.create(PaginatorFactory.prototype);
      MainPaginator.prototype.constructor = MainPaginator;

      MainPaginator.prototype.checkItemForBlinking = function (connection) {
        if(!connection.contact.isHoot())
          return;

        if (connection.isCounterpartyShouting())
          this.updateInboundCallsQty(connection, true);

        if (connection.isShouting())
          this.updateOutboundCallsQty(connection, true);
      };

      MainPaginator.prototype.customInit = function () {
        var self = this;
        self.$scope.onDropToPage = function (event, ui) {
          return self.$q(function (resolve, reject) {
            var itemIndex = ui.helper.data('dragdrop-index');
            var pageIndex = $(event.target).data('drop-page');

            if (self.$scope.active !== pageIndex) {
              self.$rootScope.$emit(self.$scope.tabName + ':move_to_page',
                self.$scope.active, pageIndex, itemIndex);
            }
            // todo: investigate why reject is needed
            return reject();
          });
        };
      };
      
      return {
        restrict: 'AE',
        scope: {
          size: '@',
          initEventName: '@',
          changeEventName: '@',
          tabName: '@',
          dragAndDropScope: '@',
          fixedCount: '@'
        },
        templateUrl: '/partials/tabPanel.html',
        controller: [
          '$scope',
          '$rootScope',
          '$q',
          'tvbUIState',
          MainPaginator
        ]
      };
    }]);
})();

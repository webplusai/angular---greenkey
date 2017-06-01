(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')
    .service('CompanyDirectoryService', function CompanyDirectoryServiceFn(ngDialog) {

      // Please keep the array declaration for ngDialog controllers (minification issues).
      var _companyListController = [ '$scope', 'TVC', 'CompanyConnectionRequestService', 'usSpinnerService',
        function($scope, TVC, CompanyConnectionRequestService, usSpinnerService) {
          $scope.loading = true;
          usSpinnerService.spin('spinner-company-list');
          $scope.companies = [];

          TVC.getCompanies()
            .then(function(data) {
              $scope.companies = data.list;
              $scope.loading = false;
              usSpinnerService.stop('spinner-company-list');
            })
            .catch(function() {
              $scope.loading = false;
              usSpinnerService.stop('spinner-company-list');
            });

          $scope.showCompanyConnectionModal = CompanyConnectionRequestService.open;
        }
      ];

      function _open() {
        return ngDialog.open({
          className: 'modal-window-wrapper',
          template: '/partials/companyDirectoryList.html',
          closeByEscape: true,
          closeByNavigation: false,
          closeByDocument: false,
          controller: _companyListController
        });
      }


      return {
        open: _open
      };

    });
})();

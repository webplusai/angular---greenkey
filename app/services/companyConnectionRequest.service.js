(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')
    .service('CompanyConnectionRequestService', function CompanyConnectionRequestService($q, ngDialog, TVC) {

      var companyConnectionTypes = {
        options: [
          { id: 1, name: 'Hoot', ref: 'hoot' },
          { id: 2, name: 'Team Hoot', ref: 'team_hoot' },
          { id: 3, name: 'Ringdown', ref: 'ringdown' }
        ],
        selected: null
      };
      var productsCache = null;

      // Get the products from the service if needed.
      //  Convenient promise return.
      function _getProducts(products) {
        var dfd = $q.defer();

        if (products || productsCache) {
          dfd.resolve(products || productsCache);
        } else {
          TVC.getProducts()
            .then(function(data) {
              productsCache = data.results;
              dfd.resolve(data.results);
            })
            .catch(dfd.reject);
        }

        return dfd.promise;
      }

      function _open(company, productList) {

        _getProducts(productList).then(function(products) {

          ngDialog.open({
            template: '/partials/connectionModals/add-company-connection.html',
            className: 'modal-window-wrapper add-company-connection-dialog',
            closeByEscape: true,
            controller: ['$scope', function($scope) {
              $scope.company = company;
              $scope.products = products;
              $scope.companyConnectionTypes = companyConnectionTypes;
              $scope.companyConnectionTypes.selected = companyConnectionTypes.options[0];
              $scope.showError = false;
              $scope.prods = {
                selected: []
              };
              $scope.message = '';

              $scope.saveCompanyConnection = function() {
                if (!$scope.message) {
                  $scope.showError = true;
                  return;
                }

                var prodIds = _.map($scope.prods.selected, function(prod) {
                  return prod.id;
                });

                _saveCompanyConnection(company, {
                  products: prodIds,
                  type: $scope.companyConnectionTypes.selected.ref,
                  counterpartyCompany: $scope.company.id,
                  message: $scope.message
                });
              };
            }]
          });
        });

      }

      function _saveCompanyConnection(company, options) {
        var data = {
          connection_type: options.type,
          counterparty_company: options.counterpartyCompany,
          message: options.message || '',
          products: options.products
        };

        TVC.requestDirectCompanyConnection(data)
          .then(function() {
            ngDialog.close(); // closing all modals.
          }, function() {
            console.log('error: creating direct company connection');
          });
      }



      return {
        open: _open
      };

    });
})();

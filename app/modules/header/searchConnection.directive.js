(function () {
  'use strict';

  angular.module('gkt.voiceBox.header')
    .directive('searchConnection', function() {
      return {
        restrict: 'E',
        templateUrl: '/partials/searchConnection.html',

        controller: function($scope, $q, ngDialog, TVC, CallService,
                             CompanyConnectionRequestService, GKT, CallManager, ContactsRequestService,
                             TeamHootConnectionRequestService
                             ) {
          var searchListDialog;
          $scope.isLoading = false;

          var makeExternalCall = function(contact) {
            CallService.makeRingdownCall(contact.ringdownRef.uid);

            if (searchListDialog) {
              searchListDialog.close();
              searchListDialog = null;
            }
          };

          var searchUsers = function(companies, regExp) {
            var searchText = $scope.search_user_name;
            var usersPromise = TVC.searchUserByName(searchText);
            var externalPromise = CallManager.getExternalConnectionsByName(regExp);
            var teamHootsPromise = TVC.getExternalTeamHoots();

            $scope.isLoading = true;

            Promise.all([usersPromise, externalPromise, teamHootsPromise])
              .then(function(results) {
                searchListDialog = ngDialog.open({
                  className: 'modal-window-wrapper',
                  template: '/partials/connectionModals/user-list.html',
                  closeByEscape: true,
                  closeByNavigation: false,
                  closeByDocument: false,
                  controller: ['$scope', 'ProfileHelper', function($scope, ProfileHelper) {
                    handleSearchResults($scope, ProfileHelper, companies, results, searchText);
                  }]
                });

                $scope.isLoading = false;
              }, function() {
                console.log('error: search connection');
                $scope.isLoading = false;
              });
          };

          var handleSearchResults = function($scope, ProfileHelper, companies, results, userName) {
            var usersSearchResult = results[0].result;
            var externalContactsResult = _.map(results[1], function(item) {
              item.contact.ringdownRef = item;
              return item.contact;
            });
            var teamHootsResult = filterTeamHootResults(results[2], userName);

            $scope.usersLists = usersSearchResult.concat(externalContactsResult);
            $scope.companyList = companies;
            $scope.teamHootsList = teamHootsResult;

            $scope.addConnection = function(user) {
              ContactsRequestService.addConnection(user, function() {
                user.status = 'Pending';
              });
            };

            $scope.isRemoving = false;

            $scope.removeConnection = function(user) {
              $scope.isRemoving = true;
              ContactsRequestService.removeConnection(user)
                .then(function() {
                  user.status = 'Connect';
                  $scope.isRemoving = false;
                }, function() {
                  $scope.isRemoving = false;
                });
            };

            $scope.openProfile = function (user) {
              ProfileHelper.openProfile(user.uid);
            };

            $scope.showCompanyConnectionModal = function(company) {
              CompanyConnectionRequestService.open(company, $scope.products);
            };

            $scope.showTeamHootConnectionModal = function(teamHoot) {
              TeamHootConnectionRequestService.open(teamHoot);
            };
            $scope.callToExternal = makeExternalCall;
          };

          var getCompanyList = function() {
            $scope.companiesPromise = TVC.getCompanies();
            $scope.companiesPromise.then(function(data) {
              $scope.companies = data.list;
              _.map($scope.companies, function(company) {
                company.type = 'company';
              });
            });
          };

          var getProducts = function() {
            $scope.productsPromise = TVC.getProducts();
            $scope.productsPromise.then(function(data) {
              $scope.products = data.results;
            });
          };

          $scope.searchConnection = function() {
            if (!$scope.search_user_name) {
              return false;
            }

            $scope.companiesPromise.then(function() {
              var regExp = new RegExp($scope.search_user_name, 'i');
              var filteredCompanies = _.filter($scope.companies, function(c) {
                return c.name.match(regExp);
              });

              searchUsers(filteredCompanies, regExp);
            });

          };

          var filterTeamHootResults = function(searchResults, userName) {
            var regExp = new RegExp(userName, 'i');
            var lastCompany = null;
            var filtered, sorted, results = [];

            filtered = _.filter(searchResults.list, function(teamHoot) {
              return teamHoot.name.match(regExp);
            });

            sorted = _.sortBy(filtered, function(o) {
              return o.company.name;
            });

            _.each(sorted, function(item) {
              if (item.company.id !== lastCompany) {
                results.push({
                  isCompany: true,
                  name: item.company.name,
                  id: item.company.id
                });
              }
              results.push(item);
            });

            return results;
          };

          getCompanyList();
          getProducts();

        }
      };
    });

})();

+function() {
  'use strict';

  angular.module('gkt.voiceBox.externalContacts').directive('externalContactsPanel', function() {
    return {
      restrict: 'E',
      scope: {},
      replace: true,
      controller: [
        '$scope',
        '$timeout',
        'ngDialog',
        'ContactsExport',
        'CallManager',
        'TVC',
        externalContactsPanelCtrl
      ],
      controllerAs: 'externalContactsPanelCtrl',
      templateUrl: '/partials/externalContacts/externalContactsPanel.html'
    };
  });


  function externalContactsPanelCtrl($scope, $timeout, ngDialog, ContactsExport, CallManager, TVC) {

    var DEFAULT_IMPORT_ERROR_MESSAGE = 'Cannot import contacts from uploaded file',
        INCORRECT_FILE_ERROR_MESSAGE = 'Cannot import contacts from selected file. Please choose correct CSV file.';

    $scope.contactsFilter = '';
    $scope.isExportInProgress = false;
    $scope.hasRealContacts = false;
    
    initializeContacts();
    initializeHelpers();
    initializeImportHelpers();
    // it's for communication between externalContact and externalContactEditForm
    var panelController = this;
    initializeCommunicationHelpers();


    function initializeContacts() {
      $scope.contacts = [];

      CallManager.getExternalConnections().then(function(externalContacts) {
        $scope.contacts = _.values(externalContacts);

        _.each($scope.contacts, function(connection) {
          if(!ContactsExport.isFakeContact(connection.contact)) {
            $scope.hasRealContacts = true;
            return false;
          }
        });
      });
    }

    function initializeHelpers() {
      $scope.closeExternalContactsPanel = function() {
        ngDialog.close();
      };

      $scope.isContactVisible = function() {
        // this method is called in context of contacts list item
        var $externalContactScope = this;

        if (! $externalContactScope.contact instanceof ExternalConnection) {
          return false;
        }

        var contactName = $externalContactScope.contact.contact.display_name.toLocaleLowerCase(),
            searchValue = $scope.contactsFilter.toLocaleLowerCase();

        return contactName.indexOf(searchValue) > -1;
      };
    }

    function initializeCommunicationHelpers() {

      $scope.editingContact = null;

      panelController.openEditForm = function(contact) {
        $scope.editingContact = contact;
      };

      panelController.closeEditForm = function(forceUpdate) {
        $scope.editingContact = null;
        forceUpdate && $scope.$apply();
      };

    }

    function initializeImportHelpers() {
      var fileInput = document.getElementById('external-contacts-file-for-import'),
          // just a wrapper for safe access to input field
          $fileInput = angular.element(fileInput);


      $scope.openImportDialog = function() {
        $fileInput.click();
      };

      // ng-change doesn't support file input fields
      $fileInput.on('change', function() {
        if (fileInput.files.length === 0) {
          return;
        }

        var contactsFile = fileInput.files.item(0),
            fileExtension = _.isString(contactsFile.name) ? contactsFile.name.substr(-3).toLowerCase() : '';

        if (contactsFile.type !== "text/csv" && fileExtension !== 'csv') {
          return showImportErrorMessage(INCORRECT_FILE_ERROR_MESSAGE);
        }

        TVC.importExternalContacts(contactsFile)
          .then(function(response) {
            if (!response.success) {
              return showImportErrorMessage(DEFAULT_IMPORT_ERROR_MESSAGE);
            }
            initializeContacts();
          })
          .catch(function() {
            showImportErrorMessage(DEFAULT_IMPORT_ERROR_MESSAGE);
          });
      });

      function showImportErrorMessage(message) {
        ngDialog.open({
          template: '/partials/common/promptError.html',
          data: {
            error: message
          }
        });
      }

      $scope.openExportDialog = function () {
        $scope.isExportInProgress = true;
        ContactsExport.exportExternalContactsToCsv().then(function (csvContent) {
          var link = document.createElement('a');
          link.setAttribute('href', encodeURI(csvContent));
          link.setAttribute('download', 'externalContacts.csv');
          link.click();

          $timeout(function () {
            $scope.isExportInProgress = false;
          });
        }, function (message) {
          ngDialog.open({
            template: '/partials/common/promptError.html',
            data: {
              error: message
            }
          });

          $timeout(function () {
            $scope.isExportInProgress = false;
          });
        });
      };
    }
  }

}();
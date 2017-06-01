(function() {
  'use strict';

  angular.module('gkt.voiceBox.externalContacts').directive('externalContactEditForm', function() {
    return {
      restrict: 'E',
      scope: {
        contact: '='
      },
      require: '^^externalContactsPanel',
      link: function(scope, element, attrs, panelController) {
        scope.panelController = panelController;
      },
      controller: [
        '$scope',
        '$document',
        'TVC',
        'ngDialog',
        externalContactEditFormCtrl
      ],
      controllerAs: 'externalContactEditFormCtrl',
      templateUrl: '/partials/externalContacts/externalContactEditForm.html'
    };
  });


  function externalContactEditFormCtrl($scope, $document, TVC, ngDialog) {

    initializeDataModel();
    initializeUiMethods();



    function initializeDataModel() {
      if ( !($scope.contact instanceof ExternalConnection) ) {
        return;
      }

      var contactData = $scope.contact.contact;
      // it shouldn't edit properties of Connection instance, so copy them
      $scope.company = contactData.company;
      $scope.lastName = contactData.last_name;
      $scope.firstName = contactData.first_name;
      $scope.displayName = contactData.display_name;
      $scope.email = contactData.email;
      $scope.phone = contactData.phone_numbers.international;
      $scope.speedDial = contactData.favorite;
      $scope.updateErrors = {};
    }

    function initializeUiMethods() {
      $scope.closeExternalContactEditForm = function() {
        $scope.panelController.closeEditForm();
      };

      $scope.closeExternalContactsPanel = function() {
        ngDialog.close();
      };

      $scope.updateContact = function() {
        var controlButtons = $document.find('.edit-form-control-buttons .edit-form-button');
        controlButtons.addClass('disabled').attr('disabled');

        TVC.updateExternalContact({
          company: $scope.company,
          display_name: $scope.displayName,
          email: $scope.email,
          favorite: $scope.speedDial,
          first_name: $scope.firstName,
          last_name: $scope.lastName,
          phone: $scope.phone,
          uid: $scope.contact.uid
        }).then(function(response) {
          if (response.success) {
            $scope.panelController.closeEditForm(true);
            return;
          }

          // unblock control buttons
          controlButtons.removeClass('disabled').removeAttr('disabled');
          // highlight fields with incorrect data
          _.forEach(response, function(error, propertyName) {
            if (_.isArray(error) && error.length > 0) {
              $scope.updateErrors[propertyName] = error[0];
            }
          });
          $scope.$apply();

        }).catch(function(error) {
          controlButtons.removeClass('disabled').removeAttr('disabled');
          console.warn('Cannot update external contact; error = ', error);
        });
      };

      $scope.resetUpdateError = function(propertyName) {
        $scope.updateErrors[propertyName] = null;
      };
    }

  }

})();

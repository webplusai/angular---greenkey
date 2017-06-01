+function() {
  'use strict';

  angular.module('gkt.voiceBox.externalContacts').directive('externalContact', function() {
    return {
      restrict: 'E',
      replace: true,
      require: '^^externalContactsPanel',
      link: function(scope, element, attrs, panelController) {
        scope.panelController = panelController;
      },
      controller: [
        '$scope',
        'ngDialog',
        'CallService',
        externalContactCtrl
      ],
      scope: {
        contact: '='
      },
      controllerAs: 'externalContactCtrl',
      templateUrl: '/partials/externalContacts/externalContact.html'
    };
  });


  function externalContactCtrl($scope, ngDialog, CallService) {

    $scope.isEditable = isUidCorrect($scope.contact.uid);

    $scope.callExternalContact = function() {
      CallService.callExternalContact($scope.contact);
      ngDialog.closeAll();
    };

    $scope.editContact = function() {
      $scope.panelController.openEditForm($scope.contact);
    };
  }

  function isUidCorrect(uid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uid);
  }

}();
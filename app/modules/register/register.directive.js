(function () {
  'use strict';

  angular.module('gkt.voiceBox.register')
  .directive('register', function registerDirective() {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: '/partials/register/register.html',
      controller: registerCtrl
    };
  });

  function registerCtrl($scope, $location, ngDialog, usSpinnerService, TVC) {
    var EMAIL_REG_EXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

    $scope.userData = {
      firstname: '',
      lastname: '',
      email: ''
    };

    $scope.errors = {
      firstname: false,
      lastname: false,
      email: false
    };

    $scope.gotErrors = false;

    $scope.gotToLogin = function() {
      $location.path('/login');
    };

    $scope.resetError = function(field) {
      $scope.errors[field] = false;
      $scope.gotErrors = false;
    };

    $scope.register = function() {
      if (!hasOveralErrors()) {
        $scope.gotErrors = false;
        usSpinnerService.spin('spinner-register');

        TVC.registration($scope.userData)
          .then(function() {
            displaySuccessMsg();
            usSpinnerService.stop('spinner-register');
          })
          .catch(function(response) {
            $scope.errors.email = response.errors.email[0];
            $scope.gotErrors = true;
            usSpinnerService.stop('spinner-register');
          });
      }
    };

    var hasOveralErrors = function() {
      var validFirstname = $scope.userData.firstname.trim() !== '';
      var validLastname = $scope.userData.lastname.trim() !== '';
      var validEmail = EMAIL_REG_EXP.test($scope.userData.email);

      $scope.errors.firstname = !validFirstname;
      $scope.errors.lastname = !validLastname;
      $scope.errors.email = !validEmail;

      return !(validFirstname && validLastname && validEmail);
    };

    var displaySuccessMsg = function() {
      var successDialog = ngDialog.open({
        template: '/partials/register/successRegistration.html'
      });

      successDialog.closePromise.then(function() {
        $location.path('/login');
      });

    };
  }

})();

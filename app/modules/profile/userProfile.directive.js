(function() {
  'use strict';

  angular.module('gkt.voiceBox.userProfile').directive('userProfile', function () {
    return {
      restrict: 'E',
      scope: {},
      controller: [
        '$scope',
        '$rootScope',
        '$timeout',
        'ngDialog',
        'TVC',
        'BinaryDataHelpersService',
        'OpenFin',
        'commonConstants',
        userProfileController
      ],
      templateUrl: '/partials/userProfile/userProfile.html',
      replace: true
    };
  });

  function userProfileController($scope, $rootScope, $timeout, ngDialog, TVC, BinaryDataHelpers, OpenFin, commonConstants) {

    // --- preloader ---
    var isReady = false;
    $scope.isPreloaderVisible = false;
    $scope.msgAlertEnabled = !GKTConfig.getBoolean(commonConstants.CONFIG_PROPS.msgAlertDisabled, false);
    $scope.isOpenfin = OpenFin.exists();
    activatePreloader();

    function activatePreloader() {
      $scope.isPreloaderVisible = true;
      // wait at least a half of second to let the form render loaded data correctly
      $timeout(hidePreloader, 500);
    }

    function hidePreloader() {
      if (isReady) {
        $scope.isPreloaderVisible = false;
      } else {
        activatePreloader();
      }
    }


    // -- common user's details ---
    $scope.firstName = '';
    $scope.lastName = '';
    $scope.company = '';
    $scope.phone = '';
    $scope.avatar = '';
    $scope.products = '';

    TVC.getProfile().then(function(userData) {
      $scope.firstName = userData.first_name;
      $scope.lastName = userData.last_name;
      $scope.company = userData.company_name;
      $scope.phone = userData.phone_internal;
      $scope.avatar = userData.full_photo_link;
      $scope.callRecordingStatus = userData.features.KAZOO_RECORDINGS;

      var products = [];
      _.each(userData.products, function(productData) {
        products.push(productData.text);
      });
      $scope.products = products.join(', ');

      isReady = true;
    });


    // --- avatar editor ---
    $scope.isAvatarEditorShown = false;

    var avatarFileInput = angular.element('#user-avatar-file'),
        cropper = null;

    $scope.selectAvatar = function() {
      avatarFileInput.click();
    };

    $scope.saveAvatar = function() {
      var canvasWithCroppedImage = cropper.getCroppedCanvas({width: 150, height: 150}),
          croppedImage = BinaryDataHelpers.convertDataUrlToBlob(canvasWithCroppedImage.toDataURL());

      isReady = false;
      activatePreloader();
      $scope.closeAvatarEditor();

      TVC.uploadNewAvatar(croppedImage, 0, 150, 0, 150)
        .then(function(response) {
          if (response.success) {
            $scope.avatar = response.full_photo_link;
          }
          // to let the new avatar loads
          $timeout(function() {
            isReady = true;
          }, 500);
        })
        .catch(function() {
          isReady = true;
        });
    };

    $scope.closeAvatarEditor = function() {
      $scope.isAvatarEditorShown = false;
      avatarFileInput.val('');
    };


    avatarFileInput.on('change', function() {
      var avatarFile = avatarFileInput.get(0).files.item(0),
        imageExtensionsPattern = /\.(png|jpe?g|gif|bmp)$/i;

      if (!avatarFile || !avatarFile.name.match(imageExtensionsPattern)) {
        return;
      }

      showAvatarEditor(avatarFile);
    });

    function showAvatarEditor(avatarFile) {
      $scope.$apply(function() {
        $scope.isAvatarEditorShown = true;
      });

      var editor = angular.element('#avatar-editor').html(''),
          avatarImage = angular.element('<img>');

      avatarImage.attr('src', URL.createObjectURL(avatarFile));
      editor.append(avatarImage);

      cropper = new Cropper(avatarImage.get(0), {
        dragMode: 'move',
        aspectRatio: 1,
        autoCropArea: 0.65,
        guides: true,
        center: true,
        highlight: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        background: false
      });
    }

    $scope.$watch('msgAlertEnabled', function(newVal) {
      GKTConfig.setProperty(commonConstants.CONFIG_PROPS.msgAlertDisabled, !$scope.msgAlertEnabled);
    });

    // --- helpers ---
    $scope.closeThisDialog = ngDialog.close;
  }

})();



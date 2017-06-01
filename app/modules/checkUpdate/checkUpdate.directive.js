(function() {
  'use strict';

  angular.module('gkt.voiceBox.checkUpdate')

  .factory('checkUpdateService', function(usSpinnerService, $http, ngDialog) {

    var DELAY_BETWEEN_CALLS = 300000; // Delay to check for new server build.
    var COUNTDOWN_SECS = 60; // Seconds of the countdown confirmation.
    var buildVersion = null;
    var versionIntervalId;
    var countdownIntervalId;

    var _reloadApp = function() {
      document.location.reload(true);
    };

    // ngDialog Controller must be defined as an array declaration:
    var _confirmController = ['$scope', function($scope) {
      $scope.countdown = COUNTDOWN_SECS;
      $scope.action = 'Page will be reloaded';
      $scope.submitText = 'Reload now';

      countdownIntervalId = setInterval(function() {
        $scope.$apply(function() {
          $scope.countdown -= 1;

          if ($scope.countdown === 0) {
            _reloadApp();
          }
        });

      }, 1000);
    }];

    var _openConfirmDialog = function() {
      ngDialog.openConfirm({
          controller: _confirmController,
          template: '/partials/common/confirmReload.html'
        })
        .then(function() {
          _reloadApp();
        })
        .catch(function() {
          clearInterval(countdownIntervalId);
          versionIntervalId = setInterval(_getVersion, DELAY_BETWEEN_CALLS);
        });
    };

    var _getVersion = function() {
      return $http({
          method: 'GET',
          url: 'configs/version.json?id=' + _.uniqueId()
        })
        .then(function successCallback(response) {
          if (!buildVersion) {
            buildVersion = response.data.buildId ? response.data.buildId : buildVersion;
            return;
          }

          if (buildVersion !== response.data.buildId) {
            clearInterval(versionIntervalId);
            _openConfirmDialog();
          }
        });
    };

    var _init = function() {
      _getVersion();
      versionIntervalId = setInterval(_getVersion, DELAY_BETWEEN_CALLS);
    };


    return {
      init: _init
    };
  });

})();

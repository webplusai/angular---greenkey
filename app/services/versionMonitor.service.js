(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

    .factory('VersionMonitorService', function($window, $localStorage, authService, commonConstants, GKT, OpenFin, ngDialog) {
      var COUNTDOWN_SECS = 60;

      var REQUIRED_APP_VERSION = "1.0.1667";
      var REQUIRED_SDK_VERSION = "1.0.1667";
      var REQUIRED_OPENFIN_VERSION = '6.49.11.70';

      function _isVersionFit(latestVersion, requiredVersion) {

        function toInt(item) {
          var int = parseInt(item);
          return _.isNaN(int) ? 0 : int;
        }

        // convert to array of integers
        var latestParts = _.map(latestVersion.split("."), toInt);
        var requiredParts = _.map(requiredVersion.split("."), toInt);

        // expand with zeros
        while (latestParts.length < requiredParts.length) latestParts.push(0);
        while (requiredParts.length < latestParts.length) requiredParts.push(0);

        // compare
        for(var i = 0; i < requiredParts.length; i++) {
          if(latestParts[i] < requiredParts[i])
            return false;

          if(latestParts[i] > requiredParts[i])
            return true;
        }

        // that means that versions are equal
        return true;
      }

      function _isRequirementMet(appVersion, sdkVersion) {
        if(!appVersion || !sdkVersion)
          return false;

        return _isVersionFit(appVersion, REQUIRED_APP_VERSION) &&
          _isVersionFit(sdkVersion, REQUIRED_SDK_VERSION);
      }

      function _checkVersion() {

        _checkOpenFinVersion();

        // find out if latest versions meet requirement
        var isMet = _isRequirementMet(
          $localStorage.latestAppVersion, $localStorage.latestSdkVersion);

        // update persisted latest versions
        $localStorage.latestAppVersion = GKT_APP_VERSION;
        $localStorage.latestSdkVersion = GKT_SDK_VERSION;

        if(isMet)
          return true;

        // if requirement is not met, perform required actions
        if(!authService.isLoggedIn()) {
          // for unauthorized users we can simply reload the page
          $window.location.reload();
          return false;
        }

        // but we should force authorized users to log out
        GKT.forceLogout(commonConstants.GKT.FORCE_LOGOUT_REASONS.session_expired);
        return false;
      }

      var countdownIntervalId = null;

      function _terminate(){
        fin.desktop.Application.getCurrent().terminate(function ()
          { console.warn("You will not read this."); }
          , function (err)
          { console.warn("failure:", err); }
        );
      }

      // ngDialog Controller must be defined as an array declaration:
      var _confirmController = ['$scope', function($scope) {
        $scope.countdown = COUNTDOWN_SECS;
        $scope.action = 'Application will be closed';
        $scope.submitText = 'Close now';

        countdownIntervalId = setInterval(function() {
          $scope.$apply(function() {
            $scope.countdown -= 1;

            if ($scope.countdown === 0) {
              _terminate();
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
            _terminate();
          })
          .catch(function() {
            clearInterval(countdownIntervalId);
            setTimeout(_checkOpenFinVersion, 1000 * 60);
          });
      };

      function _checkOpenFinVersion() {
        if(OpenFin.exists()){
          // if there is no such method or object, OpenFin version is obsolete
          if(!fin.desktop || !fin.desktop.System ||
            !_.isFunction(fin.desktop.System.getVersion)) {
            _openConfirmDialog();
            return;
          }

          fin.desktop.System.getVersion(function(version) {
            console.info("Open fin version:", version);
            if(!_isVersionFit(version, REQUIRED_OPENFIN_VERSION)){
              _openConfirmDialog();
            }
          });
        }
      }

      return {
        checkVersion: _checkVersion
      };

    });
})();

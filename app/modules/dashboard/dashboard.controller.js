(function() {
  'use strict';

  angular.module('gkt.voiceBox.dashboard')
      .controller('DashboardController', dashboardController);

  function dashboardController($rootScope, $scope, tvbUIState, commonConstants, authService,
                               $localStorage, CallService, OpenFin, GKT) {


    $rootScope.$emit(commonConstants.UI_EVENTS.dashboard_opened);

    if (SipManager.isConfigured()) {
      fireUserComesOnlineEvent();
    } else {
      authService.restoreAuthData()
        .then(fireUserComesOnlineEvent)
        .catch(function(error) {
          authService.logout().then(function() {
            $localStorage[commonConstants.APP.symphonyModeVarName] = tvbUIState.symphonyMode;
            $localStorage[commonConstants.APP.last_logout_reason] = error.toString();
            GKT.forceLogout(commonConstants.GKT.FORCE_LOGOUT_REASONS.network_error);
          });
        });
    }

    function fireUserComesOnlineEvent() {
      $scope.quoteCaptureEnabled = GKTConfig.getBoolean("ENABLE_VOICE_CAPTURE", false);
      // TODO triggering Configured event for UI moved here from GKTService until we have single entry point
      GKT.triggerConfiguredEvent();
    }

    GKT.addFatalErrorListener(function(errorEvent) {
      var getLogoutError = function() {
        if (errorEvent && errorEvent.code === 401) {
          return commonConstants.GKT.FORCE_LOGOUT_REASONS.session_expired;
        }
        return commonConstants.GKT.FORCE_LOGOUT_REASONS.unexpected_error;
      };

      GKT.forceLogout(getLogoutError());
    });

    $scope.isOpenFin = OpenFin.exists();
    $scope.uiState = tvbUIState;
    $scope.uiConstants = commonConstants.UI;
    $scope.getActiveCallsQty = CallService.getActiveCallsQty;

    $scope.tearHootsOut = function() {
      $rootScope.$emit(commonConstants.UI_EVENTS.tear_out_hoots_panel);
    };

    $scope.tearRingdownsOut = function() {
      $rootScope.$emit(commonConstants.UI_EVENTS.tear_out_ringdowns_panel);
    };

    $scope.togglePhonePanel = function () {
      $scope.uiState.phonePanelVisible = !$scope.uiState.phonePanelVisible;
      GKTConfig.setProperty(commonConstants.CONFIG_PROPS.phone_panel_visible, $scope.uiState.phonePanelVisible);
    };

    // Settings in Compact mode
    $scope.toggleSettings = function() {
      tvbUIState.settingsVisible = !tvbUIState.settingsVisible;
    };
  }
})();

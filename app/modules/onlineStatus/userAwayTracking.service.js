(function () {
  'use strict';
  var PROP_ASSUME_USER_AWAY_AFTER_IDLE_SECONDS = "tvbweb.ASSUME_USER_AWAY_AFTER_IDLE_SECONDS";

  var UserAwayTrackingService = function (Title, Idle, $rootScope, ngDialog, tvbUIState, $timeout, CallService, constants, GKT, TVC) {
    console.log('idle', window.fin, window.fin != null);

    var _isUserAway = false;
    var _isManualSet = false;

    var res = {
      EVENT_NAME_USER_IDLE: "UserAwayTrackingService::UserIdle",
      EVENT_NAME_USER_ACTIVE: "UserAwayTrackingService::UserActive",

      /**
       * Get time in seconds after which user as assumed as idle
       * if he didn't do anything on this browser window.
       */
      getInactivityTimeSeconds: function () {
        //Replace contents with this when GKTConfig is able to save properties
        //return GKTConfig.getInteger(PROP_ASSUME_USER_AWAY_AFTER_IDLE_SECONDS, 60);

        var seconds = localStorage.getItem(PROP_ASSUME_USER_AWAY_AFTER_IDLE_SECONDS);
        return seconds || 600;
      },

      toggleStatus: function() {
        _isUserAway = !_isUserAway;
        _isManualSet = _isUserAway;
        this._saveStatus();
      },

      _saveStatus: function() {
        console.log('[FIN] save status');
        tvbUIState.idle = _isUserAway;
        $timeout(function() {
          console.log('[FIN] emit away status');
          $rootScope.$emit(_isUserAway ?
            this.EVENT_NAME_USER_IDLE :
            this.EVENT_NAME_USER_ACTIVE);
        }.bind(this));

        TVC.sendIdleStatusToTVC(_isUserAway);
      },

      /**
       * Set time in seconds after which user as assumed as idle
       * if he didn't do anything on this browser window.
       * @param inactivityTimeSeconds
       */
      setInactivityTimeSeconds: function (inactivityTimeSeconds) {
        //Replace contents with this when GKTConfig is able to save properties
        //GKTConfig.setProperty(PROP_ASSUME_USER_AWAY_AFTER_IDLE_SECONDS, inactivityTimeSeconds);
        localStorage.setItem(PROP_ASSUME_USER_AWAY_AFTER_IDLE_SECONDS, inactivityTimeSeconds);
        if (window.fin == null) {
          if (inactivityTimeSeconds === '0') {
            console.log("Set idle timeout to 20 minutes");
            Idle.setTimeout(60000 * 20);
          } else {
            Idle.setIdle(inactivityTimeSeconds);
          }
        }
      },

      /**
       * Start watching for user idle state.
       * Ng-idle fires IdleTimeout event name on root scope when user seems idle.
       */
      start: function() {
        if(typeof(fin) !== 'undefined') {
          console.log('[FIN] Adding idle event listener');
          fin.desktop.System.addEventListener('idle-state-changed', function (e) {
            if(e.isIdle && CallService.outboundStreamExists()) {
              return;
            }

            if (!_isManualSet) {
              console.log('[FIN] Idle event', e);
              _isUserAway = e.isIdle && e.elapsedTime > 1000 * 60 * 20;
              this._saveStatus();
            }
          }.bind(this));
        }
      },

      stop: function() {
        console.log("[FIN]: inactivity tracker stopped");
      },

      openSetInactivityTimeDialog: function () {
        var that = this;
        ngDialog.open({
          template: '/partials/onlineStatus/setInactivityTimeDialog.html',
          controller: ['$scope', function ($scope) {

            $scope.inactivityTimeSelectorData = {
              availableOptions: [
                {id: '300', name: '5 minutes'},
              ],
              selectedOption: {id: '300', name: '5 minutes'}
            };

            var inactivityTimeSeconds = that.getInactivityTimeSeconds();
            for (var index in $scope.inactivityTimeSelectorData.availableOptions) {
              if (inactivityTimeSeconds === $scope.inactivityTimeSelectorData.availableOptions[index].id) {
                $scope.inactivityTimeSelectorData.selectedOption = $scope.inactivityTimeSelectorData.availableOptions[index];
                break;
              }
            }

            $scope.saveConfig = function () {
              that.setInactivityTimeSeconds($scope.inactivityTimeSelectorData.selectedOption.id);
            };
          }]
        });
      }
    };

    GKT.addStatusChangeListener(function(status) {
      if(status === constants.GKT.PRESENCE.online)
        res._saveStatus();
    });

    return res;
  };

  angular.module('gkt.voiceBox.onlineStatus')
      .service("UserAwayTrackingService",
        ["Title", "Idle", "$rootScope", "ngDialog", "tvbUIState", "$timeout", "CallService", 'commonConstants', 'GKT', 'TVC',
          UserAwayTrackingService])
      .run(["UserAwayTrackingService", function (UserAwayTrackingService) {
        console.info("UserAwayTrackingService", UserAwayTrackingService);

        setTimeout(UserAwayTrackingService.start.bind(UserAwayTrackingService),120*1000);

      }]);
})();

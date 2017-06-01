(function() {
  'use strict';

  angular.module('gkt.voiceBox.hoots')
    .service('HootsSettingsService', [
      function() {

        var HOOTS_PTT_SETTINGS_PROPERTY = "tvbweb.SHARED.HOOTS_PTT_SETTINGS";

        var serializedPttSettings = GKTConfig.getProperty(HOOTS_PTT_SETTINGS_PROPERTY),
            pttSettings;

        try {
          pttSettings = _.isString(serializedPttSettings) ? JSON.parse(serializedPttSettings) || {} : {};
        } catch (error) {
          pttSettings = {};
        }

        this.isPttModeOn = function(hootUid) {
          return Boolean(pttSettings[hootUid]);
        };

        this.setPttModeStatus = function(hootUid, pttModeStatus) {
          pttSettings[hootUid] = Boolean(pttModeStatus);
          GKTConfig.setProperty(HOOTS_PTT_SETTINGS_PROPERTY, JSON.stringify(pttSettings));
        };

      }
    ]);
})();
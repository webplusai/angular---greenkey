(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .factory('SilencedHootsService', function($localStorage, $rootScope, commonConstants, GKT) {
    var SILENCED_HOOTS_NAMES = 'tvbweb.SHARED.SILENCED_HOOTS';
    var SILENCED_HOOTS_VALUE = {};

    var _init = function() {
      SILENCED_HOOTS_VALUE = GKTConfig.getProperty(SILENCED_HOOTS_NAMES, {});
    };

    var _persistSilence = function(hoot) {
      SILENCED_HOOTS_VALUE[hoot.uid] = true;
      GKTConfig.setProperty(SILENCED_HOOTS_NAMES, SILENCED_HOOTS_VALUE);
      $rootScope.$emit(commonConstants.UI_EVENTS.hootSilenced, hoot);
    };

    var _unsilence = function(hoot) {
      delete SILENCED_HOOTS_VALUE[hoot.uid];
      GKTConfig.setProperty(SILENCED_HOOTS_NAMES, SILENCED_HOOTS_VALUE);
      $rootScope.$emit(commonConstants.UI_EVENTS.hootUnsilenced, hoot);
    };

    var _isSilenced = function(hoot) {
      return !!SILENCED_HOOTS_VALUE[hoot.uid];
    };

    GKT.addConfiguredListener(_init);

    return {
      persistSilence: _persistSilence,
      unsilence: _unsilence,
      isSilenced: _isSilenced
    };
  });

})();

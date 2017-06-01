(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

      .factory('LayoutColumnsConfig', ['$localStorage', function($localStorage) {

        function _getColsConfig(isCompactMode) {
            if(isCompactMode) {
                return $localStorage.compactModeHootCols;
            } else {
                return $localStorage.hootCols;
            }
        }

        function _setColsConfig(val, isCompactMode) {
            if(isCompactMode) {
                $localStorage.compactModeHootCols = val;
            } else {
                $localStorage.hootCols = val;
            }
        }

        return {
          getHootColsConfig: _getColsConfig,
          setHootColsConfig: _setColsConfig
        };
      }]);

})();
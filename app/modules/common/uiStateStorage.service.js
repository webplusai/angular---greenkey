(function() {
  'use strict';

  angular.module('gkt.voiceBox.common')

    .factory('UiStateStorage', function($localStorage, tvbUIState) {
      
      if(!$localStorage.uiState)
        $localStorage.uiState = {};
      
      function saveValue(name) {
        if(tvbUIState.hasOwnProperty(name))
          $localStorage.uiState[name] = tvbUIState[name];
      }
      
      function restoreValue(name) {
        if($localStorage.uiState.hasOwnProperty(name))
          tvbUIState[name] = $localStorage.uiState[name];
      }
      
      return {
        save: saveValue,
        restore: restoreValue
      };
    });
})();

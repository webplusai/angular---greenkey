(function() {
  'use strict';

  angular.module('gkt.voiceBox.checkUpdate', [])

  .run(function(checkUpdateService) {
  	checkUpdateService.init();
  });

})();

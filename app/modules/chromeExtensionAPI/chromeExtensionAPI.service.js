(function () {
  'use strict';

  angular.module('gkt.voiceBox.chromeExtensionAPI')
      .factory('ChromeExtensionAPIService', ChromeExtensionAPIService);


  function ChromeExtensionAPIService($q) {
    return {
      call: function (command, commandArgumentsMap) {
        var dfd = $q.defer();

        if (window.GktVbChromeExtension) {
          GktVbChromeExtension.execute(command, commandArgumentsMap)
            .then(dfd.resolve).catch(dfd.reject);
          return dfd.promise;
        } else {
          dfd.reject(null);
          return dfd.promise;
        }
      }
    };
  }
})();
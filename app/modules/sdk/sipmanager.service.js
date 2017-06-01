(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk').provider("SipManager", function() {
    var sipManager = null;

    this.init = function (sipManagerInstance) {
      sipManager = sipManagerInstance;
    };

    this.$get = ["angularUtils", function() {
      return {};
    }];
  });

})();

(function() {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
    .service('TornWindowStorage', ['commonConstants', 'GKT', TornWindowStorage]);

  function TornWindowStorage(commonConstants, GKT) {

    var TORN_WINDOWS_PROP = 'tvbweb.SHARED.TORN_OUT_WINDOWS';
    var tornWindowsConfig = {
      connections: []
    };

    GKT.addConfiguredListener(function() {
      tornWindowsConfig = GKTConfig.getProperty(TORN_WINDOWS_PROP, tornWindowsConfig);
    });

    function _save() {
      GKTConfig.setProperty(TORN_WINDOWS_PROP, tornWindowsConfig);
    }

    this.isConnectionTornOut = function(uid) {
      return tornWindowsConfig.connections.indexOf(uid) > -1;
    };

    this.saveTornConnection = function(uid) {
      if(!this.isConnectionTornOut(uid)) {
        tornWindowsConfig.connections.push(uid);
        _save();
      }
    };

    this.removeTornConnection = function(uid) {
      if(this.isConnectionTornOut(uid)) {
        var index = tornWindowsConfig.connections.indexOf(uid);
        tornWindowsConfig.connections.splice(index, 1);
        _save();
      }
    };
  }
})();

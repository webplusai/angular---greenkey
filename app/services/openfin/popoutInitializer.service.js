(function() {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
    .factory('OpenfinPopupInitializer',
      ['$timeout', OpenFinNotificationsService]);

  // As it's said in https://greenkeytech.atlassian.net/browse/TVBWEB-2278
  // popout windows are sometimes not initialized
  // so we need to resend initial message in case initialization failed


  function OpenFinNotificationsService($timeout) {

    var UPDATE_INTERVAL = 500;
    
    var notifications = {};
    var tornWindows = {};

    function UpdateScheduler(window, initialMessage) {
      this.window = window;
      this.initialMessage = initialMessage;
      this.updateTimeout = null;
      this.counter = 0;
    }

    UpdateScheduler.prototype.plan = function() {
      this.updateTimeout = $timeout(this._send.bind(this), UPDATE_INTERVAL);
    };

    UpdateScheduler.prototype._send = function() {
      if(++this.counter > 10) {
        this.stop();
        console.error("10 attempts to initialize window with initial options",
          this.initialMessage, " was made. Stopping now.");
        return;
      }
      this.window.sendMessage(this.initialMessage);
      this.plan();
    };

    UpdateScheduler.prototype.stop = function() {
      if(this.updateTimeout) {
        $timeout.cancel(this.updateTimeout);
        this.updateTimeout = null;
      }
    };

    function registerPopout(isTornWindow, uid, window, initialMessage) {
      var registry = isTornWindow ? tornWindows : notifications;
      if(registry.hasOwnProperty(uid))
        return;

      var scheduler = new UpdateScheduler(window, initialMessage);
      registry[uid] = scheduler;
      scheduler.plan();
    }

    function unregisterPopout(isTornWindow, uid) {
      var registry = isTornWindow ? tornWindows : notifications;
      var scheduler = registry[uid];
      if(scheduler) {
        scheduler.stop();
        delete registry[uid];
      }
    }


    return {
      registerTornWindow: registerPopout.bind(this, true),
      registerNotification: registerPopout.bind(this, false),
      unregisterTornWindow: unregisterPopout.bind(this, true),
      unregisterNotification: unregisterPopout.bind(this, false)
    };

  }
})();

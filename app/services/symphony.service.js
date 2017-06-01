(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')
    .service('SymphonyService', ['$timeout', '$window', '$http', 'CallService', 'tvbUIState',
      '$localStorage', 'commonConstants', 'CallManager', SymphonyService]);

  function SymphonyService($timeout, $window, $http, CallService, tvbUIState, $localStorage,
                           commonConstants, CallManager) {

    var SYMPHONY_EVENT_PREFIX = "symphony";
    var SYMPHONY_EVENT_HANDLERS = {
      callRingdown: _callRingdown,
      changeUiTheme: _changeUiTheme
    };

    function _callRingdown(data) {
      console.log("Calling ringdown");

      var apiServer = localStorage.getItem("RINGDOWN_API_SERVER");
      var apiKey = localStorage.getItem("RINGDOWN_API_KEY");

      if(apiServer && apiKey) {
        var request = { "data" : { "api_key" : apiKey }};
        $http.put(apiServer,request).then(function(data) {
          console.log(data);
        })
      }

      if (!data.newValue) {
        console.warn('Symphony: No email for ringdown call found');
        return;
      }

      CallManager.getRingdownConnections().then(function(ringdowns) {
        var target = _.find(ringdowns, function(item) {
          return item.contact.email === data.newValue;
        });

        target ?
          CallService.makeRingdownCall(target.uid, true) :
          console.warn("Symphony: No ringdown with email " + data.newValue + " found");
      });
    }

    function _detectRunningTvb() {
      // we have to use native localStorage here
      // because the item comes from Symphony and hasn't $localStorage's configured prefix
      window.localStorage.setItem('symphony:detectRunningTvbCallback', Math.random());
    }

    function _changeUiTheme(data) {
      if (!data.newValue) {
        console.warn('Symphony: No UI theme for changing found');
        return;
      }

      $timeout(function(){
        tvbUIState.darkTheme = data.newValue === 'dark';
      });
    }

    function _detect() {
      if (($window !== $window.top && document.referrer.indexOf('symphony.com') >= 0) /* for iframe mode */ ||
          document.referrer.indexOf('symphony-index.html') >= 0) { /* for standalone mode */
        console.info('Embedding into Symphony is detected:', document.referrer);
        tvbUIState.symphonyMode = true;
        console.log("Setting compact mode to enabled");
        tvbUIState.compactMode = true;
      } else {
        tvbUIState.symphonyMode = !!$localStorage[commonConstants.APP.symphonyModeVarName];
        delete $localStorage[commonConstants.APP.symphonyModeVarName];
      }

      return tvbUIState.symphonyMode;
    }


    function _registerEventListeners(listeners) {
      if (typeof listeners !== 'object') {
        return;
      }

      // Symphony is running in another tab, so we communicate via localStorage
      $window.addEventListener("storage", function(event) {
        var eventName = event.key.split(':');
        if (eventName.length > 1 && eventName[0] === SYMPHONY_EVENT_PREFIX && event.newValue !== null) {
          if (typeof listeners[eventName[1]] === 'function') {
            listeners[eventName[1]].call(null, {
              newValue: event.newValue
            });
          }
        }
      }, false);
    }

    function _init() {
      tvbUIState.darkTheme = localStorage.getItem('symphony:changeUiTheme') === 'dark';
      _registerEventListeners(SYMPHONY_EVENT_HANDLERS);
    }

    return {
      init: function () {
        if (_detect()) {
          _init();
        }

        // some events should be handled even when tvb is running not in symphony mode
        _registerEventListeners({
          detectRunningTvb: _detectRunningTvb
        });
      }
    };
  }
})();

(function () {
  'use strict';

  angular.module('gkt.voiceBox.openFin').service('FailsafeLoggingService', FailsafeLoggingService);

  function FailsafeLoggingService() {
    var lastDomStrings = {};

    var observerConfig = {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    };

    function _logDomString(domString, chat) {
      if (domString !== lastDomStrings[chat]) {
        GKTLog.sendChatHistoryDomEvent(domString);
        lastDomStrings[chat] = domString;
      }
    }

    return {
      initLogging: function (chatDocument, chat) {
        if (!chatDocument) {
          console.warn('Unable to initialize observer');
          return;
        }

        var observer = new MutationObserver(function () {
          _logDomString(chatDocument.body.innerText, chat);
        });

        observer.observe(chatDocument, observerConfig);
      }
    }
  }
})();
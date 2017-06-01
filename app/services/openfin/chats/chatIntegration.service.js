(function() {
  'use strict';

  angular.module('gkt.voiceBox.openFin').service('ChatIntegrationService', [ChatIntegrationService]);

  function ChatIntegrationService() {

    this.injectScriptIntoChatPage = function(openFinWindow, scriptUrl) {
      return new Promise(function(resolve, reject) {
        // for old stable OpenFin
        if (!_.isFunction(openFinWindow.executeJavaScript)) {
          try {
            var chatDocument = openFinWindow.contentWindow.document;
            var scriptNode = chatDocument.createElement('script');
            scriptNode.setAttribute('src', scriptUrl);
            chatDocument.body.appendChild(scriptNode);
            resolve();
          } catch(error) {
            reject(error);
          }

          return;
        }

        // we can't just inject code via script tag because of content security policy
        // and it needs to run it with executeJavaScript() method of OpenFin's API
        ajax({url: scriptUrl, method: 'GET'})
          .then(function (scriptText) {
            openFinWindow.executeJavaScript(scriptText, resolve, reject);
            setTimeout(reject, 3000);
          })
          .catch(reject);
      });
    };

    this.injectCssIntoChatPage = function(openFinWindow, cssUrl) {
      // for old stable OpenFin
      if (!_.isFunction(openFinWindow.executeJavaScript)) {
        try {
          var chatDocument = openFinWindow.contentWindow.document;
          var cssElement = document.createElement('link');
          cssElement.setAttribute("type", "text/css");
          cssElement.setAttribute("rel", "stylesheet");
          cssElement.setAttribute("href", cssUrl);
          chatDocument.head.appendChild(cssElement);
        } catch(error) {}

        return;
      }

      ajax({url: cssUrl, method: 'GET'})
        .then(function (cssText) {
          var preparedCss = cssText.replace(/\r?\n|\r/g, '');
          window.preparedCss = preparedCss;
          window.openFinWindow = openFinWindow;
          openFinWindow.executeJavaScript([
            'cssElement = document.createElement("style");',
            'cssElement.innerHTML = "', preparedCss, '";',
            'document.head.appendChild(cssElement);'
          ].join(''));
        });
    };

    this.sendMessage = function(openFinWindow, messageType, messageData) {
      var formalizedMessage = {
        type: messageType,
        data: messageData
      };

      // for old stable OpenFin
      if (!_.isFunction(openFinWindow.executeJavaScript)) {
        try {
          openFinWindow.contentWindow.postMessage(formalizedMessage, '*');
        } catch(error) {}

        return;
      }

      openFinWindow.executeJavaScript([
        'window.postMessage(', JSON.stringify(formalizedMessage), ', "*")'
      ].join(''));
    };

  }
})();
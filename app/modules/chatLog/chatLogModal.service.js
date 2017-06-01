(function() {
  'use strict';
  angular.module('gkt.voiceBox.chatLog')
    .factory('ChatLogModalService', ['ngDialog', 'ChatLogService', 'GKT', '$timeout', 'OpenFin', chatLogModalServiceCtrl]);

  function chatLogModalServiceCtrl(ngDialog, ChatLogService, GKT, $timeout, OpenFin) {
    var currentDialog = null;

    function openChatLog() {
      if (OpenFin.exists()) {
        openInNewWindow();
        return;
      } else {
        currentDialog = ngDialog.open({
          template: '/partials/chatLog/chatLogModal.html',
          controller: 'ChatLogController',
          className: 'modal-window-wrapper',
          closeByEscape: true,
          closeByNavigation: true,
          closeByDocument: true
        });
      }
    }

    function openInNewWindow() {
      var windowOptions = {
        url: '/openfin/popouts.html#/chat-log',
        name: 'Chat Logs',
        defaultWidth: 900,
        defaultHeight: 640,
        resizable: false,
        autoShow: true,
        frame: true,
        waitForPageLoad: false
      };

      var openFinWindow = new fin.desktop.Window(windowOptions);
    }


    if (OpenFin.exists()) {
      setTimeout(function() {
        fin.desktop.InterApplicationBus.subscribe('*', 'getUserInfo', function(message, senderUuid) {
          var userName = GKT.getUserInfo().userName;
          var userId = GKTConfig.getJSON('net.java.sip.communicator.url.WEBSOCKET_HEADERS')['My-User-Uid'];

          fin.desktop.InterApplicationBus.publish('sendUserInfo', {
            userId: userId,
            userName: userName
          });
        });

        fin.desktop.InterApplicationBus.subscribe('*', 'fetchChatLog', function() {
          ChatLogService.fetchChatLog(500).then(function(data) {
            fin.desktop.InterApplicationBus.publish('sendChatLog', data);
          });
        });
      }, 1000);
    }


    return {
      open: openChatLog
    };
  }
})();

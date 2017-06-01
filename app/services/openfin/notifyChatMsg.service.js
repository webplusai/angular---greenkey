(function() {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
  .factory('NotifyChatMsgService', NotifyNewChatMsgCtrl);

  var MAX_FLASHING_DURATION = 15000;

  function NotifyNewChatMsgCtrl(commonConstants, AudioService, TabbedTornChats) {
    'ngInject';

    function _alertNewChatMessage(finWindow, chatId, flash, playSound) {
      // No alerts when the active chat is the current one.
      if (TabbedTornChats.getActiveChat() === chatId) {
        return false;
      }

      if (flash === undefined || flash) {
        flashWindow(finWindow);
      }

      var areSoundAlertEnabled = !GKTConfig.getBoolean(commonConstants.CONFIG_PROPS.msgAlertDisabled, false);
      if (playSound && areSoundAlertEnabled) {
        AudioService.getNotificationAudioForIncomingMsg('').play();
      }
      return true;
    }

    function flashWindow(chatWindow, duration) {
      chatWindow.flash();

      setTimeout(function() {
        chatWindow.stopFlashing();
      }, duration || MAX_FLASHING_DURATION);
    }

    function _notificateChatMessage(message, chatName) {
      var notification = new fin.desktop.Notification({
        url: 'openfin/modules/messageNotification/notification.html',
        timeout: 8000,
        message: {
          title: chatName + ' - Message from: ' + message.title,
          text: message.body,
          icon: message.icon
        }
      });
    }

    return {
      alertNewChatMessage: _alertNewChatMessage,
      notificateChatMessage: _notificateChatMessage,
      notifyTornChat: function(finWindow, chatId, playSound) {
        return _alertNewChatMessage(finWindow, chatId, true, playSound);
      },
      notifyMainChatWindow: function(finWindow) {
        return _alertNewChatMessage(finWindow, null, false, true);
      }
    };
  }

})();

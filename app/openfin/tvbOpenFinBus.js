(function () {
  'use strict';

  var tvbMessageListeners = [];

  window.addTvbMessageListener = function(listener) {
    if (tvbMessageListeners.indexOf(listener) === -1) {
      tvbMessageListeners.push(listener);
    }
  };

  window.removeTvbMessageListener = function(listener) {
    var index = tvbMessageListeners.indexOf(listener);
    if (index > -1) {
      tvbMessageListeners.splice(index, 1);
    }
  };

  window.receiveMessageFromTvb = function(message) {
    _.each(tvbMessageListeners, function (listener) {
      listener(message);
    })
  };

  /* This method should be defined for OpenFin Notifications to work */
  window.onNotificationMessage = function(message) {
    window.receiveMessageFromTvb(message);
  };

  window.sendMessageToApplication = function(message) {
    // for torn out windows
    if(window.receiveMessageFromPopup) {
      window.receiveMessageFromPopup(message);
      return;
    }

    // for notifications
    var notification = fin.desktop.Notification.getCurrent();
    if(notification && notification.sendMessageToApplication)
      notification.sendMessageToApplication(message);
  }
})();

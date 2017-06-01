function ChatNotificationMock() {}

ChatNotificationMock.start = function(windowId) {

  window.Notification = function(title, options) {
    window.opener.postMessage({
      type: 'msg_notification',
      messageData: {
        title: title,
        body: options.body,
        tag: options.tag,
        icon: options.icon,
        chatData: {
          uid: windowId
        }
      },
      windowId: windowId
    }, '*');
  };

  window.Notification.permission = 'granted';

  window.Notification.requestPermission = function() {
    return new Promise(function(resolve) {
      resolve('granted');
    });
  };

};

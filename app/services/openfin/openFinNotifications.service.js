(function() {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
    .factory('OpenFinNotifications',
      ['$rootScope', '$timeout', 'commonConstants', 'OpenfinMessage',
        'OpenfinPopupInitializer', OpenFinNotificationsService]);

  function OpenFinNotificationsService($rootScope, $timeout, constants,
                                       OpenfinMessage, OpenfinPopupInitializer) {

    function _handleIntercomMessage(message) {
      if(message.action === OpenfinMessage.ACTIONS.FROM_FIN.controlSignal) {
        $timeout(function() {
          $rootScope.$emit(constants.UI_EVENTS.connection_control_signal,
            {uid: message.uid}, 'OpenFin', message.data.signal);
        });
      }
      
      if(message.action === OpenfinMessage.ACTIONS.FROM_FIN.confirmInit) {
        OpenfinPopupInitializer.unregisterNotification(message.uid);
      }
    }

    function _showNotification(options) {
      var initialMessage = OpenfinMessage
        .create(OpenfinMessage.ACTIONS.TO_FIN.init, options.message.uid)
        .withData(options.message);

      function closeNotification() {
        OpenfinPopupInitializer.unregisterNotification(initialMessage.uid);
        _.isFunction(options.onClose) && options.onClose();
      }

      // onShow, onClick, onDismiss, onError handlers are also available
      var finOptions = {
        url: options.url,
        timeout: options.timeout || 15 * 1000,
        message: initialMessage,

        onClose: closeNotification,
        onDismiss: closeNotification,
        onError: closeNotification,

        onMessage: function(message) {
          _.isFunction(options.onMessage) && options.onMessage(message);
        }
      };

      if(options.onOpen && _.isFunction(options.onOpen)) {
        finOptions.onShow = options.onOpen;
      }

      var notification = new fin.desktop.Notification(finOptions);

      OpenfinPopupInitializer.registerNotification(initialMessage.uid,
        notification, initialMessage);
      
      return notification;
    }

    function _showHoot(hoot, options, onClose, onOpen) {
      return _showNotification({
        url: window.location.origin + "/openfin/popouts.html#/torn-hoot",
        message: options,
        onClose: onClose,
        onOpen: onOpen,
        onMessage: _handleIntercomMessage
      });
    }

    function _showRingdown(call, options, onClose, onOpen) {
      return _showNotification({
        url: window.location.origin + "/openfin/popouts.html#/torn-call",
        message: options,
        onClose: onClose,
        onOpen: onOpen,
        onMessage: _handleIntercomMessage
      });
    }

    return {
      showHoot: _showHoot,
      showRingdown: _showRingdown
    };

  }
})();

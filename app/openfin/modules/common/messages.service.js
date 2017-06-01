(function () {
  'use strict';
  angular.module("openFinIntegration")
    .service('MessageService', ['$window', 'OpenfinMessage', MessageService]);

  function MessageService($window, OpenfinMessage) {

    
    this.sendCloseAction = function() {
      $window.sendMessageToApplication(
        OpenfinMessage.createAnonymous(OpenfinMessage.ACTIONS.FROM_FIN.close));
    };

    this.sendInitConfirmation = function(uid) {
      $window.sendMessageToApplication(
        OpenfinMessage
          .create(OpenfinMessage.ACTIONS.FROM_FIN.confirmInit, uid)         
      );
    };
    
    this.sendSignalAction = function(uid, signal) {
      $window.sendMessageToApplication(
        OpenfinMessage
          .create(OpenfinMessage.ACTIONS.FROM_FIN.controlSignal, uid)
          .withSignal(signal)
      );
    };

    this.ACTIONS = OpenfinMessage.ACTIONS;
  }
})();
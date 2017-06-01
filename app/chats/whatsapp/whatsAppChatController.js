/**
 * Overloaded chat controller for WhatsApp
 * @param eventsBus Mediator
 * @param windowId String
 * @param tornChatsUids
 * @constructor
 */
function WhatsAppChatController(eventsBus, windowId, tornChatsUids) {
  ChatController.call(this, eventsBus, windowId, tornChatsUids);
}

(function() {

  WhatsAppChatController.prototype = _.defaults({

    constructor: WhatsAppChatController,

    /**
     * Creates common UI controller for chat
     * @returns {ChatUiController}
     */
    _createChatUiController: function (dataProvider) {
      return new WhatsAppChatUiController(dataProvider);
    },

    /**
     * Creates data provider (parser) for WhatsApp chat
     * @returns {ChatDataProvider}
     */
    _createDataProvider: function () {
      return new WhatsAppChatDataProvider();
    },

    /**
     * Handles event of window's readiness
     */
    _handleReadyEvent: function() {
      var self = this;
      this.uiController.addOverlay('Loading...', true);
      // when WhatsApp is opening it does some strange things with DOM first time,
      // may be reinitializing, so we just need to wait some time
      setTimeout(function () {
        self.uiController.activateAllContacts().then(function() {
          self.uiController.removeOverlay();
          ChatController.prototype._handleReadyEvent.call(self);
        });
      }, 2000);
    }

  }, ChatController.prototype);

})();
/**
 * Overloaded chat controller for AIM
 * @param eventsBus Mediator
 * @param windowId String
 * @constructor
 */
function AimChatController(eventsBus, windowId, tornChatsUids) {
  ChatController.call(this, eventsBus, windowId, tornChatsUids);
}

(function () {

  AimChatController.prototype = _.defaults({

    constructor: AimChatController,

    /**
     * Creates common UI controller for chat
     * @returns {ChatUiController}
     */
    _createChatUiController: function (dataProvider) {
      return new AimChatUiController(dataProvider);
    },

    /**
     * Creates data provider (parser) for WhatsApp chat
     * @returns {ChatDataProvider}
     */
    _createDataProvider: function () {
      return new AimChatDataProvider();
    }

  }, ChatController.prototype);

})();
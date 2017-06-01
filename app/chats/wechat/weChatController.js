/**
 * Overloaded chat controller for WeChat
 * @param eventsBus Mediator
 * @param windowId String
 * @constructor
 */
function WeChatController(eventsBus, windowId, tornChatsUids) {
  ChatController.call(this, eventsBus, windowId, tornChatsUids);
}

(function() {

  WeChatController.prototype = _.defaults({

    constructor: WeChatController,

    /**
     * Creates common UI controller for chat
     * @returns {ChatUiController}
     */
    _createChatUiController: function (dataProvider) {
      return new WeChatUiController(dataProvider);
    },

    /**
     * Creates data provider (parser) for WhatsApp chat
     * @returns {ChatDataProvider}
     */
    _createDataProvider: function () {
      return new WeChatDataProvider();
    }

  }, ChatController.prototype);

})();
/**
 * AIM chat UI controller
 * @constructor
 */
function AimChatUiController(dataProvider) {
  ChatUiController.call(this, dataProvider);
}

(function () {

  /**
   * @type {MutationObserver}
   */
  var minibarObserver = null;
  /**
   * @type {MutationObserver}
   */
  var chatsObserver = null;

  function _observeChat(chat) {
    var messagesContainer = chat.querySelector('.messaging-history');
    if (messagesContainer) {
      chatsObserver.observe(messagesContainer, {
        childList: true,
        characterData: true,
        subtree: true
      });
    } else {
      console.warn("No messages container was found for AIM chat", chat);
    }
  }


  AimChatUiController.prototype = _.defaults({

    constructor: AimChatUiController,

    initObservers: function () {
      var self = this;
      var minibar = document.querySelector('.client-container-secondarypanel');

      if (!minibar) {
        setTimeout(this.initObservers.bind(this), 500);
        return;
      }

      chatsObserver = new MutationObserver(function () {
        self.eventBus.publish(self.NEED_MESSAGE_PROCESSING_EVENT);
      });

      minibarObserver = new MutationObserver(function (data) {
        var activeChatData = self.dataProvider.getActiveChatData();
        if (!activeChatData) {
          return;
        }

        // TODO: implement popouts

        _.each(data, function (record) {
          _.each(record.addedNodes, function (node) {
            _observeChat(node);
          });
        });

      });

      minibarObserver.observe(minibar, {
        childList: true
      });

      self.eventBus.publish(self.READY_EVENT);

      self.failsafeHelper.init(document, 'AIM', function (domString) {
        self.dataProvider.publishChangedDom('aim', domString);
      });
    },

    /**
     * Makes chat active
     * @param {String} conversationId
     * @returns {Promise}
     */
    makeConversationActiveByName: function (conversationId) {
      // TODO
    },

    makeConversationActiveById: function (uid) {
      // TODO
    },

    /**
     * Puts text into message box
     * @param {String} messageText
     * @returns {Promise}
     */
    pasteMessage: function (messageText) {
      // TODO

      return Promise.resolve();
    },

    /**
     * Returns top wrapper of all conversations on chat page
     * @returns {NodeElement}
     */
    _getContactListNode: function () {
      return document.body;
    },

    /**
     * Initiates sending of message
     * @protected
     * @returns {Promise}
     */
    _initiateMessageSending: function () {
      // TODO

      return Promise.resolve();
    },

    injectPopoutButton: function () {
      // TODO
    }

  }, ChatUiController.prototype);

})();
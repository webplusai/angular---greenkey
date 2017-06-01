/**
 * WeChat UI controller
 * @constructor
 */
function WeChatUiController(dataProvider) {
  ChatUiController.call(this, dataProvider);
}

(function() {

  /**
   * @type {MutationObserver}
   */
  var contactListObserver = null;

  /**
   * @type {MutationObserver}
   */
  var messageListObserver = null;

  var CONTACT_LIST_OBSERVER_OPTIONS = {
    subtree: true,
    attributes: true,
    childList: true,
    characterData: true
  };

  var MESSAGE_LIST_OBSERVER_OPTIONS = {
    subtree: true,
    attributes: false,
    childList: true,
    characterData: false
  };

  function _makeChatActive(uid) {
    var allChats = weChatDocument.querySelectorAll('.chat_list .chat_item');
    _.each(allChats, function (chat) {
      var data = _getChatData(chat);
      if (data.id === uid) {
        chat.click();
        return false;
      }
    })
  }

  WeChatUiController.prototype = _.defaults({

    constructor: WeChatUiController,

    initObservers: function () {
      var self = this;
      var contactList = document.querySelector('.chat_list');
      var contacts = document.querySelectorAll('.chat_list .chat_item');
      if (!contactList || contacts.length === 0) {
        setTimeout(this.initObservers.bind(this), 500);
        return;
      }

      contactListObserver && contactListObserver.disconnect();
      contactListObserver = new MutationObserver(function () {
        var activeChatData = self.dataProvider.getActiveChatData();
        if (!activeChatData) {
          return;
        }

        self.injectPopoutButton();
        var unreadMsgData = self.dataProvider.getUnreadMessagesQty();
        if (unreadMsgData.length > 0) {
          self.eventBus.publish(self.GOT_UNREAD_MESSAGES_EVENT, unreadMsgData);
        }

        var messageList = self.dataProvider.getMessagesList();
        if (!messageList) {
          return;
        }

        if (messageListObserver) {
          messageListObserver.disconnect();
        }

        // when something in messages area changes
        messageListObserver = new MutationObserver(function () {
          self.eventBus.publish(self.NEED_MESSAGE_PROCESSING_EVENT);
        });
        messageListObserver.observe(messageList, MESSAGE_LIST_OBSERVER_OPTIONS);
      });

      contactListObserver.observe(contactList, CONTACT_LIST_OBSERVER_OPTIONS);

      self.eventBus.publish(self.READY_EVENT);

      this.failsafeHelper.init(document, 'WeChat', function (domString) {
        self.dataProvider.publishChangedDom('wechat', domString);
      });
    },

    /**
     * Makes chat active
     * @param {String} conversationId
     * @returns {Promise}
     */
    makeConversationActiveByName: function(conversationId) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var chat = _.find(document.querySelectorAll('.chat_list .chat_item'), function (chat) {
          var data = self.getChatData(chat);
          return data.name === conversationId;
        });

        if (chat) {
          self._triggerClickEvent(chat);
          setTimeout(resolve, 50);
        }

        setTimeout(reject, 1000);
      });
    },

    makeConversationActiveById: function(uid) {
      var self = this;
      var activeData = self.dataProvider.getActiveChatData();
      var success = false;

      if (activeData && uid === activeData.uid)
        return true;

      _.each(document.querySelectorAll('.chat_list .chat_item'), function (chat) {
        var chatData = self.dataProvider.getChatData(chat);
        if (chatData && uid === chatData.uid) {
          chat.click();
          success = true;
          return false;
        }
      });

      return success;
    },

    /**
     * Puts text into message box
     * @param {String} messageText
     * @returns {Promise}
     */
    pasteMessage: function(messageText) {
      var editArea = document.querySelector('#editArea');
      editArea.textContent = messageText;
      editArea.dispatchEvent(new Event('input'));

      return Promise.resolve();
    },

    /**
     * Returns top wrapper of all conversations on chat page
     * @returns {NodeElement}
     */
    _getContactListNode: function() {
      return document.body;
    },

    /**
     * Initiates sending of message
     * @protected
     * @returns {Promise}
     */
    _initiateMessageSending: function() {
      var sendBtn = document.querySelector('.btn_send');
      sendBtn.click();

      return Promise.resolve();
    }, 
    
    injectPopoutButton: function() {
      var self = this;
      var toolbar = document.querySelector('#chatArea #tool_bar');
      if (toolbar.querySelector('#gkt-popout-chat')) {
        return;
      }

      var popout = document.createElement('a');
      popout.setAttribute('id', 'gkt-popout-chat');
      popout.setAttribute('style', 'cursor: pointer');
      popout.textContent = 'Pop-out';
      popout.onclick = function () {
        self.eventBus.publish(self.POPOUT_BUTTON_CLICKED_EVENT);
      };

      toolbar.appendChild(popout);
    }

  }, ChatUiController.prototype);

})();
/**
 * WhatsApp UI controller
 * @constructor
 */
function WhatsAppChatUiController(dataProvider) {
  ChatUiController.call(this, dataProvider);
}

(function() {
  var unreadMsgHash = {};

  WhatsAppChatUiController.prototype = _.defaults({

    constructor: WhatsAppChatUiController,

    TIMEOUT_BETWEEN_CHATS_LOAD: 2000,

    _resetUnreadCount: function(uid) {
      try {
        var model = _.find(Store.Chat.models, function (model) {
          return model.id.replace(/[^\d]/g, '').startsWith(uid);
        });

        if (model) {
          model.unreadCount = 0;
        }
      } catch (error) {
        console.warn("Couldn't reset unread qty for ", uid, ', reason: ', error);
      }
    },

    /**
     * Makes chat active
     * @param {String} conversationId
     * @returns {Promise}
     */
    makeConversationActiveByName: function(conversationId) {
      var self = this;

      return new Promise(function(resolve, reject) {
        var searchInput = document.querySelector('.input.input-search');
        // activate search box
        self._triggerClickEvent(searchInput);
        // filter user's contacts
        self._triggerPasteTextEvent(searchInput, conversationId);

        // activate tab
        setTimeout(function() {
          var contactNode = document.querySelector('.chatlist .chat');
          self._triggerClickEvent(contactNode);
          setTimeout(resolve, 50);
        }, 50);

        setTimeout(reject, 1000);
      });
    },

    makeConversationActiveById: function(uid) {
      var self = this;
      var activeData = self.dataProvider.getActiveChatData();
      var success = false;

      if (activeData && uid === activeData.uid) {
        self._resetUnreadCount(uid);
        return true;
      }

      _.each(document.querySelectorAll(".chatlist .chat"), function (chat) {
        var chatData = self.dataProvider.getChatData(chat);
        if (chatData && uid === chatData.uid) {
          var clickEvent = document.createEvent('MouseEvents');
          clickEvent.initEvent("mousedown", true, true);
          chat.dispatchEvent(clickEvent);
          self._resetUnreadCount(uid);
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
      var self = this;

      return new Promise(function(resolve, reject) {
        var messageContainer = document.querySelector('.pane-footer div.input');
        self._triggerPasteTextEvent(messageContainer, messageText);
        setTimeout(function() {
          resolve();
        }, 50);
      });
    },

    _removeAllElements: function (elements) {
      _.each(elements, function (element) {
        element.remove();
      });
    },

    _removeAllDeleteOptions: function () {
      var elements = document.querySelectorAll('.dropdown li[data-reactid$="$delete"');
      this._removeAllElements(elements);
      elements = document.querySelectorAll('.dropdown li[data-reactid$="$clear"');
      this._removeAllElements(elements);
      elements = document.querySelectorAll('.btn-delete');
      this._removeAllElements(elements);
      elements = document.querySelectorAll('.btn-danger');
      this._removeAllElements(elements);
    },

    /**
     * Creates Mutation Observer for contact list node
     */
    initObservers: function() {
      var self = this;
      var contactList = document.body;
      if(contactList && contactList.nodeType) {
        var contactListObserver =
          new MutationObserver(function () {
            this._removeAllDeleteOptions();
            this._handleContactListUpdate();
          }.bind(this));
        contactListObserver.observe(contactList, {
          childList: true,
          characterData: true,
          subtree: true
        });
        
        this._checkForContacts();
        this._addHyperlinksListener();
      }

      this.failsafeHelper.init(document, 'WhatsApp', function (domString) {
        self.dataProvider.publishChangedDom('whatsapp', domString);
      });
    },

    _checkForContacts: function() {
      var contacts = document.querySelectorAll(".chatlist .chat");
      if (contacts && contacts.length > 0) {
        this.eventBus.publish(this.READY_EVENT);
        return;
      }

      setTimeout(this._checkForContacts.bind(this), 500);
    },

    /**
     * Handles event of contact list's update
     */
    _handleContactListUpdate: function() {
      this.eventBus.publish(this.NEED_MESSAGE_PROCESSING_EVENT);

      var activeChat = this.dataProvider.getActiveChatData();
      if( (this.activeChatData && !activeChat) ||
        (!this.activeChatData && activeChat) ||
        (this.activeChatData && activeChat && this.activeChatData.uid !== activeChat.uid)) {

        this.injectPopoutButton();
      }

      var unreadMsgData = this.dataProvider.getUnreadMessagesQty();

      if (unreadMsgData) {
        var unreadMsgs = [];
        var newUnreadMsgHash = {};

        _.each(unreadMsgData, function(msgData) {
          if (unreadMsgHash[msgData.uid] !== msgData.qty) {
            unreadMsgs.push(msgData);
          }
          newUnreadMsgHash[msgData.uid] = msgData.qty;
        });

        if (unreadMsgs.length > 0) {
          // Publish only what have changed.
          // TODO seems like unreadMsgs should be used here
          this.eventBus.publish(this.GOT_UNREAD_MESSAGES_EVENT, unreadMsgData);
        }

        unreadMsgHash = newUnreadMsgHash;
      }

      this.activeChatData = activeChat;
    },
    
    /**
     * Initiates sending of message
     * @protected
     * @returns {Promise}
     */
    _initiateMessageSending: function() {
      return new Promise(function(resolve, reject) {
        var sendButton = document.querySelector('.send-container');
        if(sendButton && sendButton.nodeType) {
          sendButton.click();
          resolve();
        } else {
          reject();
        }
      });
    }, 
    
    injectPopoutButton: function() {
      var self = this;
      var controls = document.querySelector(".pane-chat-controls .menu");
      if (!controls) return;
      if (controls.getElementsByClassName("menu-item gkt-popout").length > 0) return;

      var item = document.createElement("div");
      item.setAttribute("class", "menu-item gkt-popout");
      var textField = document.createElement("span");
      textField.innerText = "Pop-out";
      item.addEventListener('click', function() {
        self.eventBus.publish(self.POPOUT_BUTTON_CLICKED_EVENT);
      });
      item.appendChild(textField);
      controls.appendChild(item);
    }

  }, ChatUiController.prototype);

})();
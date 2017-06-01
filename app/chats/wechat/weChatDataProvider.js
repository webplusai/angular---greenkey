/**
 * Constructor for chat's data provider (also could be called "parser")
 * @constructor
 */
function WeChatDataProvider() {
  ChatDataProvider.call(this);
}

(function() {

  var lastDate = null;

  function isToday(date) {
    if (!(date instanceof moment)) {
      return false;
    }

    return date.isSame(moment(), 'day');
  }

  function getUserAccount() {
    var element = document.querySelector('.display_name');
    return element.textContent;
  }

  // the only way for now
  function isGroupName(name) {
    return name.includes(',');
  }

  function isMessageOutgoing(messageElement) {
    return /\bme\b/.test(messageElement.className);
  }

  function parseMessageText(messageElement) {
    var textElement = messageElement.querySelector('.js_message_plain');
    return textElement ? textElement.innerText : null;
  }

  function parseMessageDate(messageElement) {
    var dateElement = messageElement.querySelector('.message_system .content');
    if (!dateElement) {
      return null;
    }
    return moment(dateElement.innerHTML, 'H:mm', true);
  }

  function parseMessage(messageElement, interlocutor) {
    var messageText = parseMessageText(messageElement);

    // if we wasn't able to extract message - don't send to TVC
    if (!messageText)
      return;

    var isOutgoing = isMessageOutgoing(messageElement);
    var direction = isOutgoing ? 'outbound' : 'inbound';
    var messageDate = parseMessageDate(messageElement);
    if (messageDate != null) {
      lastDate = messageDate;
    } else {
      messageDate = lastDate;
    }

    return {
      content: messageText,
      subject: 'To be calculated...',
      messageDate: messageDate,
      direction: direction,
      isSentByMe: isOutgoing,
      interlocutor: interlocutor,
      chatAccount: getUserAccount(),
      participant: getParticipant(messageElement),
      isGroupMessage: isGroupName(interlocutor)
    };
  }

  function getContactId(chat) {
    var json = chat.getAttribute('data-cm');
    try {
      var data = JSON.parse(json);
      return data.username || null;
    } catch (e) {
      console.warn("Failed to parse active WeChat");
      return null;
    }
  }

  function findMessages(chatModel, interlocutor) {
    var messages = [];

    return new Promise(function (resolve) {
      _.each(chatModel.querySelectorAll('.message'), function (messageElement) {
        var message = parseMessage(messageElement, interlocutor);

        if (message && isToday(message.messageDate)) {
          messages.push(message);
        }
      });

      resolve(messages);
    });
  }

  function getParticipant(messageModel) {
    var nickname = messageModel.querySelector('.nickname');
    return nickname ? nickname.innerText : null;
  }

  WeChatDataProvider.prototype = _.defaults({

    constructor: WeChatDataProvider,

    getMessagesList: function () {
      return document.querySelector('#chatArea .chat_bd .chat_bd');
    },

    /**
     * @param chatElement DOM element with chat's description
     * @returns {{uid: string, name: string} | null}
     */
    getChatData: function (chatElement) {
      var nameElement = chatElement.querySelector('.nickname_text');
      var nameValue = nameElement ? nameElement.textContent : null;
      return {
        uid: getContactId(chatElement),
        name: nameValue,
        isGroup: isGroupName(nameValue)
      };
    },

    /**
     * @returns {{uid: string, name: string} | null}
     */
    getActiveChatData: function () {
      var activeChat = document.querySelector('.chat_list .chat_item.active');
      if (!activeChat) {
        return null;
      }
      return this.getChatData(activeChat);
    },

    getMessages: function() {
      var self = this;
      var activeChatModel = this.getActiveChatData();
      if (!activeChatModel) {
        return Promise.resolve([]);
      }

      return findMessages(this.getMessagesList(), activeChatModel.name)
        .then(function (messages) {
          // add chat account info to every message
          self._modifyMessage(messages, activeChatModel);
          return messages;
        });
    },

    _modifyMessage: function (messages, activeChatModel) {
      _.each(messages, function (message) {
        message.phone = activeChatModel.uid;
        message.uid = activeChatModel.uid;
        message.userName = activeChatModel.name;
        message.messageDate = message.messageDate.toISOString();
      });
    },

    _parseMessages: function() {
      var self = this;
      var activeChatModel = this.getActiveChatData();
      if (!activeChatModel) {
        return this._resetBusy()
      }

      findMessages(this.getMessagesList(), activeChatModel.name)
        .then(function(messages) {
          // add chat account info to every message
          if (messages.length) {
            self._modifyMessage(messages, activeChatModel);
            self._publishParsedMessages(messages);
          }

          self._resetBusy();
        })
        .catch(function(e) {
          self._resetBusy();
        })
    },

    /**
     * @inheritDoc
     */
    getUnreadMessagesQty: function () {
      var result = [];
      var contacts = document.querySelectorAll('.chat_list .chat_item');
      _.each(contacts, function (contact) {
        var unreadMarker = contact.querySelector('.web_wechat_reddot_middle') ||
          contact.querySelector('.web_wechat_reddot_bbig');
        if (unreadMarker) {
          result.push({
            uid: getContactId(contact),
            qty: unreadMarker.textContent
          });
        }
      });

      return result;
    }

  }, ChatDataProvider.prototype);

})();
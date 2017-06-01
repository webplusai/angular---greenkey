/**
 * Constructor for chat's data provider (also could be called "parser")
 * @constructor
 */
function AimChatDataProvider() {
  ChatDataProvider.call(this);
}

(function () {

  var possibleDateFormats = [
    'MMM D, YYYY h:mm a',
    'MMM D, h:mm a',
    'h:mm a'
  ];

  function isToday(date) {
    if (!(date instanceof moment)) {
      return false;
    }

    return date.isSame(moment(), 'day');
  }

  function parseDate(messageModel) {
    // example: Apr 10, 11:34 AM or 11:34 AM
    var messageDate = messageModel.querySelector('.message-header-timestamp');
    return messageDate ? moment(messageDate.title, possibleDateFormats, true) : moment();
  }

  function parseParticipant(messageModel) {
    var participant = messageModel.querySelector('.displayname');
    return participant ? participant.title : null;
  }

  function parseMessage(messageModel, activeChatData) {
    var textElement = messageModel.querySelector('.content');
    if (!textElement)
      return;

    var id = messageModel.getAttribute('id');
    var messageText = textElement.textContent;
    var isOutgoing = messageModel.classList.contains('mine');
    var direction = isOutgoing ? 'outbound' : 'inbound';
    var messageDate = parseDate(messageModel);
    var participant = parseParticipant(messageModel);
    var interlocutor = activeChatData.isGroup
      ? activeChatData.participants
      : combineNameAndId(activeChatData.name, activeChatData.uid);

    var chatAccount = getUserAccount();

    return {
      content: messageText,
      subject: id,
      messageDate: messageDate,
      direction: direction,
      isSentByMe: isOutgoing,
      participant: participant,
      interlocutor: interlocutor,
      userName: activeChatData.name,
      isGroupMessage: activeChatData.isGroup,
      chatAccount: chatAccount
    };
  }

  function getUserAccount() {
    var element = document.querySelector('.client-identityhovercard-info .screenname');
    return element.textContent + '@aol.com';
  }

  function findMessages(chatModel, activeChatData) {
    var messages = [];

    return new Promise(function (resolve) {
      _.each(chatModel.querySelectorAll('.messaging-message'), function (messageModel) {
        var message = parseMessage(messageModel, activeChatData);
        if (message && message.participant && isToday(message.messageDate)) {
          messages.push(message);
        }
      });

      resolve(messages);
    });
  }

  function combineNameAndId(name, uid) {
    return name + ' (' + uid + ')';
  }


  AimChatDataProvider.prototype = _.defaults({

    constructor: WeChatDataProvider,

    getMessagesList: function () {
      return document.querySelector('.active.message-box .messaging-history');
    },

    /**
     * @param chatElement DOM element with chat's description
     * @returns {{uid: string, name: string} | null}
     */
    getChatData: function (chatElement) {
      var name = chatElement.querySelector('.aimlist-item-name');
      if (!name) {
        // Name for group chats:
        name = chatElement.querySelector('.aimlist-item-name-block');
      }
      var members = document.querySelectorAll('.active.message-box .member .name');
      var participants = _.map(members, function (member) {
        return combineNameAndId(member.innerText, member.title);
      });
      return {
        uid: chatElement.title,
        name: name ? name.innerText : null,
        isGroup: participants.length > 0,
        participants: participants.join(', ')
      };
    },

    /**
     * @returns {{uid: string, name: string} | null}
     */
    getActiveChatData: function () {
      var activeChat = document.querySelector('.aimlist-item.selected');
      if (!activeChat) {
        return null;
      }
      return this.getChatData(activeChat);
    },

    getMessages: function () {
      var self = this;
      var activeChatModel = this.getActiveChatData();
      if (!activeChatModel) {
        return Promise.resolve([]);
      }

      return findMessages(this.getMessagesList(), activeChatModel.name)
        .then(function (messages) {
          self._modifyMessages(messages, activeChatModel);
          return messages;
        });
    },

    _modifyMessages: function (messages) {
      _.each(messages, function (message) {
        message.messageDate = message.messageDate.toISOString();
      });
    },

    _parseMessages: function () {
      var self = this;
      var activeChatModel = this.getActiveChatData();

      if (!activeChatModel) {
        return this._resetBusy()
      }

      findMessages(this.getMessagesList(), activeChatModel)
        .then(function (messages) {
          if (messages.length) {
            self._modifyMessages(messages);
            self._publishParsedMessages(messages);
          }

          self._resetBusy();
        })
        .catch(function (e) {
          self._resetBusy();
        });
    },

    /**
     * @inheritDoc
     */
    getUnreadMessagesQty: function () {
      // TODO
      return [];
    }

  }, ChatDataProvider.prototype);

})();
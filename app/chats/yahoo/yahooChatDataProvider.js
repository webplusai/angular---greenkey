/**
 * Constructor for chat's data provider (also could be called "parser")
 * @constructor
 */
function YahooChatDataProvider(options) {
  ChatDataProvider.call(this);
  this.options = options;
}

(function() {
  'use strict';

  var USERS_SELECTOR = '.groups-and-users a.default-group';
  var GROUPS_AND_USERS_SELECTOR = '.groups-and-users a.list-item';
  var ACTIVE_CONVERSATION_SELECTOR = '.groups-and-users a.active-group';

  var DOM_WAITING_TIMEOUT = 200;
  var userAccount = null;
  var lastChatActive = null;
  var lastParticipants = [];

  function _clickButton(selector) {
    var button = document.querySelector(selector);
    return new Promise(function (resolve, reject) {
      if (!button) {
        return reject('Unable to get button by selector:', selector);
      }
      button.click();
      setTimeout(resolve, DOM_WAITING_TIMEOUT);
    });
  }

  function _openChatSettings() {
    return _clickButton('.group-settings.open-btn');
  }

  function _getParticipants() {
    return document.querySelectorAll('.ci-group-members .list-item .list-item-title');
  }

  function _tryToSaveParticipants() {
    lastParticipants = _.map(_getParticipants(), function (participant) {
      return participant.innerText === userAccount.name
        ? userAccount.name + ' (' + userAccount.email + ')'
        : participant.innerText;
    });
  }

  function _closeChatSettings() {
    return _clickButton('.group-settings.close-btn');
  }

  function _updateLastParticipants() {
    return _openChatSettings()
      .then(function () {
        _tryToSaveParticipants();
        _closeChatSettings();
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  function _composeInterlocutorName(activeChatName) {
    if (lastParticipants.length > 0) {
      return lastParticipants.join(', ');
    }
    return activeChatName;
  }

  function _isToday(date) {
    if (!(date instanceof moment)) {
      return false;
    }

    return date.isSame(moment(), 'day');
  }

  function _parseDate(dateString) {
    var datePatterns = ['DD.MM.YYYY, H:mm', 'MM.DD.YYYY, H:mm', 'YYYY.MM.DD, H:mm'];
    var parsedDate = moment(dateString, datePatterns);
    return (parsedDate.isValid() ? parsedDate : moment(new Date())).toISOString();
  }

  function _getParticipant(message) {
    var parent = message.parentElement.parentElement.parentElement;
    return parent.querySelector('.user-name').title;
  }

  function _prepareMessage(interlocutorName, message, activeChatData) {
    var textNode = message.querySelector('span.pre-wrap');
    if (!textNode) {
      return null;
    }

    var date = _parseDate(message.title);
    var isOutgoing = Boolean(message.classList.contains('my-message'));
    var participant = _getParticipant(message);
    var text = textNode.innerHTML; // innerText is null somehow

    return {
      content: text,
      subject: 'to be composed later in service',
      messageDate: date,
      isSentByMe: isOutgoing,
      chatAccount: userAccount.email,
      participant: participant,
      interlocutor: interlocutorName,
      userName: activeChatData.name,
      isGroupMessage: activeChatData.isGroup
    };
  }

  function _removeTrashIcons() {
    var icons = document.querySelectorAll('.action-unsend');

    _.each(icons, function(icon) {
      icon.remove();
    });
  }

  function _getAllMessages() {
    return document.querySelectorAll('.message-bubble');
  }

  function _updateUserAccount() {
    return new Promise(function (resolve) {
      if (userAccount) {
        return resolve(userAccount);
      }

      _clickButton('.top-bar-user-settings')
        .then(function () {
          var firstName = document.querySelector('.ci-settings-basic .given-name').value;
          var lastName = document.querySelector('.ci-settings-basic .family-name').value;
          var email = document.querySelector('.account-name span:nth-child(2)').innerHTML;

          userAccount = {
            name: firstName + ' ' + lastName,
            email: email
          };

          _clickButton('.top-bar-user-settings');
          resolve(userAccount);
        });
    });
  }

  /**
   * @param element
   * @returns {null|String}
   */
  function _getContactId(element) {
    var href = element.getAttribute('href');
    if(!href) {
      return null;
    }

    href = href.split('/');
    return href.pop();
  }

  function getChatDataFromHeader() {
    var nameElement = document.querySelector('.col2 .header .page-header-name');
    var uid = '';
    var link = document.querySelector('.col2 .header a.group-settings');
    if(link) {
      var href = link.getAttribute('href');
      if(href) {
        href = href.split('/');
        href.pop();
        uid = href.pop();
      }
    }

    return {
      name: nameElement ? nameElement.textContent : '',
      uid: uid
    }
  }

  function getLastMessageTime(contact) {
    var timeLabel = contact.querySelector('.list-item-timestamp');
    var time = _parseDate(timeLabel && timeLabel.nodeType ? timeLabel.title : '');
    return time;
  }

  function getLastMessageText(contact) {
    var lastMessage = _.last(contact.querySelectorAll('.list-item-message'));
    if (lastMessage) {
      return lastMessage.innerText;
    }

    return '';
  }

  function markKnownMessages(contact) {
    if (!contact) {
      contact = document.querySelector(ACTIVE_CONVERSATION_SELECTOR);
    }

    var contactId = _getContactId(contact);
    if (!contactId) {
      return;
    }

    var markKey = 'last_message' + contactId;
    localStorage.setItem(markKey, JSON.stringify({
      text: getLastMessageText(contact),
      time: getLastMessageTime(contact)
    }));
  }

  function newMessagesExist(contact) {
    var contactId = _getContactId(contact);
    if (!contactId) {
      return false;
    }

    var markKey = 'last_message' + contactId;
    var serializedData = localStorage.getItem(markKey);
    if (serializedData) {
      try {
        var lastMessageData = JSON.parse(serializedData);
        return !lastMessageData ||
          lastMessageData.time !== getLastMessageTime(contact) ||
          lastMessageData.text !== getLastMessageText(contact);
      } catch (error) {
        return true;
      }
    }

    return true;
  }

  YahooChatDataProvider.prototype = _.defaults({
    constructor: YahooChatDataProvider,

    getActiveChatData: function() {
      var chatData = this.getChatData(
        document.querySelector(ACTIVE_CONVERSATION_SELECTOR));

      if(!chatData) {
        chatData = {};
      }

      if(!chatData.name || !chatData.uid) {
        var altChatData = getChatDataFromHeader();
        chatData.name = chatData.name || altChatData.name;
        chatData.uid = chatData.uid || altChatData.uid;
      }

      return chatData;
    },

    getChatData: function(element) {
      if(!element)
        return null;

      return {
        uid: _getContactId(element),
        name: element.getAttribute('title'),
        isGroup: element.classList.contains('normal-group')
      };
    },

    getMessages: function() {
      var activeData = this.getActiveChatData();
      if (!activeData) {
        return Promise.reject();
      }

      return Promise.resolve(_.map(_getAllMessages(), function(msg) {
        return _prepareMessage(activeData.name, msg, activeData);
      }));
    },

    _parseMessages: function() {
      var self = this;

      function process() {
        var interlocutorName = _composeInterlocutorName(activeChatData.name);
        if(!interlocutorName)
          return self._resetBusy();

        if(allMessages.length === 0)
          return self._resetBusy();

        var newMessageData = [];
        _.each(allMessages, function(msg) {
          var message = _prepareMessage(interlocutorName, msg, activeChatData);
          if (message && _isToday(moment(message.messageDate))) {
            newMessageData.push(message);
          }
        });

        markKnownMessages();

        if (newMessageData.length === 0)
          return self._resetBusy();

        self._publishParsedMessages(newMessageData);
        self._resetBusy();
      }

      var activeChatData = this.getActiveChatData();
      if(!activeChatData)
        return this._resetBusy();

      _removeTrashIcons();

      var allMessages = _getAllMessages();

      if (!lastChatActive || lastChatActive !== activeChatData.uid) {
        lastChatActive = activeChatData.uid;
        _updateLastParticipants().then(process);
      } else {
        process();
      }
    },

    getDirectUnreadMessagesQty: function() {
      var result = [];
      var contacts = document.querySelectorAll(
        GROUPS_AND_USERS_SELECTOR);

      _.each(contacts, function(contact) {
        var unreadMarker = contact.querySelector('.list-item-unread-indicator');
        if(!unreadMarker || !newMessagesExist(contact))
          return;

        markKnownMessages(contact);
        result.push({
          uid: _getContactId(contact),
          qty: null
        })
      });

      return result;
    },

    getUnreadMessagesQty: function() {
      var _this = this;
      return new Promise(function (resolve, reject) {
        setTimeout(function() {
          resolve(_this.getDirectUnreadMessagesQty());
        }, 1000);
      });
    },

    // Not defined in the interface
    _getUserAccount: _updateUserAccount,

    _getChats: function(contactsOnly) {
      var self = this;

      return new Promise(function(resolve, reject) {
        function checkContactsReadiness() {
          var groups = document.querySelectorAll(
            contactsOnly ? USERS_SELECTOR : GROUPS_AND_USERS_SELECTOR
          );
          if (groups.length > 0) {
            return resolve(_.map(groups, function(group) {
              return self.getChatData(group);
            }));
          }

          setTimeout(checkContactsReadiness, 1000);
        }

        checkContactsReadiness();
        setTimeout(reject, 300000);
      });
    }

  }, ChatDataProvider.prototype);

})();

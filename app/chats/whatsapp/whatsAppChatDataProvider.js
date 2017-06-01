/**
 * Constructor for chat's data provider (also could be called "parser")
 * @constructor
 */
function WhatsAppChatDataProvider() {
  ChatDataProvider.call(this);
  this.chatAccount = this._getMyPhone();
}

(function() {

  var messageParsers = {
    // text message
    'chat': function (model) {
      return Promise.resolve(model.body || '');
    },
    // audio message
    'ptt': function (model) {
      return getDecriptedBinaryData(model).then(function(binaryData) {
        return Promise.resolve(binaryData);
      });
    },
    // pictures
    'image': function(model) {
      return getDecriptedBinaryData(model).then(function(binaryData) {
        return Promise.resolve({
          data: binaryData,
          caption: model.caption
        });
      });
    }
  };

  function getDecriptedBinaryData(model) {
    return new Promise(function(resolve, reject) {
      var stopCheck = false;

      function checkReadiness() {
        if (model.mediaState === 'media_resolved' && model.url) {
          stopCheck = true;
          getBinaryData(model.url)
            .then(function(binaryData) {
              resolve(binaryData);
            })
            .catch(reject);
        }
        !stopCheck && setTimeout(checkReadiness, 50);
      }

      checkReadiness();
      setTimeout(function() {
        stopCheck = true;
        reject();
      }, 500);
    });
  }

  function isToday(date) {
    if (!(date instanceof moment)) {
      return false;
    }

    return date.isSame(moment(), 'day');
  }

  function getFullContactName(contactModel) {
    var name = contactModel.name || contactModel.formattedName || 'N/A';

    var phone = (contactModel.id || '').replace(/\D/g, '');
    if (phone) {
      name += ' (' + phone + ')';
    }

    return name;
  }

  function composeInterlocutor(chatModel) {
    return new Promise(function (resolve) {
      function tryToGetInterlocutor() {
        if (!chatModel.isGroup) {
          return resolve(getFullContactName(chatModel));
        }

        // participants except me
        var participants = _.filter(chatModel.groupMetadata.participants.models, function (model) {
          return !model.contact.isMe;
        });

        var interlocutors = _.map(participants, function (participantModel) {
          return getFullContactName(participantModel.contact);
        });

        var interlocutor = interlocutors.join(', ');
        if (interlocutor) {
          return resolve(interlocutor);
        }

        setTimeout(tryToGetInterlocutor, 200);
      }

      tryToGetInterlocutor();
    });
  }

  function getParticipant(messageModel) {
    try {
      if (messageModel.chat.isGroup && messageModel.participant) {
        var participantModels = messageModel.chat.groupMetadata.participants.models;
        var participant = _.find(participantModels, function (participantModel) {
          return participantModel.id === messageModel.participant;
        });
        if (participant) {
          return getFullContactName(participant.contact);
        }
      }

    } catch (error) {}
  }

  function parseMessage(messageModel, interlocutor) {
    var messageParser = messageParsers[messageModel.type],
        self = this;

    return new Promise(function (resolve, reject) {
      if (!messageParser) {
        reject('unknown type of message');
        return;
      }

      messageParser.call(self, messageModel)
        .then(function (messageText) {
          var messageDate = messageModel.t * 1000,
              direction = messageModel.isSentByMe ? 'outbound' : 'inbound',
              postfix = messageModel.filehash ? messageModel.filehash : messageText,
              subject = md5(direction + messageDate + postfix),
              participant = getParticipant(messageModel);

          resolve({
            content: messageText,
            subject: subject,
            messageDate: messageDate,
            type: messageModel.type,
            sortOrder: messageModel.t,
            isSentByMe: messageModel.isSentByMe,
            isGroupMessage: messageModel.chat.isGroup,
            participant: participant ? participant : interlocutor,
            interlocutor: interlocutor
          });
        })
        .catch(function (error) {
          reject(error);
        });
    });
  }

  function findMessages(chatModel) {
    var messages = [],
      messagesInQueue = chatModel.msgs.length;

    return new Promise(function (resolve) {
      function handleMessageParseCompletion() {
        messagesInQueue--;
        messagesInQueue < 1 && resolve(messages.sort(function (first, second) {
          return first.sortOrder - second.sortOrder;
        }));
      }

      composeInterlocutor(chatModel).then(function (interlocutor) {
        // instant resolve if there are no items in message collection
        if (messagesInQueue === 0) {
          resolve(messages);
          return;
        }

        _.each(chatModel.msgs.models, function (messageModel) {
          parseMessage(messageModel, interlocutor)
            .then(function (message) {
              if (message && isToday(moment(message.messageDate))) {
                messages.push(message);
              }
              handleMessageParseCompletion();
            })
            .catch(handleMessageParseCompletion);
        });
      });
    });
  }

  function getActiveChatModel() {
    try {
      return _.find(Store.Chat.models, function (model) {
        return model.active;
      });

    } catch (error) {
      return null;
    }
  }


  WhatsAppChatDataProvider.prototype = _.defaults({

    constructor: WhatsAppChatDataProvider,

    /**
     * @param chatElement DOM element with chat's description
     * @returns {{uid: string, name: string, avatar: string}}
     */
    getChatData: function(chatElement) {
      var result = {
        uid: '',
        name: '',
        avatar: '',
        isGroup: false
      };

      if(!chatElement)
        return result;

      var name = chatElement.querySelector('.chat-title span');
      var activeModel = _.find(Store.Chat.models, {active: true});

      result.uid = this._parsePhoneFromReactId(chatElement);
      result.name = name ? name.textContent : "";
      result.avatar = this.getAvatarUrl(chatElement);
      result.isGroup = activeModel ? activeModel.isGroup : false;

      return result;
    },

    /**
     * @returns {{uid: string, name: string, avatar: string} | null}
     */
    getActiveChatData: function () {
      var activeChat = document.querySelector(".chatlist .active.chat");
      var activeChatData = this.getChatData(activeChat);

      if (activeChatData && activeChatData.uid) {
        return activeChatData;
      }

      var activeModel = _.find(Store.Chat.models, {active: true});
      if (!activeModel) {
        return activeChatData;
      }

      var phone = (activeModel.id || '').replace(/\D/g, '');
      if (!phone) {
        return activeChatData;
      }

      return {
        uid: phone,
        name: activeModel.name || activeModel.formattedTitle || phone,
        avatar: '',
        isGroup: activeModel ? activeModel.isGroup : false
      };
    },

    _parsePhoneFromReactId: function (element) {
      var reactId = element.getAttribute("data-reactid");
      if (!reactId) {
        return '';
      }

      var phoneInstances = reactId.match(/\$[\d|-]+@/);
      if (_.isArray(phoneInstances) && phoneInstances.length > 0) {
        return phoneInstances.pop().replace(/\$|@|-/g, '');
      }
      return "";
    },

    getMessages: function() {
      var activeChatModel = getActiveChatModel();
      if (!activeChatModel) {
        return Promise.resolve([]);
      }
      
      return findMessages(activeChatModel);
    },

    getUnreadMessagesQty: function() {
      var result = [];
      var self = this;
      var activeData = self.getActiveChatData();

      var unreadChats = document.querySelectorAll('.unread.chat');
      _.each(unreadChats, function (chat) {
        var nameElt = chat.querySelector('.chat-title span');
        var chatUid = self._parsePhoneFromReactId(nameElt);
        if (chatUid === activeData.uid) {
          self.eventBus.publish(self.NEED_UNREAD_MESSAGES_RESET_EVENT, chatUid);
          return;
        }

        var unreadQtyElt = chat.querySelector('.chat-meta span.unread-count');
        if (!unreadQtyElt)
          return;

        var unreadQty = (unreadQtyElt.textContent || unreadQtyElt.innerHTML) * 1;
        if (unreadQty > 0) {
          result.push({
            uid: chatUid,
            qty: unreadQty
          });
        }
      });

      return result;
    },

    getAvatarUrl: function (contactNode) {
      var img = contactNode.querySelector('.avatar img');
      return img ? img.src : null;
    },

    _getMyPhone: function() {
      var myContactModel = _.find(Store.Contact.models, function (contactModel) {
        return contactModel.isMe;
      });

      return myContactModel.id.split('@')[0];
    },
    
    _parseMessages: function() {
      var activeChatModel = getActiveChatModel();
      if (!activeChatModel) {
        return this._resetBusy()
      }

      var self = this;
      var userData = self.getActiveChatData();
      findMessages(activeChatModel)
        .then(function(messages) {
          // add WhatsApp account info to every message
          if (messages.length) {
            _.each(messages, function(message) {
              message.phone = userData.uid;
              message.chatAccount = self.chatAccount;
              message.uid = userData.uid;
              message.userName = userData.name;
            });
            self._publishParsedMessages(messages);
          }

          self._resetBusy();
        })
        .catch(function() {
          self._resetBusy();
        })
    },

    _getChats: function(contactsOnly) {
      var chats = [];

      _.each(Store.Chat.models, function(chatModel) {
        if (contactsOnly && !chatModel.isUser) {
          return;
        }

        var uid = (chatModel.contact.id || '').replace(/\D/g, '');
        chats.push({
          uid: uid,
          name: chatModel.contact.name || chatModel.contact.formattedName || uid
        });
      });

      return Promise.resolve(chats);
    }

  }, ChatDataProvider.prototype);

})();
(function (moment) {
  'use strict';

  angular.module('gkt.voiceBox.openFin').service('WhatsAppService', [
    'commonConstants',
    'TVC',
    'BinaryDataHelpersService',
    'ExternalChatBaseController',
    WhatsAppService
  ]);

  function WhatsAppService(constants,
                           TVC,
                           BinaryDataHelpers,
                           ExternalChatBaseController) {

    var WINDOW_OPTIONS = {
      url: "https://web.whatsapp.com/",
      name: "GKTWhatsAppChat",
      minWidth: 700,
      minHeight: 500
    };

    var NAME_OF_BLACKLISTED_PERSON = 'Unknown Person';

    /**
     * Chat controller for a WhatsApp caht
     * @class
     * @augments ExternalChatCtrl
     * @constructor
     */
    function WhatsAppChatController() {
      ExternalChatBaseController.call(this);
    }

    WhatsAppChatController.prototype = Object.create(
      ExternalChatBaseController.prototype);
    WhatsAppChatController.prototype.constructor = WhatsAppChatController;

    WhatsAppChatController.prototype.getEnabledConfigPropName = function () {
      return "net.java.sip.communicator.tvb.chat.protocol.WhatsApp.ENABLED";
    };

    WhatsAppChatController.prototype.getChatNetworkId = function () {
      return constants.GKT.CHAT_NETWORKS.whatsapp;
    };

    WhatsAppChatController.prototype.getChatNetworkName = function () {
      return "WhatsApp";
    };

    /**
     * @inheritDoc
     */
    WhatsAppChatController.prototype._subscribeOnChatEvents = function () {
      ExternalChatBaseController.prototype._subscribeOnChatEvents.call(this);

      var self = this;
      self.eventBus.remove('popout_clicked');
      self.eventBus.subscribe('popout_clicked', function (data) {
        var messages = self.fillImagesFromMessages(data);
        prepareMessagesForPoppedOutChat(messages).then(function(preparedMessages) {
          self.tearChatOut(data.chatData, preparedMessages, false);
        });
      });
    };

    WhatsAppChatController.prototype.getImageDataFromPlainMsg = function (msg) {
      var imgMsg = _.find(this.loggedMessages, {subject: msg.subject});
      if (!msg) {
        return {};
      }

      imgMsg.isSentByMe = msg.isSentByMe;
      imgMsg.type = msg.type;
      imgMsg.messageDate = msg.messageDate;
      imgMsg.participant = msg.participant || (msg.from ? msg.from.id : '');
      return imgMsg;
    };

    WhatsAppChatController.prototype.fillImagesFromMessages = function (data) {
      var self = this;
      var messages = _.map(data.messages, function (msg) {
        if (msg.type === 'image') {
          return self.getImageDataFromPlainMsg(msg);
        } else {
          return msg;
        }
      });

      return messages;
    };

    /**
     * @inheritDoc
     */
    WhatsAppChatController.prototype.handleMessages =
      function (messages, chatData) {
        var self = this;
        var totalQty = messages.length;
        var processedQty = 0;
        if (totalQty === 0)
          return Promise.resolve();

        var phone, conversationId,
          isConversationPartnerBlacklisted = false;

        self.notifyTornChatAboutMsgs(messages, chatData);

        return new Promise(function (resolve) {

          function handleMessageLoggingCompletion() {
            if (++processedQty === totalQty) {
              resolve(self.loggedMessages);
            }
          }

          _.forEach(messages, function (message) {
            if (phone !== message.phone) {
              phone = message.phone;
              isConversationPartnerBlacklisted = !self.loggingManager.isLoggingAllowed(phone);
              // phone = contact's id
              conversationId = md5(phone + self.gktUserName);
            }

            self.prepareMessageForLogging(message, isConversationPartnerBlacklisted)
              .then(function () {
                var loggingParameters = self.prepareLoggingParameters(message,
                  isConversationPartnerBlacklisted, conversationId);

                TVC.logChatMessage(loggingParameters)
                  .then(function () {
                    self.loggedMessages.push(message);
                    handleMessageLoggingCompletion();
                  })
                  .catch(function (error) {
                    handleMessageLoggingCompletion();
                  });
              })
              .catch(handleMessageLoggingCompletion);
          });

        });
      };

    WhatsAppChatController.prototype.prepareMessageForLogging =
      function (message, isConversationPartnerBlacklisted) {

        var myName = this.prepareMyName(message);

        var conversationPartner = isConversationPartnerBlacklisted
          ? NAME_OF_BLACKLISTED_PERSON
          : prepareConversationPartner(message, myName);

        if (message.isSentByMe) {
          message.from = myName;
          message.to = conversationPartner;
        } else {
          if (message.isGroupMessage) {
            message.from = message.participant;
            message.to = conversationPartner;
          } else {
            message.from = conversationPartner;
            message.to = myName;
          }
        }

        // it needs to restore sate object after serialization
        if (!(message.messageDate instanceof moment)) {
          message.messageDate = moment(message.messageDate);
        }

        if (message.type === 'ptt') {
          return uploadBinaryData(message.content).then(function (fileUrl) {
            return new Promise(function (resolve) {
              message.content = 'Voice message: ' + fileUrl;
              resolve(message);
            });
          });
        }

        if (message.type === 'image') {
          return uploadBinaryData(message.content.data).then(function (fileUrl) {
            return new Promise(function (resolve) {
              message.attachmentUrl = fileUrl;
              message.attachmentCaption = message.content.caption;
              message.content = [message.attachmentCaption || 'Image', fileUrl].join(': ');
              resolve(message);
            });
          });
        }

        return Promise.resolve(message);
      };

    WhatsAppChatController.prototype.prepareMyName = function (message) {
      return combineNameAndPhone(this.gktUserName, message.chatAccount);
    };

    WhatsAppChatController.prototype.prepareLoggingParameters =
      function (message, isConversationPartnerBlacklisted, conversationId) {
        var self = this;
        var fromUserUid = '';
        var toUserUid = '';

        if (message.isSentByMe) {
          fromUserUid = self.gktId;
        } else {
          toUserUid = self.gktId;
        }

        return {
          messageText: message.content,
          toUser: message.to,
          fromUser: message.from,
          toUserUid: toUserUid,
          fromUserUid: fromUserUid,
          subject: message.subject,
          messageDate: message.messageDate,
          network: 'WhatsApp',
          userIsBlacklisted: isConversationPartnerBlacklisted,
          conversationId: conversationId,
          gktUserName: self.gktUserName,
          gktUserId: self.gktId,
          chatAccount: message.chatAccount,
          type: message.type || 'text',
          attachmentCaption: message.attachmentCaption,
          attachmentUrl: message.attachmentUrl
        };
      };

    WhatsAppChatController.prototype.sendMessagesToPoppedOutChat =
      function (chatUid, messages) {
        var self = this;
        prepareMessagesForPoppedOutChat(messages).then(function(preparedMessages) {
          self.tornChatCtrl.sendNewMessages(chatUid, preparedMessages);
        });
      };

    WhatsAppChatController.prototype.restorePopouts = 
      function(data) {
        var self = this;
        var preparingPromise = Promise.resolve();

        _.each(data, function(popoutData) {
          preparingPromise = preparingPromise
            .then(function() {
              return prepareMessagesForPoppedOutChat(popoutData.messages)
                .then(function(preparedMessages) {
                  popoutData.messages = preparedMessages;
                });
            })
            .catch(Promise.resolve);
        });

        preparingPromise.then(function() {
          ExternalChatBaseController.prototype.restorePopouts.call(self, data);
        });
      };


    function prepareMessagesForPoppedOutChat(messages) {
      var preparedMessages = [];
      var preparingPromise = Promise.resolve();

      _.each(messages, function(message) {
        preparingPromise = preparingPromise
          .then(function() {
            return prepareMessageForPoppedOutChat(message)
              .then(function(preparedMessage) {
                preparedMessages.push(preparedMessage);
              });
          })
          // just skip a message if it can't be prepared for torn chat
          .catch(Promise.resolve);
      });

      return preparingPromise.then(function() {
        return Promise.resolve(preparedMessages);
      })
    }

    function prepareMessageForPoppedOutChat(message) {
      return new Promise(function(resolve, reject) {
        if (message.type !== 'image') {
          return resolve(message);
        }

        // just logged messages have format
        if (_.isObject(message.content) && message.content.data instanceof Blob) {
          var imageUrl = window.URL.createObjectURL(message.content.data);
          return resolve(_.assign({}, message, {
            decodedUrl: imageUrl,
            attachmentCaption: message.content.caption
          }));
        }

        TVC.getDirectUrlForUploadedFile(message.attachmentUrl || message.content)
          .then(function(imageUrl) {
            resolve(_.assign({}, message, {
              decodedUrl: imageUrl
            }));
          })
          .catch(reject);
      });
    }

    function prepareConversationPartner(message, myName) {
      if (message.isGroupMessage) {
        // message.userName = a name of the group
        // message.interlocutor = a string containing sorted list of user's conversation partners
        return message.userName + ' (' + message.interlocutor + ', ' + myName + ')';
      }
      return combineNameAndPhone(message.userName, message.uid);
    }

    function combineNameAndPhone(name, phone) {
      return name + ' (' + phone + ')';
    }

    function uploadBinaryData(source) {
      return BinaryDataHelpers.getBinaryData(source).then(function (binaryData) {
        return BinaryDataHelpers.uploadFileToS3(binaryData);
      });
    }

    var chatController = new WhatsAppChatController();

    return {
      openChatWindow: function () {
        chatController.handleChatOpeningRequest(WINDOW_OPTIONS);
      }
    };
  }
})(moment);

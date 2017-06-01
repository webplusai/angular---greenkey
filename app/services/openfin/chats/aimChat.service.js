(function () {
  'use strict';

  angular.module('gkt.voiceBox.openFin').service('AimChatService', [
    'OpenFin',
    'commonConstants',
    'ChatMessageIdService',
    'ExternalChatBaseController',
    WeChatService
  ]);

  function WeChatService(OpenFin, constants, ChatMessageIdService, ExternalChatBaseController) {

    var WINDOW_OPTIONS = {
      url: "https://www.aim.com/popup",
      name: "GKTAimChat"
    };

    /**
     * Chat controller for a AIM
     * @class
     * @augments ExternalChatCtrl
     * @constructor
     */
    function AimChatController() {
      ExternalChatBaseController.call(this);
      /**
       * Chat message ID generator
       * @type {ChatMessageIdService}
       */
      this.chatMessageId = new ChatMessageIdService();
    }

    AimChatController.prototype = Object.create(
      ExternalChatBaseController.prototype);
    AimChatController.prototype.constructor = AimChatController;

    AimChatController.prototype.getEnabledConfigPropName = function () {
      return "net.java.sip.communicator.tvb.chat.protocol.AIM.ENABLED";
    };

    AimChatController.prototype.getChatNetworkId = function () {
      return constants.GKT.CHAT_NETWORKS.aim;
    };

    AimChatController.prototype.getChatNetworkName = function () {
      return "AIM";
    };

    /**
     * @inheritDoc
     */
    AimChatController.prototype.openChatWindow = function (windowOptions) {
      return OpenFin.openWindowWithPreloader(_.assign({}, windowOptions), 3000);
    };

    AimChatController.prototype.prepareConversationPartner = function (message) {
      if (message.isGroupMessage) {
        // message.userName = a name of the group
        // message.interlocutor = a string containing sorted list of user's conversation partners
        return message.userName + ' (' + message.interlocutor + ')';
      }
      return message.interlocutor;
    };

    AimChatController.prototype.prepareMyName = function (message) {
      return this.gktUserName + ' (' + message.chatAccount + ')';
    };

    /**
     * @inheritDoc
     */
    AimChatController.prototype.prepareMessages = function (messages) {
      var self = this;
      self.chatMessageId.reset();
      _.each(messages, function (message) {
        var myName = self.prepareMyName(message);
        var conversationPartner = self.prepareConversationPartner(message);
        var fromUser, toUser;

        if (message.isSentByMe) {
          fromUser = myName;
          toUser = conversationPartner;
        } else {
          if (message.isGroupMessage) {
            fromUser = message.participant;
            toUser = conversationPartner;
          } else {
            fromUser = conversationPartner;
            toUser = myName;
          }
        }

        var messageDate = moment(message.messageDate);
        var subject = self.chatMessageId.getNext(
          fromUser, toUser, messageDate, message.content);

        message.messageDate = messageDate;
        message.subject = subject;
        message.fromUser = fromUser;
        message.toUser = toUser;
      });
    };

    var chatController = new AimChatController();

    return {
      openChatWindow: function () {
        // if chat loads some of its resources for a long time
        // it prevents OpenFin from calling the window's "success" callback
        // and if we close the window before its callback being called
        // we won't be able to create a window with the same name and a callback
        // so we add a random number into a window's name
        var rnd = Math.round(Math.random() * 10000);
        var options = _.assign(_.clone(WINDOW_OPTIONS), {
          name: WINDOW_OPTIONS.name + " (" + rnd + ")"
        });

        chatController.handleChatOpeningRequest(options);
      }
    };
  }
})();
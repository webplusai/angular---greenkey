(function() {
  'use strict';

  angular.module('gkt.voiceBox.openFin').service('YahooChatService', [
    'OpenFin',
    'commonConstants',
    'ChatMessageIdService',
    'NotifyChatMsgService',
    'ExternalChatBaseController',
    YahooChatService
  ]);

  function YahooChatService(OpenFin,
                            constants,
                            ChatMessageIdService,
                            NotifyChatMsgService,
                            ExternalChatBaseController) {

    var WINDOW_OPTIONS = {
      url: "https://messenger.yahoo.com",
      name: "GKTYahooChat"
    };

    var BLASTS_PROPERTY_NAME = 'tvb.web.SHARED.CHAT_BLASTS.YAHOO';

    function isWindowMinimized(finWindow) {
      return new Promise(function (resolve, reject) {
        finWindow.getState(function (state) {
          resolve(state === 'minimized');
        }, reject);
      });
    }

    function loadBlastGroupsFromTVC() {
      var blastGroupsById = {};
      var storedGroups = GKTConfig.getProperty(BLASTS_PROPERTY_NAME);
      if (!storedGroups) {
        return blastGroupsById;
      }

      _.each(storedGroups, function (group) {
        blastGroupsById[group.id] = group;
      });

      return blastGroupsById;
    }

    /**
     * Chat controller for a Yahoo caht
     * @class
     * @augments ExternalChatCtrl
     * @constructor
     */
    function YahooChatController() {
      ExternalChatBaseController.call(this);
      /**
       * Chat message ID generator
       * @type {ChatMessageIdService}
       */
      this.chatMessageId = new ChatMessageIdService();
    }

    YahooChatController.prototype = Object.create(
      ExternalChatBaseController.prototype);

    YahooChatController.prototype.constructor = YahooChatController;

    YahooChatController.prototype.getEnabledConfigPropName = function () {
      return "net.java.sip.communicator.tvb.chat.protocol.Yahoo!.ENABLED";
    };

    YahooChatController.prototype.getChatNetworkId = function () {
      return constants.GKT.CHAT_NETWORKS.yahoo;
    };

    YahooChatController.prototype.getChatNetworkName = function () {
      return "Yahoo!";
    };

    /**
     * @inheritDoc
     */
    YahooChatController.prototype.openChatWindow = function (windowOptions) {
      return OpenFin.openWindowWithPreloader(_.assign({}, windowOptions), 3000);
    };

    /**
     * @inheritDoc
     */
    YahooChatController.prototype._subscribeOnChatEvents = function () {
      ExternalChatBaseController.prototype._subscribeOnChatEvents.call(this);

      this.eventBus.subscribe('blast_groups_updated',
        function (blastGroupsById) {
          GKTConfig.setProperty(
            BLASTS_PROPERTY_NAME, _.values(blastGroupsById));
        });
    };

    /**
     * @inheritDoc
     */
    YahooChatController.prototype._composeInitialMessageToChat =
      function () {
        var message =
          ExternalChatBaseController.prototype._composeInitialMessageToChat.call(this);

        message.blastGroups = loadBlastGroupsFromTVC();
        return message;
      };

    YahooChatController.prototype.prepareConversationPartner = function (message) {
      if (message.isGroupMessage) {
        return message.userName + ' (' + message.interlocutor + ')';
      }
      return message.userName;
    };

    YahooChatController.prototype.prepareMyName = function (message) {
      return this.gktUserName + ' (' + message.chatAccount + ')';
    };

    /**
     * @inheritDoc
     */
    YahooChatController.prototype.prepareMessages = function (messages) {
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
        var subject = self.chatMessageId.getNext(fromUser, toUser, messageDate, message.content);

        message.messageDate = messageDate;
        message.subject = subject;
        message.fromUser = fromUser;
        message.toUser = toUser;
      });
    };

    var chatController = new YahooChatController();

    return {
      openChatWindow: function() {
        chatController.handleChatOpeningRequest(WINDOW_OPTIONS);
      }
    };

  }
})();

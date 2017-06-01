(function (Mediator, md5, moment) {
  'use strict';

  angular.module('gkt.voiceBox.openFin').factory('ExternalChatBaseController', [
    '$rootScope',
    '$q',
    '$window',
    'ngDialog',
    'OpenFin',
    'GKT',
    'TVC',
    'TornChatsControllerFactory',
    'ChatConfigService',
    'commonConstants',
    'TornChatsAutoOpenerFactory',
    'NotifyChatMsgService',
    'ChatIntegrationService',
    ExternalChatBaseController
  ]);

  function ExternalChatBaseController($rootScope,
                                      $q,
                                      $window,
                                      ngDialog,
                                      OpenFin,
                                      GKT,
                                      TVC,
                                      TornChatsControllerFactory,
                                      ChatConfigService,
                                      constants,
                                      TornChatsAutoOpenerFactory,
                                      NotifyChatMsgService,
                                      ChatIntegrationService) {

    var DEFAULT_WINDOW_OPTIONS = {
      url: "",
      name: "SomeChat",
      defaultWidth: 800,
      defaultHeight: 800,
      minWidth: 400,
      minHeight: 500,
      waitForPageLoad: false,
      autoShow: true,
      frame: true
    };

    var VENDORS_JS_URL = '/chats/vendors.js';
    var MAIN_JS_URL = '/chats/main.js';
    var COMMON_CSS_URL = '/chats/common.css';

    /**
     * @class
     * @constructor
     */
    function ExternalChatCtrl() {
      /**
       * Random hash, generated on opening a chat window.
       * Used for communication between main app and chat window.
       * @type {String | null}
       */
      this.windowId = null;

      /**
       * An OpenFin window with a Chat page
       * @type {fin.desktop.Window}
       */
      this.chatWindow = null;

      /**
       * Property indicating if OpenFin window is in loading progress
       * @type {boolean}
       */
      this.isWindowLoading = false;

      /**
       * When the list logged messages isn't loaded yet from TVC or
       * logging of a pack of messages is in progress,
       * new messages will be put in a queue to prevent duplication
       * @type {Array}
       */
      this.messagesQueue = [];

      /**
       * Logged messages list from TVC
       * @type {array}
       */
      this.loggedMessages = null;

      /**
       * Property indicating that a pack of messages is logging now.
       * Used to prevent concurrent logging of the same messages.
       * @type {boolean}
       */
      this.isLoggingInProgress = false;

      /**
       * Timeout to check if scripts was injected successfully
       * @type {number}
       */
      this.checkInjectedScriptsTimeout = null;
      // former chatControllerStatusWatcher

      /**
       * Service data for combining messages into chains on server side
       * @type {*|string}
       */
      this.gktUserName = GKT.getUserInfo().userName;

      /**
       * Service data for combining messages into chains on server side
       * @type {*|string}
       */
      this.gktId = '';

      /**
       * Helper event bus
       * @type {Mediator}
       */
      this.eventBus = new Mediator();

      /**
       * Decides if logging allowed or not (e.g. user is blacklisted)
       * @type {LoggingManager}
       */
      this.loggingManager = ChatConfigService.createEmptyManager();

      /**
       * Opens preserved torn and tabbed chats on Chat opening
       * @type {TornChatsAutoOpener}
       */
      this.tornChatsAutoOpener = new TornChatsAutoOpenerFactory(
        this.getChatNetworkId(), this.tearChatOut.bind(this));

      /**
       * Used to control torn and tabbed chats
       * @type TornChatsController
       */
      this.tornChatCtrl = new TornChatsControllerFactory(
        this.getChatNetworkId(), this.getChatNetworkName(),
        this.injectMessage.bind(this),
        this.makeChatActive.bind(this),
        this.tornChatsAutoOpener
      );

      this._initialize();
    }

    /**
     * Name for config property which shows if the chat is enabled for the user
     * @abstract
     * @return {string}
     */
    ExternalChatCtrl.prototype.getEnabledConfigPropName = function () {
      throw new Error("Not implemented");
    };

    /**
     * @abstract
     * @return {string}
     */
    ExternalChatCtrl.prototype.getChatNetworkId = function () {
      throw new Error("Not implemented");
    };

    /**
     * @abstract
     * @return {string}
     */
    ExternalChatCtrl.prototype.getChatNetworkName = function () {
      throw new Error("Not implemented");
    };

    /**
     * Inits baisc fields and listeners
     * @private
     */
    ExternalChatCtrl.prototype._initialize = function () {
      var self = this;

      function closeChat() {
        self.chatWindow && self.chatWindow.close();
      }

      $rootScope.$on('$destroy', closeChat);
      GKT.addForceLogoutListener(closeChat);

      self._subscribeOnChatEvents();

      GKT.addConfiguredListener(function () {
        self.loggingManager = ChatConfigService.createLoggingManager(
          self.getChatNetworkId());
        self.tornChatsAutoOpener.load();
        self.gktId = GKTConfig.getJSON(
          'net.java.sip.communicator.url.WEBSOCKET_HEADERS')['My-User-Uid'];
      });
    };

    /**
     * Add listeners to Chat events
     * @private
     */
    ExternalChatCtrl.prototype._subscribeOnChatEvents = function () {
      var self = this;
      $window.addEventListener('message', function (messageEvent) {
        var originId = messageEvent.data.windowId;
        if (originId !== self.windowId) {
          return;
        }

        self.eventBus.publish(
          messageEvent.data.type, messageEvent.data.messageData);
      });


      self.eventBus.subscribe('messages_parsed', function (data) {
        self.logNewMessages(data, false);
      });

      self.eventBus.subscribe('dom_changed', function (data) {
        if (data.chat === self.getChatNetworkId()) {
          GKTLog.sendChatHistoryDomEvent(data.domString);
        }
      });

      self.eventBus.subscribe('popout_clicked', function (data) {
        self.tearChatOut(data.chatData, data.messages, false);
      });

      self.eventBus.subscribe('got_unread_messages',
        self.handleUnreadMessages.bind(self));

      self.eventBus.subscribe('auto_opener_data_gathered',
        self.restorePopouts.bind(self));

      self.eventBus.subscribe('unloading', self._handlePageUnload.bind(self));

      self.eventBus.subscribe('msg_notification', function (messageData) {
        if (document.hidden) {
          NotifyChatMsgService.notificateChatMessage(
            messageData, self.getChatNetworkName());
        }

        self.isWindowMinimized(self.chatWindow).then(function(isMinimized) {
          !isMinimized && self.notifyMainChatWindowAboutMsgs();
        });
      });
    };

    ExternalChatCtrl.prototype.isChatEnabled = function () {
      return GKTConfig.getBoolean(this.getEnabledConfigPropName(), false);
    };

    ExternalChatCtrl.prototype._showDisabledDialog = function () {
      var chatName = this.getChatNetworkName();
      ngDialog.open({
        template: '/partials/common/infoDialog.html',
        data: {
          title: chatName + ' Disabled',
          phrase: 'Please contact an administrator for help with enabling this feature.'
        }
      });
    };

    ExternalChatCtrl.prototype._reset = function () {
      this.tornChatCtrl.closeAll();
      this.chatWindow = null;
      this.isWindowLoading = false;
    };

    /**
     * Opens a window if necessary
     * @param windowOptions
     */
    ExternalChatCtrl.prototype.handleChatOpeningRequest =
      function (windowOptions) {
        if (!OpenFin.exists() || this.isWindowLoading)
          return;

        if (!this.isChatEnabled()) {
          this._showDisabledDialog();
          return;
        }

        if (this.chatWindow) {
          OpenFin.forceShowWindow(this.chatWindow);
          return;
        }

        this.initChatWindow(_.assign({}, DEFAULT_WINDOW_OPTIONS,
          windowOptions));
      };

    /**
     * Opens Chat Window and initializes listeners and fields
     * @param windowOptions
     */
    ExternalChatCtrl.prototype.initChatWindow =
      function (windowOptions) {
        var self = this;
        self.isWindowLoading = true;

        self.openChatWindow(windowOptions).then(function (finWindow) {
          self.windowId = md5(Math.random() + '');
          self.chatWindow = finWindow;
          self.isWindowLoading = false;

          finWindow.show();
          finWindow.bringToFront();
          finWindow.addEventListener('closed', self._reset.bind(self));

          self.injectServiceAssets();

          TVC.getChatMessages().then(function (messages) {
            self.loggedMessages = _.values(messages.search);
          }).catch(function () {
            self.loggedMessages = [];
          });
        }).catch(self._reset.bind(self))
      };

    /**
     * Opens a Chat Window with given options
     * @param windowOptions
     * @returns {Promise} promise is resolved when window is opened
     */
    ExternalChatCtrl.prototype.openChatWindow =
      function (windowOptions) {
        var deferred = $q.defer();

        var chatWindow = new fin.desktop.Window(windowOptions, function () {
          deferred.resolve(chatWindow);
        });

        setTimeout(deferred.reject, 15000);

        return deferred.promise;
      };

    /**
     * Injects scripts and css into the chat page
     */
    ExternalChatCtrl.prototype.injectServiceAssets = function () {
      var self = this;
      if (!self.chatWindow)
        return;


      var vendorScriptUrl = constants.APP.voiceBoxWebUrl + VENDORS_JS_URL,
        mainScriptUrl = constants.APP.voiceBoxWebUrl + MAIN_JS_URL,
        cssUrl = constants.APP.voiceBoxWebUrl + COMMON_CSS_URL;

      ChatIntegrationService.injectScriptIntoChatPage(
        self.chatWindow, vendorScriptUrl)
        .then(function () {
          ChatIntegrationService.injectScriptIntoChatPage(
            self.chatWindow, mainScriptUrl)
            .then(function () {

              ChatIntegrationService.injectCssIntoChatPage(
                self.chatWindow, cssUrl);

              ChatIntegrationService.sendMessage(self.chatWindow, 'init',
                self._composeInitialMessageToChat());
              setTimeout(self._watchChatControllerStatus.bind(self), 500);
            })
            .catch(self.injectServiceAssets.bind(self))
        })
        .catch(self.injectServiceAssets.bind(self));
    };

    /**
     * Composes a message with initial data which is sent to Chat Window
     * @returns {{network: string, id: (String|null|*), tornChatsUids}}
     * @private
     */
    ExternalChatCtrl.prototype._composeInitialMessageToChat =
      function () {
        var self = this;
        return {
          network: self.getChatNetworkId(),
          id: self.windowId,
          tornChatsUids: self.tornChatsAutoOpener.getUids()
        };
      };

    /**
     * Watches chat controller's status.
     */
    ExternalChatCtrl.prototype._watchChatControllerStatus = function () {
      var self = this;
      if (!self.chatWindow || !_.isFunction(self.chatWindow.executeJavaScript))
        return;

      // stop previous watcher
      if (self.checkInjectedScriptsTimeout) {
        clearTimeout(self.checkInjectedScriptsTimeout);
      }

      self.chatWindow.executeJavaScript(
        "window.isChatControllerInitialized",
        function (isInitialized) {
          // We don't care why controller isn't initialized:
          // page was reloaded, user navigated to another page during login process, some error happened...
          // Anyway it should be reinitialized
          // Double injecting of service scripts won't break anything because of special check inside main.js
          if (!isInitialized) {
            self.injectServiceAssets();
          }
          self._reRunChatControllerWatcher(1000);
        },
        function () {
          self._reRunChatControllerWatcher(1000);
        }
      );

      // executeJavaScript is very unstable and can just not invoke neither success nor fail callback
      // so to be sure that watcher continues to work it needs to rerun it manually
      self._reRunChatControllerWatcher(2000);
    };

    ExternalChatCtrl.prototype._reRunChatControllerWatcher = function (timeout) {
      var self = this;
      if (self.checkInjectedScriptsTimeout)
        clearTimeout(self.checkInjectedScriptsTimeout);

      self.checkInjectedScriptsTimeout = setTimeout(
        self._watchChatControllerStatus.bind(self), timeout || 1000);
    };

    ExternalChatCtrl.prototype._handlePageUnload = function () {
      var self = this;
      self.tornChatCtrl.closeAll();

      // Re-injecting the chat scripts.
      setTimeout(self.injectServiceAssets.bind(self), 3000);
    };


    // communication to the Chat
    ExternalChatCtrl.prototype.handleUnreadMessages = function (data) {
      var self = this;
      self.isWindowMinimized(self.chatWindow).then(function(isMinimized) {
        isMinimized && self.notifyMainChatWindowAboutMsgs();
      });

      if (!this.tornChatCtrl.hasTornChats())
        return;

      _.each(data, function (item) {
        self.tornChatCtrl.updateUnreadMessaged(item.uid, item.qty);
        self.notifyTornChatAboutMsgs(null, item);
      });
    };

    ExternalChatCtrl.prototype.makeChatActive = function (uid) {
      var self = this;
      ChatIntegrationService.sendMessage(self.chatWindow, 'make_chat_active', {
        windowId: self.windowId,
        chatUid: uid
      });
    };

    ExternalChatCtrl.prototype.injectMessage = function (uid, text, dontSend) {
      var self = this;
      ChatIntegrationService.sendMessage(self.chatWindow, 'inject_message', {
        windowId: self.windowId,
        chatUid: uid,
        text: text,
        needToSend: !dontSend
      });
    };

    ExternalChatCtrl.prototype.restorePopouts = function (data) {
      var self = this;
      self.tornChatsAutoOpener.restorePopouts(data).then(function () {
        ChatIntegrationService.sendMessage(
          self.chatWindow, 'all_popouts_restored', {
            windowId: self.windowId
          });
      });
    };

    /**
     *
     * @param chatData
     * @param {String} chatData.uid
     * @param {String} chatData.name
     * @param {Array} messages
     * @param {Boolean} isTabbed
     */
    ExternalChatCtrl.prototype.tearChatOut =
      function (chatData, messages, isTabbed) {
        if (!chatData)
          return;

        isTabbed ?
          this.tornChatCtrl.tearToTabbedView(
            chatData.uid, chatData.name, messages, true, chatData) :
          this.tornChatCtrl.tearOutChat(
            chatData.uid, chatData.name, messages, true, chatData);
      };

    ExternalChatCtrl.prototype.isWindowMinimized =
      function (finWindow) {
        return new Promise(function (resolve, reject) {
          finWindow.getState(function (state) {
            resolve(state === 'minimized');
          }, reject);
        });
      };

    ExternalChatCtrl.prototype.outgoingMessagesExist =
      function (messages) {
        return !messages || _.find(messages, function (msg) {
          return !msg.isSentByMe;
        });
      };

    ExternalChatCtrl.prototype.notifyTornChatAboutMsgs =
      function (newMessages, chatData) {
        if (!this.outgoingMessagesExist(newMessages)) {
          return;
        }

        var chatUid = chatData ? chatData.uid : null;
        if (chatUid && this.tornChatCtrl.hasTornChats()) {
          // Notify torn chat window.
          this._blinkTornChat(chatUid);
        }
      };


    ExternalChatCtrl.prototype.notifyHiddenTornOutChat =
      function (newMessages, chatData) {
        if (!this.outgoingMessagesExist(newMessages)) {
          return;
        }

        var chatUid = chatData ? chatData.uid : null;
        var tornChatWindow = this.tornChatCtrl.getChatWindow(chatUid);
        if (!tornChatWindow) {
          return;
        }

        var self = this;
        self.isWindowMinimized(tornChatWindow).then(function(isTornWindowMinimized) {
          if (!isTornWindowMinimized) {
            return;
          }

          self.isWindowMinimized(self.chatWindow).then(function(isMinimized) {
            NotifyChatMsgService.notifyTornChat(tornChatWindow, null, isMinimized);
          });

        });
      };

    ExternalChatCtrl.prototype.notifyMainChatWindowAboutMsgs =
      function() {
        NotifyChatMsgService.notifyMainChatWindow();
      };

    ExternalChatCtrl.prototype._blinkTornChat = function (chatId) {
      var chatWindow = this.tornChatCtrl.getChatWindow(chatId);
      if (chatWindow) {
        NotifyChatMsgService.notifyTornChat(chatWindow, chatId);
      }
    };

    ExternalChatCtrl.prototype.logNewMessages = function (data, isRepeat) {
      var self = this;
      var messages = data.messages;
      self.prepareMessages(messages);

      var newMessages = _.filter(messages, function (message) {
        return !self.isMessageLogged(message);
      });

      if (newMessages.length === 0) {
        self.isLoggingInProgress = false;
        return;
      }

      // when logging is in progress or there is no answer from TVC yet
      // it needs to put messages in queue
      if ((!isRepeat && self.isLoggingInProgress) || !_.isArray(self.loggedMessages)) {
        self.messagesQueue = _.uniq(
          self.messagesQueue.concat(messages), false, function (message) {
            return message.subject;
          });
        return;
      }

      self.isLoggingInProgress = true;
      self.handleMessages(newMessages, data.chatData).then(function () {
        if (data.chatData) {
          self.sendMessagesToPoppedOutChat(data.chatData.uid, newMessages);
        }

        if (self.messagesQueue.length > 0) {
          var queue = self.messagesQueue.slice();
          self.messagesQueue = [];
          self.logNewMessages({
            chatData: data.chatData,
            messages: queue
          }, true);
        } else {
          self.isLoggingInProgress = false;
        }
      });
    };

    /**
     * Sends messages to popped out or tabbed chat
     * @param messages
     */
    ExternalChatCtrl.prototype.sendMessagesToPoppedOutChat = function (chatUid, messages) {
      this.tornChatCtrl.sendNewMessages(chatUid, messages);
    };

    /**
     * Changes messages in the given array
     * @param messages
     */
    ExternalChatCtrl.prototype.prepareMessages = function (messages) {
      // do nothing by default
    };

    ExternalChatCtrl.prototype.isMessageLogged = function (message) {
      return Boolean(_.find(this.loggedMessages, function (loggedMessage) {
        return loggedMessage && loggedMessage.subject === message.subject;
      }));
    };

    ExternalChatCtrl.prototype.handleMessages = function (messages, chatData) {
      var self = this;
      var totalQty = messages.length;
      var processedQty = 0;
      if (totalQty === 0) {
        return $q.resolve();
      }

      self.notifyHiddenTornOutChat(messages, chatData);

      return $q(function (resolve) {
        function handleMessageLoggingCompletion() {
          if (++processedQty === totalQty) {
            resolve(self.loggedMessages);
          }
        }

        _.each(messages, function (message) {
          var loggingParameters = self.prepareLoggingParameters(message);
          TVC.logChatMessage(loggingParameters)
            .then(function () {
              self.loggedMessages.push(message);
              handleMessageLoggingCompletion();
            })
            .catch(function (error) {
              console.warn('Unable to log chat message:', error);
              handleMessageLoggingCompletion();
            });
        });
      });
    };

    ExternalChatCtrl.prototype.prepareLoggingParameters = function (messageData) {
      var self = this;

      var fromUser = messageData.fromUser;
      var toUser = messageData.toUser;
      var fromUserUid = '';
      var toUserUid = '';

      if (messageData.isSentByMe) {
        fromUserUid = self.gktId;
      } else {
        toUserUid = self.gktId;
      }

      var isBlacklisted = !self.loggingManager.isLoggingAllowed(
        messageData.userName);

      if (isBlacklisted) {
        if (messageData.isSentByMe) {
          toUser = 'Unknown Person';
        } else {
          fromUser = 'Unknown Person';
        }
      }

      if (!(messageData.messageDate instanceof moment)) {
        messageData.messageDate = moment(messageData.messageDate);
      }

      return {
        messageText: messageData.content,
        toUser: toUser,
        fromUser: fromUser,
        toUserUid: toUserUid,
        fromUserUid: fromUserUid,
        subject: messageData.subject,
        messageDate: messageData.messageDate,
        network: self.getChatNetworkName(),
        userIsBlacklisted: isBlacklisted,
        conversationId: md5(messageData.interlocutor + self.gktUserName),
        gktUserName: self.gktUserName,
        gktUserId: self.gktId,
        chatAccount: messageData.chatAccount
      };
    };

    return ExternalChatCtrl;
  }
})(Mediator, md5, moment);

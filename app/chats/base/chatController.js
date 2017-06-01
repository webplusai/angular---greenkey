/**
 * Constructor of base chat controller. It provides communication between running chat application
 * and main Green Key window
 * @param eventsBus Mediator
 * @param windowId String
 * @param tornChatsUids
 * @constructor
 */
function ChatController(eventsBus, windowId, tornChatsUids) {
  var self = this;

  this.bindUnloadEvent();
  this.eventsBus = eventsBus;
  this.windowId = windowId;

  this.dataProvider = this._createDataProvider();
  this.uiController = this._createChatUiController(this.dataProvider);

  this.autoOpenerHelper = new TornChatsAutoOpener(
    tornChatsUids, this.uiController, this.dataProvider);

  this.uiController.addNeedMessageProcessingListener(function() {
    self.dataProvider.runProcessing();
  });

  this.uiController.addReadyListener(this._handleReadyEvent.bind(this));

  this.uiController.addPopoutClickedListener(function() {
    self.dataProvider.getMessages().then(function(messages) {
      self._sendMessagesToMainWindow('popout_clicked', {
        chatData: self.dataProvider.getActiveChatData(),
        messages: messages
      });
    });
  });

  this.uiController.addGotUnreadMessagesListener(function (unreadMsgQty) {
    self._sendMessagesToMainWindow('got_unread_messages', unreadMsgQty);
  });


  this.dataProvider.addParseMessagesListener(function(messages) {
    self._sendMessagesToMainWindow('messages_parsed', {
      chatData: self.dataProvider.getActiveChatData(),
      messages: messages
    });
  });

  this.dataProvider.addChangedDomListener(function (data) {
    self._sendMessagesToMainWindow('dom_changed', {
      chat: data.chat,
      domString: data.domString
    });
  });
  
  this.dataProvider.addNeedUnreadResetListener(function(chatUid) {
    self.uiController.makeConversationActiveById(chatUid);
  });

  function isMessageForThisWindow(message) {
    return self.windowId === message.windowId;
  }

  // input commands
  
  eventsBus.subscribe('make_chat_active', function(data) {
    if(!isMessageForThisWindow(data))
      return;

    self.uiController.makeConversationActiveById(data.chatUid);
  });

  eventsBus.subscribe('all_popouts_restored', function() {
    self.uiController.removeOverlay();
  });

  eventsBus.subscribe('inject_message', function(data) {
    if(!isMessageForThisWindow(data))
      return;

    self.uiController.makeConversationActiveById(data.chatUid);
    // wait for DOM
    setTimeout(function() {
      data.needToSend ?
        self.uiController.sendMessage(data.text) :
        self.uiController.pasteMessage(data.text);
    }, 200);
  });

  self.uiController.initObservers();
  ChatNotificationMock.start(windowId);


  window.addEventListener('error', function(errorEvent) {
    // it's likely an error in our script
    // todo: find a better way to detect a fallback mode
    if (!errorEvent.filename && errorEvent.path.length === 1) {
      self.goToFallbackMode();
    }
  }, true);
}

ChatController.prototype = {

  _sendMessagesToMainWindow: function(messageType, messageData) {
    if (!window.opener) {
      return;
    }
    window.opener.postMessage(this._createMessageToMainWidow(messageType, messageData), '*');
  },

  _createMessageToMainWidow: function(type, data) {
    return {
      type: type,
      messageData: data,
      windowId: this.windowId
    }
  },

  /**
   * Creates common data provider (parser) for chat
   * @returns {ChatDataProvider}
   */
  _createDataProvider: function () {
    return new ChatDataProvider();
  },

  /**
   * Creates common UI controller for chat
   * @returns {ChatUiController}
   */
  _createChatUiController: function (dataProvider) {
    return new ChatUiController(dataProvider);
  },

  /**
   * Sends a 'unloading' message to the main app when this
   *  chat window is unloading.
   */
  bindUnloadEvent: function() {
    var self = this;
    window.addEventListener('beforeunload', function() {
      self._sendMessagesToMainWindow('unloading');
      return '';
    });
  },

  /**
   * Switches an application to fallback mode
   */
  goToFallbackMode: function() {
    this.uiController.removeOverlay();
  },

  /**
   * Handles event of window's readiness
   */
  _handleReadyEvent: function() {
    var self = this;
    this.autoOpenerHelper.addOverlayIfNeeded();
    this.autoOpenerHelper.gatherPopoutData().then(function(data) {
      self._sendMessagesToMainWindow('auto_opener_data_gathered', data);
    });
  }

};
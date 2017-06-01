(function() {
  'use strict';

  angular.module('gkt.voiceBox.openFin')
    .service('TornChatsControllerFactory', ['OpenFin', 'TabbedTornChats',
      'commonConstants', 'NotifyChatMsgService',
      TornChatsControllerFactory]);

  function TornChatsControllerFactory(OpenFin, TabbedTornChats, constants, NotifyChatMsgService) {



    var TORN_WINDOW_OPTIONS = {
      url: '/openfin/popouts.html#/torn-chat',
      name: "GKTTornChat",
      defaultWidth: 300,
      defaultHeight: 600,
      minWidth: 300,
      minHeight: 300,
      autoShow: true,
      frame: true,
      resizable: true,
      waitForPageLoad: false,
      maximizable: false
    };

    function TornChatsController(chatNetworkId, chatName, injectMessageFn,
                                 makeChatActiveFn, autoOpener) {
      this.tornChats = {};

      this.chatNetworkId = chatNetworkId;
      this.chatName = chatName;
      this.injectMessage = _.isFunction(injectMessageFn) ?
        injectMessageFn : new Function();
      this.makeChatActive = _.isFunction(makeChatActiveFn) ?
        makeChatActiveFn : new Function();
      /**
       * @type {TornChatsAutoOpener}
       */
      this.autoOpener = autoOpener || null;
      if (this.autoOpener) {
        TabbedTornChats.setAutoOpener(this.autoOpener, chatNetworkId);
      }

      this.onReset = false;
    }

    TornChatsController.prototype.closeAll = function() {
      this.onReset = true;
      TabbedTornChats.closeForNetwork(this.chatNetworkId);
      _.each(_.values(this.tornChats), function(chat) {
        chat && chat.close();
      });
      var self = this;
      setTimeout(function() {
        self.onReset = false;
      }, 1000);
    };

    TornChatsController.prototype.hasTornChats = function() {
      return _.values(this.tornChats).length > 0 || TabbedTornChats.getWindow() !== null;
    };

    TornChatsController.prototype.injectMessage = function (uid, text) {
      this.injectMessage(uid, text);
    };

    TornChatsController.prototype.makeChatActive = function (uid) {
      this.makeChatActive(uid);
    };

    TornChatsController.prototype.getChatWindow = function(uid) {
      var isTabbed = TabbedTornChats.isTabbed(uid);
      if(isTabbed) {
        return TabbedTornChats.getWindow();
      }

      return this.tornChats[uid];
    };

    TornChatsController.prototype.sendNewMessages = function(uid, newMessages) {
      var chat = this.getChatWindow(uid);
      if(!chat) return;

      if(!_.isFunction(chat.sendMessage)) {
        // maybe we should retry after a second e.g.
        console.error('sendMessage is not a function');
        return;
      }
      chat.sendMessage({
        type: "newMessages",
        uid: uid,
        data: {
          messages: newMessages
        }
      });
    };

    TornChatsController.prototype.updateUnreadMessaged = function(uid, value) {
      var chat = this.getChatWindow(uid);
      if(!chat) return;

      chat.sendMessage({
        uid: uid,
        type: "unreadMessages",
        data: {
          quantity: value
        }
      });
    };

    TornChatsController.prototype._prepareInitialMessage =
      function(uid, contactName, currentMessages, msgTransformNeeded, options) {
        return {
          type: "initial",
          data: {
            uid: uid,
            contactName: contactName,
            avatar: options && options.avatar,
            chatName: this.chatName,
            chatNetworkId: this.chatNetworkId,
            messages: currentMessages,
            msgTransformNeeded: Boolean(msgTransformNeeded),
            isGroup: options && options.isGroup
          }
        };
      };

    TornChatsController.prototype.tearToTabbedView =
      function(uid, contactName, currentMessages, msgTransformNeeded, options) {
        var self = this;

        if(TabbedTornChats.isTabbed(uid) && TabbedTornChats.getWindow()) {
          OpenFin.forceShowWindow(TabbedTornChats.getWindow());
          return;
        }

        var initialMessage = this._prepareInitialMessage(uid, contactName,
          currentMessages, msgTransformNeeded, options);

        TabbedTornChats.addChat(initialMessage.data, self);
        OpenFin.forceShowWindow(TabbedTornChats.getWindow());

        if (self.autoOpener)
          self.autoOpener.add(uid, true);
      };

    TornChatsController.prototype.tearOutChat
      = function(uid, contactName, currentMessages, msgTransformNeeded, options) {

      if(this.tornChats.hasOwnProperty(uid)) {
        var existingChat = this.tornChats[uid];
        if(existingChat) {
          OpenFin.forceShowWindow(existingChat);
        }
        return;
      }

      if(TabbedTornChats.isTabbed(uid) && TabbedTornChats.getWindow()) {
        var tabbedWindow = TabbedTornChats.getWindow();
        tabbedWindow.sendMessage({
          type: 'makeTabActive',
          uid: uid
        });
        OpenFin.forceShowWindow(tabbedWindow);
        return;
      }

      var self = this;
      self.tornChats[uid] = null;

      var initialMessageForWindow = self._prepareInitialMessage(uid, contactName,
        currentMessages, msgTransformNeeded, options);

      // it appeared, that OpenFin doesn't save window's options (e.g. position)
      // if there are spaces in a window's name
      var windowOptions = _.assign({}, TORN_WINDOW_OPTIONS, {
        name: [TORN_WINDOW_OPTIONS.name, this.chatName, uid, contactName]
          .join(' ').replace(/\s/g, '_')
      });
      
      var tornWindow = OpenFin.openIntegratedWindow(windowOptions, 
        function(message) {
          // user sends message via torn chat
          if(message.action === "send") {
            self.injectMessage(uid, message.text);
          }

          // user wants to pin chat to the tabbed view
          if(message.action === "pin") {
            tornWindow.close();
            self.tearToTabbedView(uid, contactName, message.data.messages, false,
              options);
          }

        },
        function() {
          delete self.tornChats[uid];
          if(!self.onReset && self.autoOpener) {
            self.autoOpener.remove(uid, false);
          }
        },
        initialMessageForWindow,
        // on open
        function () {
          var bounds = self.autoOpener.getBounds(uid);
          if (bounds) {
            tornWindow.moveTo(bounds.left, bounds.top);
          }

          tornWindow.focus();
        }
      );

      tornWindow.addEventListener('focused', function() {
        self.makeChatActive(uid);
      });

      tornWindow.addEventListener('bounds-changed', function (event) {
        var bounds = {
          left: event.left,
          top: event.top
        };
        self.autoOpener.updateBounds(uid, bounds);
      });

      self.tornChats[uid] = tornWindow;
      if(self.autoOpener) {
        self.autoOpener.add(uid, false);
      }
    };

    return TornChatsController;
  }
})();
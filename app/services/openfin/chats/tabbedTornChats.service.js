(function () {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
    .service('TabbedTornChats', [
      'OpenFin',
      '$rootScope',
      function (OpenFin, $rootScope) {

        var TABBED_WINDOW_OPTIONS = {
          url: '/openfin/popouts.html#/tabbed-chat',
          name: "GKTTabbedChat",
          defaultWidth: 600,
          defaultHeight: 600,
          minWidth: 300,
          minHeight: 300,
          autoShow: true,
          frame: true,
          resizable: true,
          waitForPageLoad: false,
          maximizable: false
        };

        var BOUNDS_PROPERTY = 'tvb.web.chats.tornWindows.tabbedView';

        var tabbedWindow = null;
        var isWindowOpened = false;
        var tabbedChats = {};
        var tabbedChatsByNetworks = {};
        var activeChat = null;

        var newChatsQueue = [];
        var autoOpenersByChat = {};

        $rootScope.$on('$destroy', function () {
          tabbedWindow && tabbedWindow.close();
        });

        function addToNetwork(chatConfig) {
          // create an object if none exists
          if(!tabbedChatsByNetworks.hasOwnProperty(chatConfig.chatNetworkId))
            tabbedChatsByNetworks[chatConfig.chatNetworkId] = {};

          var chats = tabbedChatsByNetworks[chatConfig.chatNetworkId];
          chats[chatConfig.uid] = chatConfig;
        }

        function openWindow(initialMessage) {
          var bounds = GKTConfig.getProperty(BOUNDS_PROPERTY);

          tabbedWindow = OpenFin.openIntegratedWindow(TABBED_WINDOW_OPTIONS,
            function (message) {
              // user sends message via torn chat
              if (message.action === "send") {
                var entity = tabbedChats[message.uid];
                if (entity) {
                  var tornChatCtrl = entity.tornChatCtrl;
                  tornChatCtrl.injectMessage(message.uid, message.text);
                }
              }

              if (message.action === 'switch') {
                activeChat = tabbedChats[message.uid];
                var tornChatCtrl = activeChat.tornChatCtrl;
                tornChatCtrl.makeChatActive(activeChat.uid);
              }

              // user wants to pin chat to the tabbed view
              if (message.action === "unpin") {
                var chat = tabbedChats[message.uid];
                if (!chat || !chat.tornChatCtrl) return;

                delete tabbedChats[message.uid];
                var network = tabbedChatsByNetworks[message.chatNetworkId];
                if(network) {
                  delete network[message.uid];
                }

                chat.tornChatCtrl.tearOutChat(chat.uid, message.contactName,
                  message.messages, false, {
                    avatar: message.avatar,
                    isGroup: message.isGroup
                  });

                if(_.values(tabbedChats).length === 0)
                  tabbedWindow && tabbedWindow.close();
              }

              if (message.action === "close-tabbed-chat") {
                var chat = tabbedChats[message.uid];
                if (!chat || !chat.tornChatCtrl) { return; }

                delete tabbedChats[message.uid];
                var network = tabbedChatsByNetworks[message.chatNetworkId];
                if(network) {
                  delete network[message.uid];
                }

                if(_.values(tabbedChats).length === 0)
                  tabbedWindow && tabbedWindow.close();

                if (autoOpenersByChat[message.chatNetworkId]) {
                  autoOpenersByChat[message.chatNetworkId].remove(message.uid, true);
                }
              }

            },
            function () {
              tabbedWindow = null;
              isWindowOpened = false;
              tabbedChats = {};
            },
            initialMessage,
            // on open
            function() {
              if (bounds) {
                tabbedWindow.moveTo(bounds.left, bounds.top);
              }

              tabbedWindow.focus();
              isWindowOpened = true;
              if(newChatsQueue.length === 0)
                return;

              while (newChatsQueue.length > 0) {
                var newChatMsg = newChatsQueue.shift();
                tabbedWindow.sendMessage(newChatMsg);
              }
            }
          );

          tabbedWindow.addEventListener('focused', function () {
            if (activeChat) {
              var tornChatCtrl = activeChat.tornChatCtrl;
              tornChatCtrl.makeChatActive(activeChat.uid);
            }
          });

          tabbedWindow.addEventListener('bounds-changed', function (event) {
            GKTConfig.setProperty(BOUNDS_PROPERTY, {
              left: event.left,
              top: event.top
            });
          });
        }

        this.closeForNetwork = function (chatNetworkId) {
          if(!tabbedWindow)
            return;

          var chats = tabbedChatsByNetworks[chatNetworkId];
          if(!chats)
            return;

          var uids = _.keys(chats);
          tabbedChatsByNetworks[chatNetworkId] = {};

          _.each(uids, function (uid) {
            delete tabbedChats[uid];
            if (activeChat && activeChat.uid === uid) {
              activeChat = null;
            }
          });

          if (_.values(tabbedChats).length === 0)
            tabbedWindow && tabbedWindow.close();
          else {
            tabbedWindow.sendMessage({
              type: 'closeChats',
              data: {
                uids: uids
              }
            })
          }
        };

        this.isTabbed = function (uid) {
          return _.includes(_.keys(tabbedChats), uid);
        };

        this.getWindow = function () {
          return tabbedWindow;
        };

        this.getChatsByNetwork = function(networkId) {
          var chats = tabbedChatsByNetworks[networkId];
          return chats ? _.values(chats) : [];
        };

        /**
         *
         * @param initialData
         * @param {String} initialData.uid
         * @param {String} initialData.contactName
         * @param {String} initialData.chatName
         * @param {String} initialData.chatNetworkId
         * @param {Array} initialData.messages
         *
         * @param {TornChatsController} tornChatCtrl
         */
        this.addChat = function (initialData, tornChatCtrl) {
          var message = {
            type: 'newChat',
            data: initialData
          };

          if (!tabbedWindow) {
            openWindow(message);
          } else {
            // on restore window can be not ready
            if(isWindowOpened) {
              tabbedWindow.sendMessage(message);
            } else {
              newChatsQueue.push(message);
            }
          }

          var chatConfig = {
            uid: initialData.uid,
            chatNetworkId: initialData.chatNetworkId,
            tornChatCtrl: tornChatCtrl
          };

          tabbedChats[initialData.uid] = chatConfig;
          addToNetwork(chatConfig);
        };

        this.getActiveChat = function() {
          return activeChat ? activeChat.uid : null;
        };

        this.setAutoOpener = function(autoOpener, chatName) {
          autoOpenersByChat[chatName] = autoOpener;
        };

      }]);
})();
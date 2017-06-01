(function() {
  'use strict';

  angular.module('gkt.voiceBox.openFin')
    .service('TornChatsAutoOpenerFactory', [TornChatsAutoOpenerFactory]);

  function TornChatsAutoOpenerFactory() {
    
    function composePersistedProperty(chatNetworkId) {
      return 'tvb.web.chats.tornWindows.' + chatNetworkId;
    }

    function TornChatsAutoOpener(chatNetworkId, tearChatOutFn) {
      this.chatNetworkId = chatNetworkId;
      this.tornContactsUids = {};

      this.tearChatOut = tearChatOutFn || new Function();
    }

    TornChatsAutoOpener.prototype.getUids = function() {
      return _.keys(this.tornContactsUids);
    };

    /**
     * @param data array of {uid: string, name: string, messages: array}
     * @returns {Promise}
     */
    TornChatsAutoOpener.prototype.restorePopouts = function(data) {

      var self = this;

      return new Promise(function(resolve, reject) {
        var chats = _.values(self.tornContactsUids);

        var qty = chats.length;
        if(qty === 0) {
          reject();
          return;
        }

        openPopoutChat(0);

        function openPopoutChat(i) {
          if(i === qty) {
            resolve();
            return;
          }

          var chat = chats[i];
          if(data.hasOwnProperty(chat.uid)) {
            var chatData = data[chat.uid];
            self.tearChatOut(chatData, chatData.messages, chat.isTabbed);
          }

          setTimeout(openPopoutChat.bind(this, i + 1), 500);
        }
      });
    };
    
    TornChatsAutoOpener.prototype.load = function() {
      this.tornContactsUids = GKTConfig.getProperty(
        composePersistedProperty(this.chatNetworkId), {});
    };

    TornChatsAutoOpener.prototype.save = function() {
      GKTConfig.setProperty(composePersistedProperty(this.chatNetworkId),
        this.tornContactsUids);
    };

    TornChatsAutoOpener.prototype.add = function (uid, isTabbed) {
      if(this.tornContactsUids.hasOwnProperty(uid)) {
        var chatData = this.tornContactsUids[uid];
        chatData.isTabbed = isTabbed;
      } else {
        this.tornContactsUids[uid] = {
          uid: uid,
          isTabbed: Boolean(isTabbed)
        };
      }

      this.save();
    };

    TornChatsAutoOpener.prototype.updateBounds = function (uid, bounds) {
      if (this.tornContactsUids.hasOwnProperty(uid)) {
        var chatData = this.tornContactsUids[uid];
        chatData.bounds = bounds;
        this.save();
      }
    };

    TornChatsAutoOpener.prototype.getBounds = function (uid) {
      if (this.tornContactsUids.hasOwnProperty(uid)) {
        var chatData = this.tornContactsUids[uid];
        return chatData.bounds;
      }
      return null;
    };

    TornChatsAutoOpener.prototype.remove = function(uid, isTabbed) {
      if(!this.tornContactsUids.hasOwnProperty(uid))
        return;

      var chat = this.tornContactsUids[uid];
      // prevent deleting by async window close callbacks
      if(chat.isTabbed === isTabbed) {
        delete this.tornContactsUids[uid];
        this.save();
      }
    };

    return TornChatsAutoOpener;
  }
})();
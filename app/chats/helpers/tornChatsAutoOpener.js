function TornChatsAutoOpener(tornContactsUids, uiController, dataProvider) {
  /**
   * Array of uids
   */
  this.tornContactsUids = tornContactsUids || [];

  /**
   * @type {ChatDataProvider}
   */
  this.dataProvider = dataProvider;

  /**
   * @type {ChatUiController}
   */
  this.uiController = uiController;
}

TornChatsAutoOpener.prototype.addOverlayIfNeeded = function() {
  if(this.tornContactsUids.length > 0)
    this.uiController.addOverlay('Restoring pop-outs...');
};

TornChatsAutoOpener.prototype.gatherPopoutData = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    var qty = self.tornContactsUids.length;
    if(qty === 0) {
      reject();
      return;
    }

    var result = {};

    openPopoutChat(0);

    function openPopoutChat(i, secondTime) {
      if(i === qty) {
        resolve(result);
        var finWin = fin.desktop.Window.getCurrent();
        // Prevent loosing the focus when popouts are closed.
        finWin.focus();
        return;
      }

      var chatUid = self.tornContactsUids[i];
      if (chatUid && self.uiController.makeConversationActiveById(chatUid)) {
        setTimeout(function() {
          var chatData = self.dataProvider.getActiveChatData();
          // let's try it again if we get no name
          if(!chatData || !chatData.name) {
            if(secondTime) {
              chatData.name = 'N/A';
            } else {
              setTimeout(openPopoutChat.bind(null, i, true), 1000);
              return;
            }
          }
          
          self.dataProvider.getMessages().then(function(messages) {
            // TODO group all fields except "messages" in chatData field
            result[chatUid] = {
              uid: chatUid,
              name: chatData && chatData.name,
              avatar: chatData && chatData.avatar,
              isGroup: chatData && chatData.isGroup,
              messages: messages
            };
            openPopoutChat(i + 1);
          });
        }, 1000);
        // if there is no conversation with such id - go to the next popped out chat
      } else {
        openPopoutChat(i + 1);
      }
    }
  });
};
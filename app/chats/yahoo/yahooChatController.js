/**
 * Overloaded chat controller for Yahoo
 * @param eventsBus Mediator
 * @param windowId String
 * @param tornChatsUids
 * @param blastGroups Array
 * @constructor
 */
function YahooChatController(eventsBus, windowId, tornChatsUids, blastGroups, greetingMessage) {
  this.greetingMessage = greetingMessage;
  ChatController.call(this, eventsBus, windowId, tornChatsUids);

  var self = this;
  self.dataProvider.getUserContacts().then(function(userContacts) {
    self.blastController = new ChatBlastDialog(userContacts, blastGroups, 'yahoo');
    self.uiController.injectBlastDialog(self.blastController);
    self.uiController._injectImportContactsDialog();

    self.blastController.addGroupsUpdateListener(function(updatedGroups) {
      self._sendMessagesToMainWindow('blast_groups_updated', updatedGroups);
    });

    self.blastController.addMessageSendingListener(function(message, contacts) {
      var sendPromise = Promise.resolve();
      _.forEach(contacts, function(contact) {
        sendPromise = sendPromise
          .then(function() {
            return self.uiController.sendMessageToContact(contact, message);
          })
          // it needs to continue sending a message to another contacts
          .catch(Promise.resolve);
      });

      sendPromise
        .then(self.blastController.closeBlastDialog.bind(self.blastController))
        .catch(self.blastController.closeBlastDialog.bind(self.blastController));
    });
  });
}

(function() {

  YahooChatController.prototype = _.defaults({

    constructor: YahooChatController,

    /**
     * Creates common UI controller for chat
     * @returns {ChatUiController}
     */
    _createChatUiController: function (dataProvider) {
      return new YahooChatUiController(dataProvider);
    },

    /**
     * Creates data provider (parser) for Yahoo chat
     * @returns {ChatDataProvider}
     */
    _createDataProvider: function () {
      return new YahooChatDataProvider({
        greetingMessage: this.greetingMessage
      });
    },

    /**
     * Handles event of window's readiness
     */
    _handleReadyEvent: function() {
      var self = this;
      this.uiController.addOverlay('Loading...', true);
      this.uiController.activateAllContacts().then(function() {
        self.uiController.removeOverlay();
        ChatController.prototype._handleReadyEvent.call(self);
      });
    }

  }, ChatController.prototype);

})();
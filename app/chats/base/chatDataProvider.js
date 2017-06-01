/**
 * Constructor for chat's data provider (also could be called "parser")
 * @constructor
 */
function ChatDataProvider() {
  this.eventBus = new Mediator();

  this.isBusy = false;
  this.needRepeat = false;
}

ChatDataProvider.prototype = {
  MESSAGES_PARSED_EVENT: 'messages_parsed',
  DOM_CHANGED_EVENT: 'dom_changed',
  NEED_UNREAD_MESSAGES_RESET_EVENT: 'need_unread_messages_reset',

  addParseMessagesListener: function(listener) {
    this.eventBus.subscribe(this.MESSAGES_PARSED_EVENT, listener);
  },
  
  addChangedDomListener: function(listener) {
    this.eventBus.subscribe(this.DOM_CHANGED_EVENT, listener);
  },

  addNeedUnreadResetListener: function(listener) {
    this.eventBus.subscribe(this.NEED_UNREAD_MESSAGES_RESET_EVENT, listener);
  },

  runProcessing: function() {
    if (this.isBusy) {
      this.needRepeat = true;
      return;
    }

    this.isBusy = true;
    this._parseMessages();
  },


  _parseMessages: function() {
    this._resetBusy();
  },

  _resetBusy: function() {
    this.isBusy = false;

    if (this.needRepeat) {
      this.needRepeat = false;
      this.runProcessing();
    }
  },

  _publishParsedMessages: function(messages) {
    this.eventBus.publish(this.MESSAGES_PARSED_EVENT, messages);
  },

  publishChangedDom: function (chat, domString) {
    this.eventBus.publish(this.DOM_CHANGED_EVENT, {
      chat: chat,
      domString: domString
    });
  },

  /**
   * @abstract
   * @returns {{uid: string, name: string, avatar: string}}
   */
  getActiveChatData: function() {
    throw new Error("Not implemented");
  },

  /**
   * @abstract
   * @param chatElement DOM element with chat's description
   * @returns {{uid: string, name: string, avatar: string}}
   */
  getChatData: function(chatElement) {
    throw new Error("Not implemented");
  },

  /**
   * @abstract
   * @returns {Promise} with array of messages
   */
  getMessages: function() {
    return Promise.resolve([]);
  },

  /**
   * @abstract
   * @returns {Promise} with array of user's contacts
   */
  getUserContacts: function() {
    return this._getChats(true);
  },

  /**
   * @abstract
   * @returns {Promise} with array of conversations
   */
  getConversations: function() {
    return this._getChats();
  },

  /**
   * @returns {Array} of {uid: string, qty: integer} objects
   */
  getUnreadMessagesQty: function() {
    return [];
  },

  /**
   * @param contactNode DOM element of the contact
   * @returns {String | null}
   */
  getAvatarUrl: function(contactNode) {
    return null;
  },

  /**
   * @abstract
   * @param contactsOnly
   * @protected
   */
  _getChats: function(contactsOnly) {
    return Promise.resolve([]);
  }
};
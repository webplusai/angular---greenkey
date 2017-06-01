/**
 * Base constructor of chat ui controller. It provides management of UI events
 * via  communication with control elements on the page
 * e.g. making some conversation active, pasting some text to message field and so on
 * @constructor
 */
function ChatUiController(dataProvider) {
  this.eventBus = new Mediator();
  this.activeChatData = null;
  /**
   * @type {ChatDataProvider}
   */
  this.dataProvider = dataProvider;
  this.failsafeHelper = new FailsafeHelper();
}

ChatUiController.prototype = {
  NEED_MESSAGE_PROCESSING_EVENT: 'need_message_processing',
  POPOUT_BUTTON_CLICKED_EVENT: 'popout_button_clicked',
  GOT_UNREAD_MESSAGES_EVENT: 'got_unread_messages',
  READY_EVENT: 'ui_controller_is_ready',

  CONVERSATION_SWITCHING_DURATION: 600,

  injectMenuItem: function (menuItemName, clickHandler) {
    var menuItem = document.createElement('div');
    menuItem.classList.add('flex-auto', 'compose', 'tt-black', 'tt-notch-up', 'tt-notch-right', 'blast-button');
    menuItem.textContent = menuItemName;
    menuItem.title = menuItemName;
    if (clickHandler) {
      menuItem.addEventListener('click', clickHandler);
    }

    function appendMenuItem() {
      var menuWrapper = document.querySelector('.col1 .top-menu');
      if (menuWrapper && menuWrapper.nodeType) {
        menuWrapper.appendChild(menuItem);
        return;
      }
      setTimeout(appendMenuItem, 1000);
    }

    appendMenuItem();
  },

  removeExistingElements: function (selector) {
    _.each(document.querySelectorAll(selector), function (node) {
      node && node.nodeType && node.remove();
    });
  },

  /**
   * Places the blast dialog node into chat page
   * @param {ChatBlastDialog} blastDialog
   */
  injectBlastDialog: function (blastDialog) {
    this.removeExistingElements(".blast-button, .blast-dialog");
    document.body.appendChild(blastDialog.getNodeElement());

    this.injectMenuItem('Blasts', function () {
      blastDialog.openBlastDialog();
    });
  },

  /**
   * Makes chat active
   * @param {String} name
   * @returns {Promise}
   */
  makeConversationActiveByName: function(name) {
    return Promise.resolve();
  },
  
  makeConversationActiveById: function(uid) {
    return false;
  },

  /**
   * Puts text into message box
   * @param {String} messageText
   * @returns {Promise}
   */
  pasteMessage: function(messageText) {
    return Promise.resolve();
  },

  /**
   * Sends a message in active conversation
   * @param {String} messageText
   * @returns {Promise}
   */
  sendMessage: function(messageText) {
    var self = this;
    return this.pasteMessage(messageText).then(function() {
      return self._initiateMessageSending();
    });
  },

  /**
   * Sends a message to selected contact
   * @param contactId
   * @param messageText
   * @returns {Promise}
   */
  sendMessageToContact: function(contactId, messageText) {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.makeConversationActiveById(contactId);
      setTimeout(function() {
        self.sendMessage(messageText).then(resolve).catch(reject);
      }, self.CONVERSATION_SWITCHING_DURATION);
    });
  },

  addOverlay: function(text, spinning) {
    // remove existing overlays to prevent their duplication on multiple time initialization
    this.removeOverlay();

    var overlay = document.createElement('div');
    overlay.classList.add('gkt-overlay');
    var overlayContent = document.createElement('div');
    overlayContent.classList.add('gkt-overlay-content');

    if (text) {
      var overlayLabel = document.createElement('span');
      overlayLabel.classList.add('gkt-overlay-label');
      overlayLabel.textContent = text;
      overlayContent.appendChild(overlayLabel);
    }

    if (spinning) {
      overlayContent.classList.add('with-spinner');
      new Spinner({radius:30, width:8, length: 16, color: '#000'}).spin(overlayContent);
    }

    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);
  },

  removeOverlay: function() {
    _.each(document.querySelectorAll('.gkt-overlay'), function(existingOverlay) {
      existingOverlay.remove();
    });
  },

  /**
   * Adds listener to event of changing active chat
   * @param listener function
   */
  addNeedMessageProcessingListener: function(listener) {
    this.eventBus.subscribe(this.NEED_MESSAGE_PROCESSING_EVENT, listener);
  },

  addPopoutClickedListener: function(listener) {
    this.eventBus.subscribe(this.POPOUT_BUTTON_CLICKED_EVENT, listener);
  },

  addGotUnreadMessagesListener: function (listener) {
    this.eventBus.subscribe(this.GOT_UNREAD_MESSAGES_EVENT, listener);
  },

  addReadyListener: function(listener) {
    this.eventBus.subscribe(this.READY_EVENT, listener);
  },

  /**
   * Init all observers we need
   * @abstract
   */
  initObservers: function() {
    throw new Error('Not implemented');
  },
  
  injectPopoutButton: function() {
    // no popout button by default
  },

  /**
   * Activates all contacts one by one to make sure that messages from all conversations are logged
   */
  activateAllContacts: function() {
    if (window.areContactsBeingActivated) {
      return Promise.reject();
    }

    var self = this;
    window.areContactsBeingActivated = true;

    /**
     * Just a wrapper for makeConversationActiveById
     * @returns {Promise}
     */
    function activateContact(contact) {
      return new Promise(function(resolve) {
        self.makeConversationActiveById(contact.uid);
        setTimeout(function() {
          resolve();
        }, self.CONVERSATION_SWITCHING_DURATION);
      });
    }

    return this.dataProvider.getConversations().then(function(contacts) {
      var activationPromise = Promise.resolve();
      _.each(contacts, function(contact) {
        activationPromise = activationPromise.then(function() {
          return activateContact(contact);
        })
      });

      return activationPromise.then(function() {
        window.areContactsBeingActivated = false;
      });
    });
  },

  /**
   * Initiates sending of message
   * @protected
   * @returns {Promise}
   */
  _initiateMessageSending: function() {
    return Promise.resolve();
  },

  _triggerClickEvent: function(node) {
    if (!node || !node.nodeType) {
      return;
    }

    var clickEvent = document.createEvent('MouseEvents');
    clickEvent.initEvent("mousedown", true, true);
    node.dispatchEvent(clickEvent);
  },

  _triggerPasteTextEvent: function(node, content) {
    try {
      var inputEvent = document.createEvent('KeyboardEvents');
      inputEvent .initEvent("input", true, true);
      node.value = content;
      node.innerHTML = content;
      node.dispatchEvent(inputEvent);
    } catch(error) {
      // do nothing
    }
  },

  openExternalLink: function(link) {
    var win = new fin.desktop.Window({
      url: link,
      autoShow: true,
      frame: true,
      name: link,
      defaultHeight: 600,
      defaultWidth: 800,
      resizable: true,
      waitForPageLoad: false,
      maximizable: true
    });

    win.show();
  },

  _addHyperlinksListener: function() {
    var _this = this;

    document.addEventListener('click', function(event) {
      if (event.target.tagName === 'A' && event.target.target === '_blank') {
        _this.openExternalLink(event.target.href);
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }

};
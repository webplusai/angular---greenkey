/**
 * Yahoo UI controller
 * @constructor
 */
function YahooChatUiController(dataProvider) {
  ChatUiController.call(this, dataProvider);

  /**
   * @type {YahooContactsImportDialog}
   * @private
   */
  this._contactsImportDialog = new YahooContactsImportDialog('yahoo', this);
}

(function() {
  var totalObserver;
  var infoMenuObserver;
  var messagesObserver;
  var contactsObserver;
  var unreadMsgHash = {};

  YahooChatUiController.prototype = _.defaults({
    constructor: YahooChatUiController,

    MESSAGE_SENDING_DURATION: 300,
    MESSAGE_PASTING_DURATION: 100,

    initObservers: function() {
      var self = this;

      var messagesSection = document.querySelector('.col2 .content');
      if(!messagesSection) {
        setTimeout(this.initObservers.bind(this), 2000);
        return;
      }

      // contacts are loading for some time
      setTimeout(function() {
        this._observeAll();
        this._observeMenu();
        this._observeMessages();
        this._observeContacts();
      }.bind(this), 500);

      this._addHyperlinksListener();
      this.dataProvider._getUserAccount();
      this.failsafeHelper.init(document, 'Yahoo!', function (domString) {
        self.dataProvider.publishChangedDom('yahoo', domString);
      });
    },

    _removeAllElements: function (elements) {
      _.each(elements, function (element) {
        element.remove();
      });
    },

    _removeAllDeleteOptions: function () {
      var elements = document.querySelectorAll('.clear-conversation');
      this._removeAllElements(elements);
    },

    _observeAll: function() {
      totalObserver && totalObserver.disconnect();

      var container = document.body;
      totalObserver = new MutationObserver(this._removeAllDeleteOptions.bind(this));
      totalObserver.observe(container, {
        childList: true,
        characterData: true,
        subtree: true
      });
    },

    _observeContacts: function() {
      var self = this;
      contactsObserver && contactsObserver.disconnect();

      // TODO add call repetition here
      var list = document.querySelector('.col1 .groups-and-users');
      if(!list) {
        console.error("Yahoo: contacts not found");
        return;
      }
      
      contactsObserver = new MutationObserver(function() {
        var unreadMsgDataPromise = self.dataProvider.getUnreadMessagesQty();

        unreadMsgDataPromise.then(function(unreadMsgData) {
          if (_.isArray(unreadMsgData) && unreadMsgData.length > 0) {
            self.eventBus.publish(self.GOT_UNREAD_MESSAGES_EVENT, unreadMsgData);
          }
        });
      });
      
      contactsObserver.observe(list, {
        childList: true,
        subtree: true
      });

      self.eventBus.publish(self.READY_EVENT);
    },

    _observeMessages: function() {
      var self = this;
      messagesObserver && messagesObserver.disconnect();

      var messagesSection = document.querySelector('.col2 .content');
      messagesObserver = new MutationObserver(function() {
        self.eventBus.publish(self.NEED_MESSAGE_PROCESSING_EVENT);
      });
      messagesObserver.observe(messagesSection, {
        childList: true,
        subtree: true
      });
    },

    _observeMenu: function() {
      infoMenuObserver && infoMenuObserver.disconnect();

      var container = document.querySelector('#wrapper #app .content.primary');
      infoMenuObserver = new MutationObserver(this.injectPopoutButton.bind(this));
      infoMenuObserver.observe(container, {
        childList: true,
        characterData: true,
        subtree: true
      });
    },

    _clickButton: function (selector) {
      return new Promise(function (resolve) {
        var button = document.querySelector(selector);
        if (button) {
          button.click();
        }
        setTimeout(resolve, 100);
      });
    },

    _inputText: function (selector, text) {
      return new Promise(function (resolve) {
        var input = document.querySelector(selector);
        input.focus();
        input.value = text;

        var fakeEvent = document.createEvent('Event');
        fakeEvent.initEvent('keydown', true, true);
        fakeEvent.keyCode = 13;

        input.dispatchEvent(fakeEvent);

        try {
          input.props && input.props.onChange && input.props.onChange(fakeEvent);
        } catch (e) {
          // do nothing
        }

        setTimeout(resolve, 200);
      });
    },

    _injectImportContactsDialog: function () {
      this.removeExistingElements(".import-contacts-input .contacts-import-dialog");
      this.injectMenuItem('Import', function() {
        this._contactsImportDialog.openDialog();
      }.bind(this));
      document.body.appendChild(this._contactsImportDialog.getNodeElement());
    },

    // TODO implement
    makeConversationActiveByName: function() {

    },

    makeConversationActiveById: function(id) {
      var href = '/group/' + id;
      var link = document.querySelector(
        '.groups-and-users a.list-item[href="' + href + '"]');

      if(link) {
        link.click();
        return true;
      }

      return false;
    },

    pasteMessage: function(text) {
      var input = document.querySelector('.ci-add-msg-txt');
      input.focus();
      input.value = text;

      var fakeEvent = document.createEvent('Event');
      fakeEvent.initEvent('keydown', true, true);
      fakeEvent.keyCode = 0;

      input.dispatchEvent(fakeEvent);

      try {
        input.props && input.props.onChange && input.props.onChange(fakeEvent);
      } catch (e) {
        // do nothing
      }

      var self = this;
      return new Promise(function(resolve) {
        setTimeout(function() {
          resolve();
        }, self.MESSAGE_PASTING_DURATION);
      })
    },

    _initiateMessageSending: function() {
      var button = document.querySelector('.ci-add-msg-send-btn');
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!button || !button.nodeType) {
          return reject();
        }

        button.click();
        setTimeout(resolve, self.MESSAGE_SENDING_DURATION);
      });
    },

    injectPopoutButton: function() {
      var self = this;

      var header = document.querySelector('.page-header');

      if (!header) {
        return setTimeout(this.injectPopoutButton.bind(this), 1000);
      }

      if (header.querySelector('.group-settings.popout-button')) {
        return;
      }

      var popoutBtn = document.createElement("a");
      popoutBtn.setAttribute("class", "group-settings flex-auto white popout-button");
      popoutBtn.setAttribute("role", "button");

      var text = document.createElement("span");
      text.innerText = "Pop-out";
      popoutBtn.appendChild(text);

      popoutBtn.onclick = function() {
        self.eventBus.publish(self.POPOUT_BUTTON_CLICKED_EVENT);
      };
      header.appendChild(popoutBtn);
    }

  }, ChatUiController.prototype);

})();

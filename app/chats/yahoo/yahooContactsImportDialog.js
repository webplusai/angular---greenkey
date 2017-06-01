function YahooContactsImportDialog(dialogClass, uiController) {
  this.contacts = [];
  this.contactNodes = {};

  /**
   * {@type} ChatUiController
   */
  this.uiController = uiController;

  this.dialogClass = dialogClass || 'some';
  this.contactsContainerNode = null;
  this.dialogNode = this._createDialogNodeElement();

  this.isImportInProgress = false;
}

(function () {

  var EMAIL_REG_EXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

  YahooContactsImportDialog.prototype = {

    /**
     * Returns NodeElement of dialog's top wrapper
     * @return NodeElement
     */
    getNodeElement: function () {
      return this.dialogNode;
    },

    /**
     * Hides dialog
     */
    closeDialog: function () {
      this.dialogNode && this.dialogNode.classList
        .remove('active', 'processing');
      this.contacts = [];
      this.contactNodes = {};
      this._renderContacts();
    },

    /**
     * Makes the dialog visible
     */
    openDialog: function () {
      this.dialogNode && this.dialogNode.classList.add('active');
    },

    /**
     * Creates root dialog element
     * @returns {Element}
     * @private
     */
    _createDialogNodeElement: function () {
      var dialog = document.createElement('div');
      dialog.classList.add('contacts-import-dialog',
        'vb-fullscreen-dialog', this.dialogClass);

      var dialogHeader = document.createElement('div');
      dialogHeader.classList.add('dialog-header');
      this._createHeader(dialogHeader);

      var dialogBody = document.createElement('div');
      dialogBody.classList.add('dialog-body');
      this._createPasteControls(dialogBody);
      this._createBody(dialogBody);

      var messageWrapper = this._createMessageWrapper();

      dialog.appendChild(dialogHeader);
      dialog.appendChild(dialogBody);
      dialog.appendChild(messageWrapper);

      return dialog;
    },

    _createHeader: function (parent) {
      var self = this;
      var cancelButton = document.createElement('div');
      cancelButton.innerHTML = '&larr; Import Contacts';
      cancelButton.classList.add('dialog-cancel-button');
      cancelButton.addEventListener('click', function () {
        self.closeDialog();
      }, false);

      parent.appendChild(cancelButton);
    },

    _createPasteControls: function (parent) {
      var self = this;

      var pasteWrapper = document.createElement('div');
      pasteWrapper.classList.add('paste-contacts-wrapper');

      parent.appendChild(pasteWrapper);

      var pasteInput = document.createElement('input');
      pasteInput.type = 'text';
      pasteInput.id = 'past-contacts-input';
      pasteInput.placeholder = "Paste comma or space separated addresses";

      var pasteSubmit = document.createElement('button');
      pasteSubmit.id = 'paste-contacts-submit';
      pasteSubmit.classList.add('dialog-white-button');
      pasteSubmit.textContent = 'Add';
      pasteSubmit.addEventListener('click', function () {
        if(self._pasteContacts(pasteInput.value)) {
          pasteInput.value = '';
        }
      });

      pasteWrapper.appendChild(pasteInput);
      pasteWrapper.appendChild(pasteSubmit);
    },

    _createBody: function (parent) {
      this.contactsContainerNode = document.createElement('div');
      this.contactsContainerNode.classList.add('contacts-for-import-container');

      var uploadButton = document.createElement('div');
      uploadButton.classList.add('upload-contacts-button');
      uploadButton.textContent = 'Upload Yahoo CSV';
      uploadButton.addEventListener('click', function () {
        this._openFileInputDialog();
      }.bind(this));

      var helpContainer = document.createElement('div');
      helpContainer.classList.add('export-contacts-help');
      helpContainer.innerHTML = [
        '<div class="title">How to export my Yahoo contacts?</div>',
        '<ol class="export-contacts-steps">',
        '<li><span>Launch Yahoo email and sign in.</span></li>',
        '<li><span>Click on the Contacts tab.</span></li>',
        '<li><span>Click the Actions dropdown box.</span></li>',
        '<li><span>Choose Export.</span></li>',
        '<li><span>Click Export Now next to “Yahoo! CSV” which is the type of program to which you want to export your contact.</span></li>',
        '</ol>'
      ].join("\n");


      parent.appendChild(this.contactsContainerNode);
      parent.appendChild(uploadButton);
      parent.appendChild(helpContainer);
    },

    _pasteContacts: function (addressesString) {
      if (!addressesString || /^\s*$/.test(addressesString)) {
        alert("Please provide comma or space separated addresses to add");
        return false;
      }

      addressesString = addressesString.trim();
      var splitExpr = addressesString.indexOf(',') > -1 ?
        /\s*,\s*/ : /\s+/;
      var addresses = addressesString.split(splitExpr);

      var gotIncorrect = _.some(addresses, function (address) {
        return !EMAIL_REG_EXP.test(address);
      });
      if (gotIncorrect) {
        alert("One or more items are not email addresses");
        return false;
      }

      this.contacts = this.contacts.concat(addresses);
      this.contacts = _.uniq(this.contacts);

      this._renderContacts();
      return true;
    },

    _openFileInputDialog: function () {
      var fileInput = document.querySelector('.import-contacts-input');
      if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.classList.add('import-contacts-input');
        fileInput.type = 'file';
        fileInput.accept = '.csv';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', this._importContactsInputChangeHandler.bind(this));
        document.body.appendChild(fileInput);
      }
      fileInput.click();
    },

    _getImportContactsIds: function (data) {
      var mapped = _.map(data, function (item) {
        return item[7] ? (item[7] + '@yahoo.com') : item[7]; // Messenger ID
      });

      return _.filter(mapped, function (item, index) {
        if (index === 0)
          return false;
        return item;
      });
    },

    _importContactsInputChangeHandler: function (event) {
      var self = this;

      if (event.target.files.length === 0) {
        return;
      }

      var csvFile = event.target.files[0];
      var extension = _.isString(csvFile.name) ? csvFile.name.substr(-3).toLowerCase() : '';

      if (csvFile.type !== "text/csv" && extension !== 'csv') {
        alert('Unable to import contacts. Please choose correct CSV file.');
        return;
      }

      try {
        var reader = new FileReader();
        reader.onload = function () {
          var result = Papa.parse(reader.result);
          if (result.errors.length > 0) {
            var errorMessages = _.map(result.errors, function (error) {
              return error.message;
            });
            alert(errorMessages.join("\n"));
            event.target.value = '';
            return;
          }

          self.contacts = self._getImportContactsIds(result.data);
          self._renderContacts();
          event.target.value = '';
        };
        reader.readAsText(csvFile);
      } catch (exception) {
        console.error(exception);
        event.target.value = '';
      }
    },

    _renderContacts: function () {
      this.contactsContainerNode.innerHTML = '';
      this.contactNodes = {};
      _.each(this.contacts, this._renderContact.bind(this));
    },

    _renderContact: function (contact) {
      var self = this;
      var contactNode = document.createElement('div');
      contactNode.classList.add('contact-for-import');

      var nameNode = document.createElement('div');
      nameNode.classList.add('contact-name');
      nameNode.textContent = contact;

      var removeButton = document.createElement('div');
      removeButton.classList.add('remove-contact-button');
      removeButton.textContent = 'x';
      removeButton.title = 'Remove';
      removeButton.addEventListener('click', function () {
        _.remove(self.contacts, function(email) {
          return email === contact;
        });
        contactNode.remove();
        delete self.contactNodes[contact];
      });

      var checkmark = document.createElement('div');
      checkmark.classList.add('checkmark');

      contactNode.appendChild(nameNode);
      contactNode.appendChild(removeButton);
      contactNode.appendChild(checkmark);

      this.contactNodes[contact] = contactNode;
      this.contactsContainerNode.appendChild(contactNode);
    },

    /**
     * Creates text field and control buttons
     * @private
     */
    _createMessageWrapper: function () {
      var self = this;

      var messageWrapper = document.createElement('div');
      messageWrapper.classList.add('dialog-message-wrapper');

      // textarea
      var message = document.createElement('textarea');
      message.classList.add('import-dialog-message');
      message.classList.add('dialog-message-text');
      message.setAttribute('placeholder', 'Add a greeting message');
      message.addEventListener('keydown', function (event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          event.preventDefault();
          self._importContacts();
        }
      });
      messageWrapper.appendChild(message);

      // control buttons
      var buttonsWrapper = document.createElement('div');
      buttonsWrapper.classList.add('message-control-buttons');
      var sendButton = document.createElement('button');
      sendButton.innerHTML = 'Import';
      sendButton.classList.add('control-button');
      sendButton.classList.add('dialog-white-button');
      sendButton.addEventListener('click', function () {
        self._importContacts();
      }, false);
      buttonsWrapper.appendChild(sendButton);
      messageWrapper.appendChild(buttonsWrapper);

      // sending status
      var statusWrapper = document.createElement('div');
      statusWrapper.classList.add('dialog-process-status');
      statusWrapper.innerHTML = 'Importing...';
      buttonsWrapper.appendChild(statusWrapper);

      return messageWrapper;
    },

    _importContacts: function () {
      var message = document.querySelector('.import-dialog-message');
      if (!message || this.isImportInProgress) {
        return;
      }

      if (this.contacts.length === 0) {
        alert("There are no contacts for import.");
        return;
      }

      if (!message.value) {
        alert("Provide greeting message, please.");
        return;
      }

      this.dialogNode.classList.add('processing');
      this.isImportInProgress = true;

      var self = this;
      self._sendMessagesToContacts(message.value)
        .then(function () {
          self.isImportInProgress = false;
          self.closeDialog();
        });
    },

    _importContact: function (address, message) {
      var self = this;

      return new Promise(function (resolve) {
        var node = self.contactNodes[address];
        self.uiController._clickButton('.top-menu .compose')
          .then(self.uiController._inputText.bind(self.uiController, '.autosuggest input', address))
          .then(self.uiController.sendMessage.bind(self.uiController, message))
          .then(function () {
            node && node.classList.add('done');
            setTimeout(resolve, 500);
          })
          .catch(function (e) {
            console.warn('Unable to import contact:', address, e);
            setTimeout(resolve, 500);
          });
      });
    },

    _sendMessagesToContacts: function (message) {
      var self = this;
      var ids = this.contacts;
      var idsLength = ids.length;

      return new Promise(function (resolve) {
        function importContactByIndex(index) {
          if (index >= idsLength) {
            return resolve();
          }

          self._importContact(ids[index], message)
            .then(importContactByIndex.bind(null, index + 1));
        }

        importContactByIndex(0);
      });
    }

  };


})();
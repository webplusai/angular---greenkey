function ChatBlastDialog(contacts, groups, dialogClass) {
  this.contacts = contacts || [];
  this.selectedBlastId = null;
  this.blastGroupsById = {};

  this.switchInProgress = false;

  var self = this;
  _.each(groups || [], function (group) {
    self.blastGroupsById[group.id] = group;
  });

  this.dialogClass = dialogClass || 'some';
  this.dialogNode = this._createDialogNodeElement();

  this.isMessageBeingSent = false;
  this.eventBus = new Mediator();
}

(function() {
  
  ChatBlastDialog.prototype = {
    GROUPS_UPDATE_EVENT: 'chat_blasts_updated',
    MESSAGE_SENDING_EVENT: 'chat_blast_message',
  
    
    /**
     * Returns NodeElement of dialog's top wrapper
     * @return NodeElement
     */
    getNodeElement: function() {
      return this.dialogNode;
    },
    /**
     * Adds handler of groups' update event
     */
    addGroupsUpdateListener: function(listener) {
      this.eventBus.subscribe(this.GROUPS_UPDATE_EVENT, listener);
    },
    /**
     * Adds handler of group's removal event
     */
    addMessageSendingListener: function(listener) {
      this.eventBus.subscribe(this.MESSAGE_SENDING_EVENT, listener);
    },

    /**
     * Hides dialog
     */
    closeBlastDialog: function() {
      this.dialogNode && this.dialogNode.classList.remove('active', 'processing');
      this.isMessageBeingSent = false;

      var message = document.querySelector('.blast-dialog-message');
      if (message) {
        message.value = '';
      }
    },

    /**
     * Makes the dialog visible
     */
    openBlastDialog: function() {
      this.dialogNode && this.dialogNode.classList.add('active');
    },

    /**
     * Creates list of blast groups
     * @returns {Element}
     * @private
     */
    _createDialogNodeElement: function() {
      var dialog = document.createElement('div');
      dialog.classList.add('blast-dialog', 'vb-fullscreen-dialog',
        this.dialogClass);

      var dialogHeader = document.createElement('div');
      dialogHeader.classList.add('dialog-header');
      this._createHeader(dialogHeader);

      var dialogBody = document.createElement('div');
      dialogBody.classList.add('dialog-body');

      this._createNewGroupWrapper(dialogBody);
      this._createGroupList(dialogBody);
      this._createContactList(dialogBody);
      var messageWrapper = this._createMessageWrapper();

      dialog.appendChild(dialogHeader);
      dialog.appendChild(dialogBody);
      dialog.appendChild(messageWrapper);

      return dialog;
    },
    
    _createHeader: function(parent) {
      var self = this;
      var cancelButton = document.createElement('div');
      cancelButton.innerHTML = '&larr; Blast Message';
      cancelButton.classList.add('dialog-cancel-button');
      cancelButton.addEventListener('click', function() {
        var message = document.querySelector('.blast-dialog-message');
        if(message)
          message.value = '';
        self.closeBlastDialog();
      }, false);

      var saveAsButton = document.createElement('div');
      saveAsButton.classList.add('blast-save-as-group-button');
      saveAsButton.textContent = 'Save Blast As';
      saveAsButton.addEventListener('click', function() {
        var dialog = document.querySelector('.blast-dialog');
        if(dialog) {
          dialog.classList.add('show-save-as');
        }
      });

      parent.appendChild(saveAsButton);
      parent.appendChild(cancelButton);
    },

    _createNewGroupWrapper: function(parent) {
      var self = this;

      var newGroupWrapper = document.createElement('div');
      newGroupWrapper.classList.add('blast-new-group-wrapper');

      parent.appendChild(newGroupWrapper);

      var newGroupName = document.createElement('input');
      newGroupName.type = 'text';
      newGroupName.id = 'blast-new-group-name';
      newGroupName.placeholder = "Enter new group name";
      newGroupName.addEventListener('keydown', function() {
        newGroupName.classList.remove('blast-form-error');
      });

      var newGroupSubmit = document.createElement('button');
      newGroupSubmit.id = 'blast-new-group-submit';
      newGroupSubmit.classList.add('blast-save-control-button');
      newGroupSubmit.classList.add('dialog-white-button');
      newGroupSubmit.textContent = 'Save';
      newGroupSubmit.addEventListener('click', function() {
        var dialog = document.querySelector('.blast-dialog');
        dialog && dialog.classList.remove('show-save-as');
        self._createNewGroup();
      });

      var newGroupCancel = document.createElement('button');
      newGroupCancel.id = 'blast-new-group-cancel';
      newGroupCancel.classList.add('blast-save-control-button');
      newGroupCancel.classList.add('dialog-white-button');
      newGroupCancel.textContent = 'Cancel';
      newGroupCancel.addEventListener('click', function() {
        var dialog = document.querySelector('.blast-dialog');
        dialog && dialog.classList.remove('show-save-as');
        newGroupName.value = '';
      });

      newGroupWrapper.appendChild(newGroupName);
      newGroupWrapper.appendChild(newGroupCancel);
      newGroupWrapper.appendChild(newGroupSubmit);
    },
    
    _createGroupList: function(parent) {
      var self = this;

      var wrapper = document.createElement('div');
      wrapper.classList.add('blast-groups-wrapper');

      var groupsList = document.createElement('div');
      groupsList.classList.add('blast-dialog-groups');

      _.each(this.blastGroupsById, function(group) {
        groupsList.appendChild(self._createBlastGroupNode(group));
      });

      wrapper.appendChild(groupsList);
      parent.appendChild(wrapper);
    },

    /**
     * Creates NodeElement for blast group
     * @param {Object} group
     * @returns {Element}
     * @private
     */
    _createBlastGroupNode: function(group) {
      var self = this;

      var groupNode = document.createElement('div');
      groupNode.dataset.groupId = group.id;
      groupNode.classList.add('blast-dialog-group');
      groupNode.classList.add('blast-contact');
      groupNode.addEventListener('click', this._selectGroup.bind(this, group.id));

      // icon
      var pseudoAvatar = document.createElement('div');
      pseudoAvatar.classList.add('blast-contact-pseudo-avatar');
      pseudoAvatar.classList.add('blast-circle-icon');
      pseudoAvatar.textContent = 'G';
      groupNode.appendChild(pseudoAvatar);
      
      var text = document.createElement('div');
      text.textContent = this._getGroupLabel(group);
      text.classList.add('blast-dialog-group-name');
      text.classList.add('blast-contact-name');

      var saveIcon = document.createElement('div');
      saveIcon.innerHTML = '<div class="checkmark"></div>';
      saveIcon.title = 'Save';
      saveIcon.classList.add('blast-dialog-save-group');
      saveIcon.classList.add('blast-circle-icon');
      saveIcon.addEventListener('click', function(event) {
        event.stopPropagation();
        self._saveBlast();
      }, true);

      var deleteIcon = document.createElement('div');
      deleteIcon.textContent = '×';
      deleteIcon.title = 'Delete';
      deleteIcon.classList.add('blast-dialog-delete-group');
      deleteIcon.classList.add('blast-circle-icon');
      deleteIcon.addEventListener('click', function(event) {
        event.stopPropagation();
        if (confirm('Are you sure you want to delete ' + group.name + '?')) {
          self._deleteGroup(group.id);
        }
      }, true);

      groupNode.appendChild(deleteIcon);
      groupNode.appendChild(saveIcon);
      groupNode.appendChild(text);

      return groupNode;
    },
    
    /**
     *
     * @param parent
     * @private
     */
    _createContactList: function(parent) {
      var self = this;
      var contactsList = document.createElement('div');
      contactsList.classList.add('blast-dialog-contacts');

      _.each(this._prepareContactsList(this.contacts), function(contact) {
        // var contactNode = document.createElement('li');
        var contactNode = document.createElement('div');
        contactNode.classList.add('blast-contact');
        // checkbox
        var contactCheckBox = document.createElement('input');
        contactCheckBox.setAttribute('type', 'checkbox');
        contactCheckBox.id = ['contact', contact.uid].join('-');
        contactCheckBox.dataset.contact = contact.uid;
        contactNode.appendChild(contactCheckBox);
        contactCheckBox.addEventListener('change', function() {
            contactNode.classList.toggle('active', contactCheckBox.checked);

          // no need to react on selecting contacts if it's done by script
          if(self.switchInProgress)
            return;

          var activeGroup = document.querySelector('.active.blast-dialog-group');
          if(activeGroup) {
            activeGroup.classList.add('dirty');
          }
        });

        contactNode.addEventListener('click', function() {
          contactCheckBox.click();
        }, false);

        // icon
        var pseudoAvatar = document.createElement('div');
        pseudoAvatar.classList.add('blast-contact-pseudo-avatar');
        pseudoAvatar.classList.add('blast-circle-icon');
        // generate initials
        var nameArray = contact.name.split(' ');
        var initials = '?';
        if(nameArray.length === 1) {
          initials = contact.name.substr(0, 2);
        } else {
          initials = nameArray[0][0] + nameArray[1][0];
        }
        pseudoAvatar.textContent = initials.toUpperCase();
        contactNode.appendChild(pseudoAvatar);
        // label
        var contactLabel = document.createElement('div');
        contactLabel.innerHTML = contact.name;
        contactLabel.classList.add('blast-contact-name');
        contactNode.appendChild(contactLabel);

        // pseudo checkbox
        var pseudoCheckbox = document.createElement('div');
        pseudoCheckbox.classList.add('blast-contact-pseudo-checkbox');
        pseudoCheckbox.classList.add('blast-circle-icon');
        contactNode.appendChild(pseudoCheckbox);

        var checkmark = document.createElement('div');
        checkmark.classList.add('checkmark');
        pseudoCheckbox.appendChild(checkmark);

        contactsList.appendChild(contactNode);
      });

      parent.appendChild(contactsList);
    },

    /**
     * Creates new blast group
     * @private
     */
    _createNewGroup: function() {
      var groupNameNode = document.getElementById('blast-new-group-name');
      if (!groupNameNode) {
        return;
      }

      var newName = groupNameNode.value;
      if (!newName || /^\s*$/.test(newName)) {
        groupNameNode.classList.add('blast-form-error');
        return;
      }

      // clean the input
      groupNameNode.value = '';

      // create the group
      var newBlast = {
        id: uuidGenerator.generate(),
        name: newName,
        members: []
      };
      this.blastGroupsById[newBlast.id] = newBlast;
      this.selectedBlastId = newBlast.id;
      this._saveBlast();

      // unset current active
      var currentActive = document.querySelector('.active.blast-dialog-group');
      if(currentActive) {
        currentActive.classList.remove('active');
      }

      // insert new DOM element
      var groupsList = document.querySelector('.blast-dialog-groups');
      var controls = document.querySelector('.blast-dialog-group-controls');
      var newGroupNode = this._createBlastGroupNode(newBlast);
      newGroupNode.classList.add('active');
      groupsList.insertBefore(newGroupNode, controls);
    },

    /**
     * Selects group with passed id
     * @param id
     * @private
     */
    _selectGroup: function(id) {
      var group = this.blastGroupsById[id];
      if(!group)
        return;

      this.selectedBlastId = id;

      // make save btn active
      var saveButton = document.querySelector('.blast-save-group-button');
      saveButton && saveButton.classList.remove('blast-dialog-disabled-button');

      // reset currently active group
      var activeGroup = document.querySelector('.active.blast-dialog-group');
      if(activeGroup) {
        activeGroup.classList.remove('dirty');
      }

      // set active group
      var groupNodes = document.querySelectorAll('.blast-dialog-group');
      _.each(groupNodes, function(node) {
        node.classList.toggle('active', node.dataset.groupId === id);
      });

      // select required contacts
      this.switchInProgress = true;
      var contactNodes = document.querySelectorAll('.blast-contact input');
      _.each(contactNodes, function(node) {
        if(Boolean(node.checked) !==
          Boolean(_.includes(group.members, node.dataset.contact))) {
          node.click();
        }
      });
      this.switchInProgress = false;
    },

    /**
     * Generates label for group
     * @param {Object} group
     * @returns {string}
     * @private
     */
    _getGroupLabel: function(group) {
      return [group.name, ' (', group.members.length, ')'].join('');
    },

    /**
     * Removes group from UI and send event to controller
     * @param id
     * @private
     */
    _deleteGroup: function(id) {
      if (this.selectedBlastId === id) {
        this.selectedBlastId = null;
      }

      // remove from ui
      var groupNode = document.querySelector('.blast-dialog-group[data-group-id="' + id + '"]');
      if (groupNode) {
        groupNode.remove()
      }

      // delete from model
      delete this.blastGroupsById[id];
      this.eventBus.publish(this.GROUPS_UPDATE_EVENT, this.blastGroupsById);
    },

    /**
     *
     * @private
     */
    _saveBlast: function() {
      if (!this.selectedBlastId || !this.blastGroupsById[this.selectedBlastId]) {
        return;
      }

      var group = this.blastGroupsById[this.selectedBlastId];
      group.members = [];
      var contactNodes = document.querySelectorAll('.blast-contact input');
      _.each(contactNodes, function(node) {
        if (node.checked) {
          group.members.push(node.dataset.contact);
        }
      });

      // update the name of group in UI
      var groupNodeSelector = ".blast-dialog-group[data-group-id='" + group.id + "'] .blast-dialog-group-name";
      var savedGroupName = document.querySelector(groupNodeSelector);
      if (savedGroupName) {
        savedGroupName.parentNode.classList.remove('dirty');
        savedGroupName.textContent = this._getGroupLabel(group);
      }

      this.eventBus.publish(this.GROUPS_UPDATE_EVENT, this.blastGroupsById);
    },

    /**
     * 
     * @param contactsModels
     * @returns {Array}
     * @private
     */
    _prepareContactsList: function(contactsModels) {
      var userContacts = [];
      _.forEach(contactsModels, function(contact) {
        if (!contact.uid || !contact.name) {
          return;
        }
        userContacts.push({
          uid: contact.uid,
          name: contact.name
        });
      });
  
      return userContacts;
    },

    /**
     * Creates text field and control buttons
     * @private
     */
    _createMessageWrapper: function() {
      var self = this;

      var messageWrapper = document.createElement('div');
      messageWrapper.classList.add('dialog-message-wrapper');

      // textarea
      var message = document.createElement('textarea');
      message.classList.add('blast-dialog-message', 'dialog-message-text');
      message.setAttribute('placeholder', 'Add a message');
      message.addEventListener('keydown', function(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          event.preventDefault();
          self._sendMessage();
        }
      });
      messageWrapper.appendChild(message);

      // control buttons
      var buttonsWrapper = document.createElement('div');
      buttonsWrapper.classList.add('message-control-buttons');
      var sendButton = document.createElement('button');
      sendButton.innerHTML = 'Blast';
      sendButton.classList.add('control-button');
      sendButton.classList.add('dialog-white-button');
      sendButton.addEventListener('click', function() {
        self._sendMessage();
      }, false);
      buttonsWrapper.appendChild(sendButton);
      messageWrapper.appendChild(buttonsWrapper);

      // sending status
      var statusWrapper = document.createElement('div');
      statusWrapper.classList.add('dialog-process-status');
      statusWrapper.innerHTML = 'Sending...';
      buttonsWrapper.appendChild(statusWrapper);

      return messageWrapper;
    },

    _sendMessage: function() {
      var message = document.querySelector('.blast-dialog-message');
      if (!message || this.isMessageBeingSent) {
        return;
      }

      this.dialogNode.classList.add('processing');
      this.isMessageBeingSent = true;

      var selectedContacts = [];
      _.forEach(document.querySelectorAll('.blast-contact input'), function(checkbox) {
        if (checkbox.checked) {
          selectedContacts.push(checkbox.dataset.contact);
        }
      });

      this.eventBus.publish(this.MESSAGE_SENDING_EVENT, message.value, selectedContacts);
    }

  };
  
  
})();
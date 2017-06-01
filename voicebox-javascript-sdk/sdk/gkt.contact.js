function ContactManagerService(tvcRest, tvcWebSocket) {

  var INTERACTION_STATES = {
    offline: "offline",
    initialization: "initialization",
    online: "online"
  };

  var interactionState = INTERACTION_STATES.offline;

  var contactsListeners = new Set();

  var contactByUid = {};

  var tvcEvents = [];

  var self = this;

  var tvcMessageHandlers = {};

  /* Array.from not working under OpenFin */
  function toArray(value){
    var res = [];
    value.forEach(function(item){
      res.push(item);
    });
    return res;
  }

  function triggerContactsChangedEvent(lastContactChanges) {
    var createdIds = toArray(lastContactChanges.createdIds);
    var changedIds = toArray(lastContactChanges.changedIds);
    var removedIds = toArray(lastContactChanges.removedIds);
    contactsListeners.forEach(function (listener) {
      listener(createdIds, changedIds, removedIds);
    });
  }

  function initContact(contact) {
    contact.isHoot = function () {
      return this.direct && this.direct.auto_answer;
    };

    contact.isRingdown = function () {
      return this.type !== GKTConstants.CONTACT_TYPE.external
        && this.direct && !this.direct.auto_answer;
    };

    contact.isExternal = function () {
      return this.type === GKTConstants.CONTACT_TYPE.external;
    };
  }

  this.addContactsListener = function (listener) {
    contactsListeners.add(listener);
  };

  this.removeContactsListener = function (listener) {
    contactsListeners.delete(listener);
  };

  function addContact(contact) {
    initContact(contact);
    contactByUid[contact.uid] = contact;
  }

  function updateContact(contact, updatedData) {
    _.assign(contact, updatedData);
  }

  function removeContact(uid) {
    return delete contactByUid[uid];
  }

  function onContactStatusUpdate(sourceContactUID, data, lastContactChanges) {
    var contact = contactByUid[data.uid];
    if (contact) {
      if (typeof data.status !== 'undefined') {
        var newStatus = parseInt(data.status);
        if (!isNaN(newStatus))
          contact.last_status = newStatus;
      }
      if (typeof data.idle !== 'undefined') {
        var idleStatus = parseInt(data.idle);
        if (!isNaN(idleStatus))
          contact.last_idle_status = idleStatus;
      }
      if (!lastContactChanges.createdIds.has(contact.uid) && !lastContactChanges.removedIds.has(contact.uid))
        lastContactChanges.changedIds.add(contact.uid);
    }
  }

  function onContactUpdate(sourceContactUID, data, lastContactChanges) {
    var contact = contactByUid[data.uid];
    if (contact) {
      updateContact(contact, data);
      if (!lastContactChanges.createdIds.has(contact.uid) && !lastContactChanges.removedIds.has(contact.uid)) {
        lastContactChanges.changedIds.add(contact.uid);
      }
    }
    else
      onContactAdd(sourceContactUID, data, lastContactChanges);
  }

  function onContactAdd(sourceContactUID, data, lastContactChanges) {
    if (!lastContactChanges.removedIds.has(data.uid)) {
      addContact(data);
      lastContactChanges.createdIds.add(data.uid);
      lastContactChanges.changedIds.delete(data.uid);
    }
  }

  function onContactDelete(sourceContactDelete, data, lastContactChanges) {
    if (removeContact(data.uid))
      lastContactChanges.removedIds.add(data.uid);
    lastContactChanges.changedIds.delete(data.uid);
    lastContactChanges.createdIds.delete(data.uid);
  }

  tvcMessageHandlers["contact_status_update"] = onContactStatusUpdate;
  tvcMessageHandlers["contact_update"] = onContactUpdate;
  tvcMessageHandlers["contact_add"] = onContactAdd;
  tvcMessageHandlers["contact_delete"] = onContactDelete;

  function applyTVCEvents(createdContactIds, changedContactIds, removedContactIds) {
    createdContactIds = createdContactIds ? createdContactIds : new Set();
    changedContactIds = changedContactIds ? changedContactIds : new Set();
    removedContactIds = removedContactIds ? removedContactIds : new Set();

    var events = tvcEvents;
    tvcEvents = [];

    var lastContactChanges = {
      createdIds: createdContactIds,
      changedIds: changedContactIds,
      removedIds: removedContactIds
    };
    events.forEach(function (event) {
      var messageHandler = tvcMessageHandlers[event.eventType];
      if (messageHandler)
        messageHandler(event.sourceContactUID, event.data, lastContactChanges);
    });
    triggerContactsChangedEvent(lastContactChanges);
  }

  function tvcListener(eventType, sourceContactUID, data) {
    if (interactionState === INTERACTION_STATES.offline)
      return;

    tvcEvents.push({
      eventType: eventType,
      sourceContactUID: sourceContactUID,
      data: data
    });
    if (interactionState === INTERACTION_STATES.online)
      applyTVCEvents();
  }

  function setInteractionState(state) {
    interactionState = state;
  }

  this.loadContacts = initialize;

  /**
   * Requests reloading contacts and updating their presence state and other properties.
   * Every 5 seconds a separate setInterval() checks if there were requests for reloading contacts
   * and does it if requested.
   */
  this.requestReloadingContacts = function() {
    shouldReloadContacts = true;
  };

  var reloadContactsIntervalID = null;
  var shouldReloadContacts = false;

  function scheduleReloadingContacts() {
    reloadContactsIntervalID = setInterval(function() {
      if (shouldReloadContacts)
        reloadContacts();
      shouldReloadContacts = false;
    }, 5000);
  }

  function unscheduleReloadingContacts() {
    clearInterval(reloadContactsIntervalID);
  }

  function reloadContacts() {
    var refreshedContacts = {};

    function addContacts(contactList) {
      _.each(contactList.list, function (contact) {
        refreshedContacts[contact.uid] = contact;
      });
    }

    return tvcRest.getContacts(true).then(function (contactList) {
      if (!contactList)
        throw new Error("Unable to load direct contact list");
      addContacts(contactList);
      return tvcRest.getContacts(false);
    }).then(function (contactList) {
      if (!contactList)
        throw new Error("Unable to load external contact list");
      addContacts(contactList);
      refreshContacts(refreshedContacts);
      applyTVCEvents();
    });
  }

  function initialize() {
    Object.keys(tvcMessageHandlers).forEach(function (tvcMessageType) {
      tvcWebSocket.addMessageListener(tvcMessageType, tvcListener);
    });
    setInteractionState(INTERACTION_STATES.initialization);

    return reloadContacts().then(function(data) {
      setInteractionState(INTERACTION_STATES.online);
      scheduleReloadingContacts();
      return data;
    });
  }

  function refreshContacts(refreshedContacts) {
    var createdContactIds = new Set();
    var changedContactIds = new Set();
    var removedContactIds = new Set();
    var oldContactsIds = new Set(Object.keys(contactByUid));
    for (var id in refreshedContacts) {
      if (oldContactsIds.has(id)) {
        updateContact(contactByUid[id], refreshedContacts[id]);
        changedContactIds.add(id);
      }
      else {
        addContact(refreshedContacts[id]);
        createdContactIds.add(id);
      }
      oldContactsIds.delete(id);
    }
    oldContactsIds.forEach(function (id) {
      removeContact(id);
      removedContactIds.add(id);
    });
    applyTVCEvents(createdContactIds, changedContactIds, removedContactIds)
  }

  this.setOfflineState = function () {
    if(interactionState === INTERACTION_STATES.offline)
      return;

    Object.keys(tvcMessageHandlers).forEach(function (tvcMessageType) {
      tvcWebSocket.removeMessageListener(tvcMessageType, tvcListener);
    });
    var updatedContacts = new Set();
    setInteractionState(INTERACTION_STATES.offline);
    unscheduleReloadingContacts();
    _.values(contactByUid).forEach(function (contact) {
      if (contact.last_status) {
        contact.last_status = 0;
        updatedContacts.add(contact.uid);
      }
    });
    applyTVCEvents(null, updatedContacts, null);
  };

  this.getDirectContacts = function () {
    return _.filter(_.values(contactByUid), function (contact) {
      return contact.type === "internal";
    });
  };

  this.getExternalContacts = function () {
    return _.filter(_.values(contactByUid), function (contact) {
      return contact.isExternal();
    });
  };

  this.getHootContacts = function () {
    return _.filter(_.values(contactByUid), function (contact) {
      return contact.isHoot();
    });
  };

  this.getRingdownContacts = function () {
    return _.filter(_.values(contactByUid), function (contact) {
      return contact.isRingdown();
    });
  };

  this.getAllContacts = function () {
    return _.values(contactByUid);
  };

  this.getContactByUid = function (uid) {
    return uid ? contactByUid[uid] : null;
  };

  this.createContact = function (uid, displayName, phoneNumber, type) {
    var contact = {
      display_name: displayName,
      phone_numbers: {
        intercluster: phoneNumber,
        internal: phoneNumber,
        international: phoneNumber
      },
      type: type,
      uid: uid
    };

    initContact(contact);
    return contact;
  }
}

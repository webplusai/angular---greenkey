function CallManagerService(gkt, tvc, sipManager, audioDevices, appConnection, gktConfig) {

  var CALL_STATUS = GKTConstants.CALL_STATUS;
  var SIP_EVENTS = GKTConstants.SIP_EVENTS;
  var CONNECTION_TYPE = GKTConstants.CONTACT_TYPE;
  this.CALL_STATUS = CALL_STATUS;
  this.SIP_EVENTS = SIP_EVENTS;
  this.CONNECTION_TYPE = CONNECTION_TYPE;

  var activeCalls = {};
  var inboundExternalCalls = {};
  var outboundExternalCalls = {};

  var connections = {};
  var connectionsIncoming = {};

  var hoots = {};
  var hootsIncoming = {};

  var externalConnections = {};
  var externalConnectionsIncoming = {};
  var externalConnectionsByDisplayName = {};

  var ringdowns = {};
  var ringdownsIncoming = {};

  var streams = [];
  var currentStream = undefined;

  var contactsManager = tvc.getContactManager();

  var connectionsInit = false;

  var connectionsInitializationPromises = new Set();

  var self = this;

  var streamChangeListeners = new Set();

  var incomingCallsListeners = new Set();

  var newConnectionsListeners = new Set();

  var onRemoveConnectionListeners = new Set();

  var updateConnectionListeners = new Set();

  this.addStreamChangeListener = function (listener) {
    streamChangeListeners.add(listener);
  };

  function fireStreamChanged(data) {
    streamChangeListeners.forEach(function (listener) {
      listener(data);
    });
  }

  this.addIncomingCallListener = function (listener) {
    incomingCallsListeners.add(listener);
  };

  this.addNewConnectionsListener = function (listener) {
    newConnectionsListeners.add(listener);
  };

  function fireNewConnection(connection) {
    newConnectionsListeners.forEach(function (listener) {
      listener(connection);
    });
  }

  this.addOnRemoveConnectionListener = function (listener) {
    onRemoveConnectionListeners.add(listener);
  };

  function fireConnectionRemoved(connection) {
    onRemoveConnectionListeners.forEach(function (listener) {
      listener(connection);
    });
  }

  this.addUpdateConnectionListener = function (listener) {
    updateConnectionListeners.add(listener);
  };

  function fireConnectionUpdated(connection) {
    updateConnectionListeners.forEach(function (listener) {
      listener(connection);
    });
  }

  function fireIncomingCall(target) {
    incomingCallsListeners.forEach(function (listener) {
      listener(target);
    });
  }

  this.removeStreamChangeListener = function (listener) {
    streamChangeListeners.delete(listener);
  };

  this.removeIncomingCallListener = function (listener) {
    incomingCallsListeners.delete(listener);
  };

  this.removeNewConnectionsListener = function (listener) {
    newConnectionsListeners.delete(listener);
  };

  this.removeOnRemoveConnectionListener = function (listener) {
    onRemoveConnectionListeners.delete(listener);
  };

  this.removeUpdateConnectionListener = function (listener) {
    updateConnectionListeners.delete(listener);
  };

  function getConnectionsInitializationPromise() {
    return new Promise(function (resolve) {
      connectionsInitializationPromises.add(resolve);
      if (connectionsInit && connectionsInitializationPromises.delete(resolve))
        resolve();
    });
  }

  function setConnectionsInitializationState(initialized) {
    if (initialized !== connectionsInit) {
      if (initialized) {
        var promises = connectionsInitializationPromises;
        connectionsInitializationPromises = new Set();
        connectionsInit = true;
        promises.forEach(function (resolve) {
          resolve();
        });
      }
      else
        connectionsInit = false;
    }
  }

  gkt.on(GKTConstants.APP_EVENTS.status_change, function (status) {
    _.each(connections, function (connection) {
      connection.setInteractionStatus(status)
    });
  });

  function onIncomingCall(session, call) {
    if (connectionsInit) {
      handleIncomingCall(session, call);
    }
  }

  sipManager.addIncomingCallListener(onIncomingCall);

  function queueStream(stream, ref) {
    //if there is not tracking and the connection requiring is
    //not finishing, new tracking is started
    //TODO: double lock checking
    streams.push({
      stream: stream,
      reference: ref
    });
    console.log('audio tracking stream queued ' + ref);

    if (!currentStream) {
      //a connections queue is created to reuse them
      //when the connected one is finished
      currentStream = stream;
      fireStreamChanged({stream: currentStream, reference: ref});
    }
    return currentStream;
  }

  function dequeueStream(reference) {
    for (var i = 0; i < streams.length; i++) {
      var current = streams[i];
      if (current.reference !== reference) {
        continue;
      } else {
        streams.splice(i, 1);
        if (i !== 0) {
          continue;
        } else if (streams.length > 0) {
          fireStreamChanged({stream: streams[0], reference: reference});
        } else {
          currentStream = undefined;
          fireStreamChanged({stream: streams[0], reference: reference});
        }
      }
    }
  }

  function removeActiveCall(connection) {
    dequeueStream(connection.uid);
    delete inboundExternalCalls[connection.uid];
    delete outboundExternalCalls[connection.uid];
    delete activeCalls[connection.uid];
  }

  function callStatusListener(event, connection) {
    var status = event.newStatus;

    var activeStates = [
      CALL_STATUS.active,
      CALL_STATUS.connecting,
      CALL_STATUS.muted
    ];
    var inactiveStates = [
      CALL_STATUS.disconnected,
      CALL_STATUS.canceled,
      CALL_STATUS.rejected,
      CALL_STATUS.connection_paused
    ];

    if (_.includes(inactiveStates, status)) {
      removeActiveCall(connection);
    } else if (_.includes(activeStates, status)) {
      activeCalls[connection.uid] = connection;
      queueStream(connection.getStream(), connection.uid);
    }
  }

  function offCallStatusListener(connection) {
    connection.onCallStatusChange(function () {}, true);
    connection.onSipTDMStatusChanged(function() {}, true);
  }

  function applyCallStatusListener(connection) {
    connection.onCallStatusChange(function (status) {
      callStatusListener(status, connection);
    });
    connection.onSipTDMStatusChanged(function(event){
      if(event.newStatus === GKTConstants.SIP_EVENTS.sipTDMIncomingConnectionRequest){
        fireIncomingCall(connection);
      }
    });
  }

  /**
   * Creates new connection from TVC data, adds it to corresponding lists and returns
   * connection object
   * @param {Object} contact json contact dat a
   * @returns {Connection} new connection object of correcponding type (HootConnection,
   * RingdownConnection, etc)
   * @private
   */
  function createNewConnection(contact) {
    if (connections[Connection.prototype.getConnectionUidByContactUid(contact.uid)]) {
      return null;
    }

    var newConnection;
    var isOnline = appConnection.getState() === appConnection.STATES.connected;

    if (contact.isHoot()) {
      newConnection = new HootConnection(contact, self, sipManager, tvc, audioDevices, isOnline);
      hoots[newConnection.uid] = newConnection;
      if (contact.type == GKTConstants.CONTACT_TYPE.internal && contact.phone_numbers.international) {
        var number = contact.phone_numbers.international.replace('+', '');
        hootsIncoming[number] = newConnection;
      }
    } else if (contact.isExternal()) {
      newConnection = new ExternalConnection(contact, self, sipManager, tvc, audioDevices, isOnline);
      externalConnections[newConnection.uid] = newConnection;
      externalConnectionsByDisplayName[contact.display_name] = newConnection;
      externalConnectionsIncoming[contact.phone_numbers.international] = newConnection;
    } else {
      var sipTDMContext = sipManager.getTDMContext(contact);
      newConnection = !sipTDMContext || !(sipTDMContext.connectionType === GKTConstants.CONTACT_TYPE.sipTDMRingdown)
        ? new RingdownConnection(contact, self, sipManager, tvc, audioDevices, isOnline)
        : new HootConnection(contact, self, sipManager, tvc, audioDevices, isOnline);
      ringdowns[newConnection.uid] = newConnection;
      ringdownsIncoming[contact.phone_numbers.international] = newConnection;
    }

    connections[newConnection.uid] = newConnection;
    connectionsIncoming[contact.phone_numbers.international] = newConnection;
    applyCallStatusListener(newConnection);

    newConnection.setInteractionStatus(gkt.getStatus());
    return newConnection;
  }

  function deleteConnection(connection) {
    if (!connections[connection.uid])
      return;

    connection.setInteractionStatus(GKTConstants.PRESENCE.offline);

    if (self.isHoot(connection)) {
      delete hoots[connection.uid];
      if (connection.contact.phone_numbers.international) {
        var number = connection.contact.phone_numbers.international.replace('+', '');
        delete hootsIncoming[number];
      }
    } else if (self.isExternal(connection)) {
      delete externalConnections[connection.uid];
      delete externalConnectionsByDisplayName[connection.contact.display_name];
      delete externalConnectionsIncoming[connection.contact.phone_numbers.international];
    } else {
      delete ringdowns[connection.uid];
      delete ringdownsIncoming[connection.contact.phone_numbers.international];
    }

    delete connections[connection.uid];
    delete connectionsIncoming[connection.contact.phone_numbers.international];
    offCallStatusListener(connection);

    if (connection.callStatus === CALL_STATUS.active ||
      connection.callStatus === CALL_STATUS.muted) {
      removeActiveCall(connection);
    }
  }

  function getContactByPhone(contactList, contactPhone) {
    var phone, call, plainPhone, phoneType, phoneExp;

    phone = _.isObject(contactPhone) ? (contactPhone.international || contactPhone.internal) : contactPhone;
    phoneType = (_.isObject(contactPhone) && !contactPhone.international) ? 'internal' : 'international';
    plainPhone = phone && phone.replace(/\+/g, '');
    phoneExp = new RegExp('^[+]?' + plainPhone + '$');

    call = _.find(contactList, function (conn) {
      return phoneExp.test(conn.contact.phone_numbers[phoneType]);
    });

    return call;
  }

  /**
   * Get a contact given its phone number.
   * @param {String} phone Phone number.
   * @returns {Connection || null} The contact that matches the phone.
   */
  this.getContactByPhone = function (phone) {
    return getContactByPhone(connectionsIncoming, phone);
  };

  /**
   * Checks if a given contact has a call in progress.
   * @param {Object} contact The contact to check.
   * @returns {Boolean} true if the contact is in a call.
   */
  this.isCallInProgress = function (contact) {
    var activeCall = getContactByPhone(activeCalls, contact.phone_numbers);
    return !!activeCall;
  };

  /**
   * This method is notified of all incoming calls  by the sip library, it delegates
   * the call to the correspondent connection or creates a new one if it is an external incoming call
   * @since version 0.1a
   * @param {Session} session Sip session
   * @ignore
   */
  function handleIncomingCall(session, call) {
    var from = call.callerNumber;
    var target = connectionsIncoming[from];
    if (target) {
      console.log(target);
      console.log("Handle incoming call");
      console.log(target.callStatus);
    }
    // The call id is generated adding the sessionid to the Caller Id
    // to avoid uid clashing when multiple calls have the same friendly name.
    // The typical case is when the Caller Id is "Anonymous"
    var callId = from.replace('+', '') + String(call.sessionId);

    if (!target) {
      var contact = contactsManager.createContact(callId, from, from, GKTConstants.CONTACT_TYPE.external);

      target = new ExternalConnection(contact, self, sipManager, tvc, audioDevices, true);

      applyCallStatusListener(target);
    } else {
      if (self.isCallInProgress(target.contact)) {
        console.warn('Simultaneous calls: dropping outbound call.');

        target.session.once(SIP_EVENTS.terminated, function () {
          target.callStatus = CALL_STATUS.connecting;
          handleIncomingCall(session, call);
        });

        target.hangup();

        return;
      }
    }

    fireIncomingCall(target);
    inboundExternalCalls[callId] = target;

    target.receive(session, call);
  }

  contactsManager.addContactsListener(function (createdIds, changedIds, removedIds) {
    createdIds.forEach(onContactCreated);
    changedIds.forEach(onContactUpdated);
    removedIds.forEach(onContactRemoved);
    setConnectionsInitializationState(true);
  });

  function onContactCreated(uid) {
    var contact = contactsManager.getContactByUid(uid);
    if (!contact) {
      onContactRemoved(uid);
      return;
    }

    console.info('New contact created:');
    console.info(contact);
    var newConnection = createNewConnection(contact);
    fireNewConnection(newConnection);
  }

  this.isHoot = function (connection) {
    var type = connection.type;
    return type === CONNECTION_TYPE.hoot || type === CONNECTION_TYPE.ransquawk ||
      type === CONNECTION_TYPE.conference;
  };

  this.isRingdown = function (connection) {
    return connection.type === CONNECTION_TYPE.ringdown || connection.type === CONNECTION_TYPE.sipTDMRingdown;
  };

  this.isExternal = function (connection) {
    return connection.type === CONNECTION_TYPE.external;
  };

  function connectionTypeWasChanged(contact, connection) {
    return contact.type !== undefined &&
      ((self.isHoot(connection) && !contact.isHoot())
      || (self.isExternal(connection) && !contact.isExternal())
      || (self.isRingdown(connection) && !contact.isRingdown()));
  }

  function onContactUpdated(uid) {
    var contact = contactsManager.getContactByUid(uid);
    if (!contact) {
      onContactRemoved(uid);
      return;
    }
    else
      console.log('Contact updated: ', contact);

    uid = Connection.prototype.getConnectionUidByContactUid(uid);
    var connection = connections[uid];
    if (!connection) {
      console.warn('Connection for updated contact does not exist');
      return;
    }

    if (connectionTypeWasChanged(contact, connection)) {
      // delete old typed connection
      deleteConnection(connection);
      fireConnectionRemoved(connection);
      // and create it again with proper type
      connection = createNewConnection(contact);
      fireNewConnection(connection);
      return;
    }
    connection.update(contact);
    fireConnectionUpdated(connection);
  }

  function onContactRemoved(uid) {
    console.log('Contact removed: ', uid);
    uid = Connection.prototype.getConnectionUidByContactUid(uid);
    var connection = connections[uid];
    if (!connection) {
      console.warn('Connection for removed contact does not exist');
      return;
    }
    deleteConnection(connection);
    fireConnectionRemoved(connection);
  }

  function handleShoutEvent (eventType, sourceContactUID, data) {
    if(gktConfig.getProperty("gkt.disableShoutEventsForSipTDMTesting")) {
      return;
    }

    var connectionUid = Connection.prototype.getConnectionUidByContactUid(sourceContactUID);
    var sourceHootConnection = hoots[connectionUid];
    if (sourceHootConnection) {
      //TODO "data" should be sent here but there were too much places to refactor
      //Sending fake "message" object here for a while
      var msg = {
        type: "shout-change",
        source_contact: sourceContactUID,
        data: data
      };
      sourceHootConnection._trigger('shout', msg);
    }

  }

  /*
   * Custom "shout" type triggered with "Send message to another client" websocket msg.
   * It's sent when user clicks Shout button on a hoot.
   */
  tvc.addMessageListener("shout", handleShoutEvent);

  /*
   * Big TVB sends "shout_change" websocket peer-to-peer
   * messages when user clicks Shout button on a team hoot.
   */
  tvc.addMessageListener("shout_change", handleShoutEvent);

  tvc.addMessageListener("redial_team_hoot", function(eventType, sourceContactUID, data) {
    var connectionUid = Connection.prototype.getConnectionUidByContactUid(data.uid);
    var sourceHootConnection = data ? hoots[connectionUid] : null;
    if (sourceHootConnection) {
      sourceHootConnection.hangup();
    }
  });

  tvc.addMessageListener("i_am_online", function(eventType, sourceContactUID, data) {
    var connectionUid = Connection.prototype.getConnectionUidByContactUid(sourceContactUID);
    if (!connectionUid) {
      GKTLog.sendAppEvent("presence.warning", {
        message: "Received \"i_am_online\" from unknown/offline contact. Possible presence problem." +
        "Contact uid: " + sourceContactUID
      });
      tvc.getContactManager().requestReloadingContacts();
      return;
    }
    var sourceHootConnection = data ? hoots[connectionUid] : null;
    if (!sourceHootConnection || !sourceHootConnection.isOnline()) {
      GKTLog.sendAppEvent("presence.warning", {
        message: "Received \"i_am_online\" from unknown/offline contact. Possible presence problem." +
        "Contact uid: " + sourceContactUID
      });
      tvc.getContactManager().requestReloadingContacts();
      return;
    }
  });

  /**
   * Retrieves the ringdown contacts
   * @since version 0.1a
   * @param {string} status Sets the status, accepted value are: <i>online</i>, <i>offline</i>.
   * @param {GKT~onlineStatusListener} listener Connection status listener, it will be notified of all the changes in the connection status, it will be ovewritten every time this method is called with a non undefined callback
   * @param {error} error
   * @returns {Promise} when resolved it returns an array containing the ringdowns
   */
  this.createExternalConnection = function (destination, name) {
    var sessionId = parseInt(Math.random() * 1000);
    //the call id is generated adding a random number to the Caller Id
    //to avoid uid clashing when multiple calls have the same friendly name.
    //The typical case is calling a number with multiple extensions
    var callId = destination + String(sessionId);


    var contact = contactsManager.createContact(callId, name || destination, destination,
      GKTConstants.CONTACT_TYPE.external);

    var target = new ExternalConnection(contact, self, sipManager, tvc, audioDevices, true);
    applyCallStatusListener(target);

    outboundExternalCalls[callId] = target;
    return target;
  };

  var getExternalConnectionByContactId = function(id){
    var connection = _.filter(_.values(outboundExternalCalls), function (h) {
      return h.contact.uid === id || h.uid === id;
    })[0];

    return connection;
  };

  this.getAllConnections = function () {
    return getConnectionsInitializationPromise().then(function () {
      return _.values(connections);
    });
  };

  this.getConnectionByContactId = function(id){
    return getConnectionsInitializationPromise().then(function () {
      var connection = _.filter(_.values(connections), function (h) {
        return h.contact.uid === id || h.uid === id;
      })[0];

      if (connection) {
        return connection;
      } else {
        return getExternalConnectionByContactId(id) || connections[id];
      }
    });
  };

  this.getExternalConnectionsByName = function (nameRegExp) {
    return new Promise(function (resolve) {
      self.getExternalConnections().then(function (data) {
        var list = _.values(data);
        var filteredList = _.filter(list, function (item) {
          return nameRegExp.test(item.contact.display_name);
        });
        resolve(filteredList);
      });
    });
  };

  this.getActiveConnectionsByType = function (types) {
    var result = [];
    var defaultGroups = [
      GKTConstants.CONTACT_TYPE.ringdown,
      GKTConstants.CONTACT_TYPE.external
    ];
    var groups = types || defaultGroups;
    var keys = Object.keys(activeCalls);

    keys.forEach(function (key) {
      if (groups.indexOf(activeCalls[key].type) >= 0) {
        result.push(activeCalls[key]);
      }
    });
    return result;
  };

  this.getCurrentConnections = function(){
    return _.clone(connections);
  };

  this.getCurrentHootConnections = function () {
    return _.clone(hoots);
  };

  /**
   * This callback is used to retrieve the hoots.
   *
   * @callback GKT~hootsSuccess
   * @param {Object} hoots - Map of HootConnection indexed by number
   */

  /**
   * Retrieves the hoots contacts
   * @since version 0.1a
   * @returns {Promise} when resolved it returns an array containing the hoots
   */
  this.getHootConnections = function () {
    return getConnectionsInitializationPromise().then(function () {
      return _.clone(hoots);
    });
  };

  this.getCurrentRingdownConnections = function () {
    return _.clone(ringdowns);
  };

  /**
   * This callback is used to retrieve the ringdowns.
   *
   * @callback GKT~ringdownsSuccess
   * @param {Object} ringdowns - Map of Connection indexed by number
   */

  /**
   * Retrieves the ringdown contacts
   * @since version 0.1a
   * @param {GKT~ringdownsSuccess} [success]
   * @param {error} [error]
   * @returns {Promise} when resolved it returns an array containing the ringdowns
   */
  this.getRingdownConnections = function () {
    return getConnectionsInitializationPromise().then(function () {
      return _.clone(ringdowns);
    });
  };

  /**
   * Returns external contacts marked as speed dial
   * @return Promise
   */
  this.getSpeedDialConnections = function () {
    return new Promise(function (resolve, reject) {
      self.getExternalConnections()
        .then(function (connections) {
          // todo: this code could be replaced with _.pickBy() when lodash will be updated to 4+ version
          var speedDialContacts = {};
          _.each(connections, function (connection, contactUid) {
            if (connection instanceof ExternalConnection && connection.contact.favorite) {
              speedDialContacts[contactUid] = connection;
            }
          });
          resolve(speedDialContacts);
        })
        .catch(function (error) {
          reject(error);
        });
    });
  };


  /**
   * Retrieves the external contacts
   * @since version 0.1a
   * @param {GKT~externalContactsSuccess} [success]
   * @param {error} [error]
   * @returns {Promise} when resolved it returns an array containing the external contacts
   */
  this.getExternalConnections = function () {
    return getConnectionsInitializationPromise().then(function () {
      return _.clone(externalConnections);
    });
  };

  this.getExternalConnectionByDisplayName = function (displayName) {
    return getConnectionsInitializationPromise().then(function () {
      return externalConnectionsByDisplayName[displayName];
    });
  };

  this.muteAllHoots = function () {
    _.each(hoots, function (hoot) {
      if (hoot.isShouting()) {
        hoot.mute();
        hoot.sendShoutStatus();
      }
    });
  };

}

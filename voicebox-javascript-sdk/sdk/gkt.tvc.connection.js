var TVC_CONNECTION_STATES = {
  disconnected: "disconnected",
  connecting_via_web_socket: "connecting_via_web_socket",
  contacts_initialization: "contacts_initialization",
  contacts_initialization_fail_reinitialization_scheduled: "contacts_initialization_fail_reinitialization_scheduled",
  connected: "connected",
  disconnecting: "disconnecting",
  force_logout: "force_logout"
};

function TVCConnectionManger(tvcWebSocket, contactManager) {
  var TRIGGERS = {
    connect: "connect",
    disconnected: "disconnected",
    tvc_web_socket_connection_established: "tvc_web_socket_connection_established",
    tvc_web_socket_connection_is_not_established: "tvc_web_socket_connection_is_not_established",
    contacts_initialization_fail: "contacts_initialization_fail",
    contacts_initialization_success: "contacts_initialization_success",
    disconnect: "disconnect",
    server_returned_unauthorized: "server_returned_unauthorized"
  };

  var stateListeners = new Set();

  var planContactsInitialization = new function () {
    var counter = 0;
    var timerId = null;
    var res = function () {
      var sleepIntervalInMilliseconds = (counter++ < 10 ? 1 : 15) * 1000;
      timerId = setTimeout(connectionManager.connect, sleepIntervalInMilliseconds);
    };

    res.stopTimer = function () {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    res.resetCounter = function () {
      counter = 0;
    };

    return res;
  };

  var connectionControllerConfig = {
    eventListeners: {
      "transition": [function (data) {
        console.log((new Date()).toLocaleTimeString() + " TVC connection state changed, old state: " + data.fromState + ", new state: " + data.toState);
        triggerStateChangeEvent(data.fromState, data.toState);
      }]
    },

    initialState: TVC_CONNECTION_STATES.disconnected,

    initialize: function (options) {
    },

    states: {
      force_logout: {
        //dead end. refresh page.
      },

      disconnected: {
        connect: TVC_CONNECTION_STATES.connecting_via_web_socket,
        server_returned_unauthorized: TVC_CONNECTION_STATES.force_logout,

        _onExit: function () {
          tvcWebSocket.removeStateListener(tvcWebSocketStateListener);
        }
      },

      disconnecting: {
        _onEnter: disconnect,
        disconnected: TVC_CONNECTION_STATES.disconnected,
        server_returned_unauthorized: TVC_CONNECTION_STATES.force_logout,
        tvc_web_socket_connection_is_not_established: function () {
          if (tvcWebSocket.getState() === TVCWebSocketStates.CLOSED)
            handle(TRIGGERS.disconnected);
        }
      },

      connecting_via_web_socket: {
        _onEnter: connectTVCWebSocket,

        tvc_web_socket_connection_established: TVC_CONNECTION_STATES.contacts_initialization,
        tvc_web_socket_connection_is_not_established: TVC_CONNECTION_STATES.disconnecting,
        disconnect: TVC_CONNECTION_STATES.disconnecting,
        server_returned_unauthorized: TVC_CONNECTION_STATES.force_logout,

        _onExit: function () {
          planContactsInitialization.resetCounter();
        }
      },

      contacts_initialization: {
        _onEnter: initializeContacts,

        contacts_initialization_success: TVC_CONNECTION_STATES.connected,
        contacts_initialization_fail: TVC_CONNECTION_STATES.contacts_initialization_fail_reinitialization_scheduled,
        tvc_web_socket_connection_is_not_established: TVC_CONNECTION_STATES.disconnecting,
        disconnect: TVC_CONNECTION_STATES.disconnecting,
        server_returned_unauthorized: TVC_CONNECTION_STATES.force_logout
      },

      contacts_initialization_fail_reinitialization_scheduled: {
        _onEnter: planContactsInitialization,

        connect: TVC_CONNECTION_STATES.contacts_initialization,
        tvc_web_socket_connection_is_not_established: TVC_CONNECTION_STATES.disconnecting,
        disconnect: TVC_CONNECTION_STATES.disconnecting,
        server_returned_unauthorized: TVC_CONNECTION_STATES.force_logout,

        _onExit: function () {
          planContactsInitialization.stopTimer();
        }

      },

      connected: {
        tvc_web_socket_connection_is_not_established: TVC_CONNECTION_STATES.disconnecting,
        disconnect: TVC_CONNECTION_STATES.disconnecting,
        server_returned_unauthorized: TVC_CONNECTION_STATES.force_logout
      }
    }
  };

  var connectionManager = new machina.Fsm(connectionControllerConfig);
  connectionManager.CONNECTION_STATES = TVC_CONNECTION_STATES;
  connectionManager.on("transition", function (data) {
    console.info("gkt.tvc.connection: " + data.action + "--> " + data.toState);
  });

  var tvcWebSocketStateListener = function (eventType, code) {
    if (code === 4001) {
      handle(TRIGGERS.server_returned_unauthorized);
    } else if (eventType === TVCWebSocketStateEvents.ERROR
      || (eventType === TVCWebSocketStateEvents.CLOSED
      && code !== 1000)) {
      handle(TRIGGERS.tvc_web_socket_connection_is_not_established);
    } else if (eventType === TVCWebSocketStateEvents.CLOSED) {
      handle(TRIGGERS.disconnected);
    }

  };

  function handle(trigger) {
    connectionManager.handle(trigger);
  }

  function connectTVCWebSocket() {
    tvcWebSocket.addStateListener(tvcWebSocketStateListener);
    tvcWebSocket.connectToTVC().then(function () {
        handle(TRIGGERS.tvc_web_socket_connection_established);
      },
      function (err) {
        if (err && err.code && err.code === 4001) {
          handle(TRIGGERS.server_returned_unauthorized);
        } else {
          handle(TRIGGERS.tvc_web_socket_connection_is_not_established);
          console.error("Unable to establish connection via TVC WebSocket." + (err && err.message) ? " " + err.message : "");
        }
      });
  }

  function disconnect() {
    contactManager.setOfflineState();
    tvcWebSocket.disconnectFromTVC();
    if (tvcWebSocket.getState() === TVCWebSocketStates.CLOSED)
      handle(TRIGGERS.disconnected);
  }

  function initializeContacts() {
    contactManager.loadContacts().then(function () {
        handle(TRIGGERS.contacts_initialization_success);
      },
      function () {
        contactManager.setOfflineState();
        handle(TRIGGERS.contacts_initialization_fail);
      });
  }

  function triggerStateChangeEvent(oldState, newState) {
    stateListeners.forEach(function (listener) {
      listener(oldState, newState);
    });
  }

  connectionManager.addStateListener = function (listener) {
    stateListeners.add(listener);
  };

  connectionManager.removeStateListener = function (listener) {
    return stateListeners.delete(listener);
  };

  function getPromiseForTargetState(action, targetState) {
    return new Promise(function (resolve) {
      var stateListener = function (oldState, newState) {
        if (newState === targetState && connectionManager.removeStateListener(stateListener))
          resolve();
      };
      connectionManager.addStateListener(stateListener);
      if (connectionManager.compositeState() === targetState
        && connectionManager.removeStateListener(stateListener))
        resolve();
      else
        action();
    });
  }

  connectionManager.connect = function () {
    return getPromiseForTargetState(function () {
      handle(TRIGGERS.connect);
    }, TVC_CONNECTION_STATES.connected)
  };

  connectionManager.disconnect = function () {
    return getPromiseForTargetState(function () {
      handle(TRIGGERS.disconnect);
    }, TVC_CONNECTION_STATES.disconnected)
  };

  return connectionManager;
}
/**
 *
 * @returns {*}
 * @constructor GlobalAppConnectionManagerService
 */
function GlobalAppConnectionManagerService(tvc) {
  'use strict';

  var STATES = {
    connected: "connected",
    connecting_to_tvc: "connecting_to_tvc",
    tvc_connection_problem: "tvc_connection_problem",
    tvc_reconnect_scheduled: "tvc_reconnect_scheduled",
    connecting_to_telephony_server: "connecting_to_telephony_server",
    telephony_server_connection_problem_reconnect_scheduled: "telephony_server_connection_problem_reconnect_scheduled",
    disconnecting: "disconnecting",
    disconnected: "disconnected",
    force_logout: "force_logout"
  };

  var TRIGGERS = {
    connect: "connect",
    disconnect: "disconnect",
    disconnected: "disconnected",
    tvc_connection_established: "tvc_connection_established",
    tvc_connection_is_not_established: "tvc_connection_is_not_established",
    telephony_protocol_is_not_registered: "telephony_protocol_is_not_registered",
    telephony_protocol_registered: "telephony_protocol_registered",
    tvc_force_logout: "tvc_force_logout"
  };

  var stateChangeListeners = new Set();

  var machineConfig = {

    STATES: STATES,
    TRIGGERS: TRIGGERS,

    initialize: function (options) {
    },

    initialState: STATES.disconnected,

    eventListeners: {
      "transition": [function (data) {
        console.info("gkt.connection: " + data.action + "--> " + data.toState);
        triggerStateChangeEvent(data.fromState, data.toState);
      }]
    },

    states: {
      force_logout: {
        _onEnter: closeNonTVCConnections
        //dead end. refresh page.
      },

      disconnected: {
        connect: STATES.connecting_to_tvc,
        tvc_force_logout: STATES.force_logout,

        _onExit: function () {
          init();
          planTVCReconnection.resetCounter();
          planTelephonyServerReconnection.resetCounter();
        }
      },

      disconnecting: {
        _onEnter: function () {
          closeConnections().then(function () {
            clear();
            handleDisconnected();
          });
        },
        disconnected: STATES.disconnected,
        tvc_force_logout: STATES.force_logout
      },

      connecting_to_tvc: {
        _onEnter: function () {
          tvc.connect().then(handleConnectedToTVC);
        },

        tvc_connection_established: STATES.connecting_to_telephony_server,
        tvc_connection_is_not_established: STATES.tvc_connection_problem,
        tvc_force_logout: STATES.force_logout,
        disconnect: STATES.disconnecting
      },

      tvc_connection_problem: {
        _onEnter: function () {
          closeConnections().then(handleDisconnected);
        },
        disconnect: STATES.disconnecting,
        tvc_force_logout: STATES.force_logout,
        disconnected: STATES.tvc_reconnect_scheduled
      },

      tvc_reconnect_scheduled: {
        _onEnter: function () {
          planTVCReconnection();
        },

        connect: STATES.connecting_to_tvc,
        tvc_force_logout: STATES.force_logout,
        disconnect: STATES.disconnecting,

        _onExit: function () {
          planTVCReconnection.stopTimer();
        }
      },

      connecting_to_telephony_server: {
        _onEnter: function () {
          planTVCReconnection.resetCounter();
          SipManager.register();
        },

        tvc_connection_is_not_established: STATES.tvc_connection_problem,
        telephony_protocol_is_not_registered: STATES.telephony_server_connection_problem_reconnect_scheduled,
        telephony_protocol_registered: STATES.connected,
        tvc_force_logout: STATES.force_logout,
        disconnect: STATES.disconnecting
      },

      telephony_server_connection_problem_reconnect_scheduled: {
        _onEnter: function () {
          SipManager.logout();
          planTelephonyServerReconnection();
        },

        tvc_connection_is_not_established: STATES.tvc_connection_problem,
        connect: STATES.connecting_to_telephony_server,
        tvc_force_logout: STATES.force_logout,
        disconnect: STATES.disconnecting,

        _onExit: function () {
          planTelephonyServerReconnection.stopTimer();
        }
      },

      connected: {

        _onEnter: function () {
          sendStatusUpdateToTVC(true);
          planTelephonyServerReconnection.resetCounter();
          window.setTimeout(function() { sendCurStatusToTVC(); }, 1000);
          window.setTimeout(function() { sendCurStatusToTVC(); }, 3000);
          window.setTimeout(function() { sendCurStatusToTVC(); }, 5000);
          window.setTimeout(function() { sendCurStatusToTVC(); }, 7000);
        },

        tvc_connection_is_not_established: STATES.tvc_connection_problem,
        telephony_protocol_is_not_registered: STATES.telephony_server_connection_problem_reconnect_scheduled,
        disconnect: STATES.disconnecting,
        tvc_force_logout: STATES.force_logout,

        _onExit: function () {
          sendStatusUpdateToTVC(false);
          //Dirty workaround to avoid race conditions in presence processing on TVC side in case of
          //simultaneous network problems on both hoot sides
          window.setTimeout(function() { sendCurStatusToTVC(); }, 1000);
          window.setTimeout(function() { sendCurStatusToTVC(); }, 3000);
          window.setTimeout(function() { sendCurStatusToTVC(); }, 5000);
          window.setTimeout(function() { sendCurStatusToTVC(); }, 7000);
        }
      }
    },

    connect: function () {
      if (stateMachine.getState() === STATES.force_logout)
        return Promise.reject();
      return getPromiseForTargetState(handleConnect, STATES.connecting_to_tvc);
    },

    disconnect: function () {
      if (stateMachine.getState() === STATES.force_logout)
        return Promise.resolve();
      return getPromiseForTargetState(handleDisconnect, STATES.disconnected);
    },

    addStateListener: function (listener) {
      stateChangeListeners.add(listener);
    },

    removeStateListener: function (listener) {
      return stateChangeListeners.delete(listener);
    }
  };

  function getPromiseForTargetState(action, targetState) {
    return new Promise(function (resolve) {
      var stateListener = function (oldState, newState) {
        if (newState === targetState && stateMachine.removeStateListener(stateListener))
          resolve();
      };
      stateMachine.addStateListener(stateListener);
      if (stateMachine.compositeState() === targetState
        && stateMachine.removeStateListener(stateListener))
        resolve();
      else
        action();

    });
  }

  var tvcStateListener = function (oldState, newState) {
    if (newState === tvc.CONNECTION_STATES.force_logout) {
      handleTVCForceLogout();
    } else if (oldState === tvc.CONNECTION_STATES.connected || newState === tvc.CONNECTION_STATES.disconnected) {
      handleTVCConnectionFail();
    }
  };


  var telephonyServerStateListener = function (type, event) {
    if (type === SipManager.events.unregistered || type === SipManager.events.disconnected
      || type === SipManager.events.registration_failed)
      stateMachine.handle(TRIGGERS.telephony_protocol_is_not_registered);
    if (type === SipManager.events.registered)
      stateMachine.handle(TRIGGERS.telephony_protocol_registered);
  };

  function init() {
    tvc.addStateListener(tvcStateListener);
    SipManager.addStateListener(telephonyServerStateListener);
  }

  function clear() {
    tvc.removeStateListener(tvcStateListener);
    SipManager.removeStateListener(telephonyServerStateListener);
  }

  var stateMachine = new machina.Fsm(machineConfig);

  function closeConnections() {
    SipManager.logout();
    return tvc.disconnect();
  }

  function closeNonTVCConnections() {
    SipManager.logout();
  }

  function handleConnectedToTVC() {
    stateMachine.handle(TRIGGERS.tvc_connection_established)
  }

  function handleTVCConnectionFail() {
    stateMachine.handle(TRIGGERS.tvc_connection_is_not_established);
  }

  function handleTVCForceLogout() {
    stateMachine.handle(TRIGGERS.tvc_force_logout);
  }

  function handleConnect() {
    stateMachine.handle(TRIGGERS.connect);
  }

  function handleDisconnect() {
    stateMachine.handle(TRIGGERS.disconnect);
  }

  function handleDisconnected() {
    stateMachine.handle(TRIGGERS.disconnected);
  }

  var planTVCReconnection = new function () {
    var counter = 0;
    var timerId = null;
    var res = function () {
      var sleepIntervalInMilliseconds = (counter++ < 6 ? 1 : 15) * 1000;
      timerId = setTimeout(handleConnect, sleepIntervalInMilliseconds);
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

  var planTelephonyServerReconnection = new function () {
    var counter = 0;
    var timerId = null;
    var res = function () {
      if (counter < 3) {
        timerId = setTimeout(handleConnect, (15000 * Math.pow(2, counter)));
        ++counter;
      }
      else
        handleDisconnect();
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

  function triggerStateChangeEvent(oldState, newState) {
    stateChangeListeners.forEach(function (listener) {
      listener(oldState, newState);
    });
  }

  function sendStatusUpdateToTVC(boolOnline) {
    tvc.sendMessageToTVC("tvb_status_update", {
      "new_status": (boolOnline ? 1 : 0)
    });
  }

  function sendCurStatusToTVC() {
    sendStatusUpdateToTVC(stateMachine.getState() === STATES.connected);
  }

  stateMachine.getState = function(){
    return stateMachine.compositeState();
  };


  return stateMachine;
}

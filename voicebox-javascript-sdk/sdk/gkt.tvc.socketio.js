'use strict';

/**
 * Provides methods for network interoperation with Trader Voice Command (TVC)
 * server WebSocket API.
 *
 * @constructor
 *
 * @param {string} urlSocketIO URL of TVC web socket endpoint. Should contain all auth data in its params.
 *
 */
function TVCSocketIO() {

  var STATES = {
    connected: "connected",
    connecting: "connecting",
    waiting_before_reconnect: "waiting_before_reconnect",
    waiting_for_config_params: "waiting_for_config_params"
  };

  var TRIGGERS = {
    configured: "configured",
    logout: "logout",
    connected: "connected",
    reconnect_delay_finished: "reconnect_delay_finished",
    should_reconnect_after_delay: "should_reconnect_after_delay"
  };

  var stateMachineConfig = {
    initialState: STATES.waiting_for_config_params,
    initialize: function (options) {
    },
    states: {

      waiting_for_config_params: {
        _onEnter: clearExistingSocketIO,
        configured: STATES.connecting,
        connected: badTrigger(STATES.waiting_for_config_params, TRIGGERS.connected),
        logout: undefined,
        reconnect_delay_finished: badTrigger(STATES.waiting_for_config_params, TRIGGERS.reconnect_delay_finished),
        should_reconnect_after_delay: badTrigger(STATES.waiting_for_config_params, TRIGGERS.should_reconnect_after_delay)
      },

      connected: {
        _onEnter: undefined,
        _onExit: clearExistingSocketIO,
        configured: STATES.connecting,
        connected: badTrigger(STATES.connected, TRIGGERS.connected),
        logout: STATES.waiting_for_config_params,
        reconnect_delay_finished: badTrigger(STATES.connected, TRIGGERS.reconnect_delay_finished),
        should_reconnect_after_delay: STATES.waiting_before_reconnect
      },

      connecting: {
        _onEnter: connectToTVC,
        _onExit: clearConnectingTimeout,
        configured: STATES.waiting_before_reconnect,
        connected: STATES.connected,
        logout: STATES.waiting_for_config_params,
        reconnect_delay_finished: badTrigger(STATES.connecting, TRIGGERS.reconnect_delay_finished),
        should_reconnect_after_delay: STATES.waiting_before_reconnect
      },

      waiting_before_reconnect: {
        _onEnter: planReconnect,
        _onExit: resetPlanningReconnect,
        configured: STATES.connecting,
        connected: badTrigger(STATES.waiting_before_reconnect, TRIGGERS.connected),
        logout: STATES.waiting_for_config_params,
        reconnect_delay_finished: STATES.connecting,
        should_reconnect_after_delay: badTrigger(STATES.waiting_before_reconnect, TRIGGERS.should_reconnect_after_delay)
      }
    }
  };

  var reconnectTimeoutID = null;

  function planReconnect() {
    clearExistingSocketIO();
    clearTimeout(reconnectTimeoutID);
    setTimeout(function () {
      stateMachine.handle(TRIGGERS.reconnect_delay_finished);
    }, 5000);
  }

  function resetPlanningReconnect() {
    clearTimeout(reconnectTimeoutID);
  }

  function badTrigger(curState, trigger) {
    return function () {
      var msg = "Bad trigger in socket.io state machine. State: " + curState + ", trigger: " + trigger;
      console.error(msg);
      GKTLog.sendAppEvent("tvc.socketio.bad_trigger", {'message': msg});
    }
  }

  var stateMachine = new machina.Fsm(stateMachineConfig);
  stateMachine.CONNECTION_STATES = STATES;
  stateMachine.on("transition", function (data) {
    console.info("Socket.io: " + data.action + "--> " + data.toState);
  });

  var TOTAL_SIZE_OF_STRINGS_IN_MESSAGE = 10 * 1000;

  var urlSocketIO = null;

  var pathSocketIO = null;

  var socketIO = null;

  var socketIOMessageListeners = {};

  var accessTokenSocketIO = null;


  /**
   * Listener for incoming messages from TVC websocket.
   *
   * @callback TVC~socketMessageListener
   * @param {string} type String message type sefining the structure of the message "data".
   * @param {string} source_contact For peer-to-peer messages sent by direct contacts: UID of the direct contact.
   *                                        For messages created by TVC itself - undefined.
   * @param {Object} data Body of the message.
   */

  /**
   * Adds a listener for incoming websocket messages from TVC.
   *
   * TVC sends messages of the following format:
   *                   {
     *                      eventType: [message type string],
     *                      sourceContactUID: [uid of the contact who sent the message
     *                                          - if it is peer to peer message,
     *                                       undefined
     *                                          - if the message is from TVC itself],
     *                      data: {[object having structure depending on message type]}
     *                   }
   * In the installable TVB Java app there are classes based on this message structure.
   * Changes to the format should be done very carefully.
   * @param {string} messageType String message type specifying what is sent in the "data" field.
   * @param {TVC~socketIOMessageListener} listener Callback function receiving message with fields:
   *                                      type, source_contact, data.
   */
  this.addMessageListener = function (messageType, listener) {
    if (socketIOMessageListeners[messageType] === undefined)
      socketIOMessageListeners[messageType] = new Set();

    socketIOMessageListeners[messageType].add(listener);
  };

  /**
   * Remove TVC websocket message listener.
   * @param {string} messageType String message type.
   * @param {TVC~socketIOMessageListener} listener Listener to be removed.
   */
  this.removeMessageListener = function (messageType, listener) {
    if (socketIOMessageListeners[messageType] === undefined)
      return;
    socketIOMessageListeners[messageType].delete(listener);
  };


  /**
   * Send socket.io message to TVC.
   * @param {string} messageType Type of the message.
   * @param {Object} data Body of the message having structure depending on the message type.
   * @returns {Promise}
   */
  this.sendMessageToTVC = function (messageType, data) {
    if (socketIO) {
      return new Promise(function(resolve, reject) {
        socketIO.emit(messageType, prepareMessage(data), resolve);
        setTimeout(reject, 3000);
      });
    } else {
      return Promise.reject();
    }
  };

  function truncateData(data, size) {
    var toTruncate = {};

    function strLen(key) {
      var truncated = toTruncate[key];
      return data[key].length - (truncated ? truncated : 0);
    }

    function truncate(key, cutSize) {
      if (toTruncate[key])
        toTruncate[key] += cutSize;
      else
        toTruncate[key] = cutSize;
    }

    while (size > 0) {
      var prevBiggestStrLen = 0;
      var biggestStrKeys = [];
      for (var key in data) {
        if (typeof  data[key] !== "string")
          continue;
        var len = strLen(key);
        if (len > prevBiggestStrLen) {
          if (biggestStrKeys.length > 0) {
            var biggestLen = strLen(biggestStrKeys[0]);
            if (biggestLen < len) {
              prevBiggestStrLen = strLen(biggestStrKeys[0]);
              biggestStrKeys = [];
              biggestStrKeys.push(key);
            }
            else if (biggestLen === len)
              biggestStrKeys.push(key);
            else if (prevBiggestStrLen < len)
              prevBiggestStrLen = len;
          }
          else
            biggestStrKeys.push(key);
        }
      }
      var cutSize = (strLen(biggestStrKeys[0]) - prevBiggestStrLen) * biggestStrKeys.length;
      cutSize = Math.min(size, cutSize);
      var cutStep = parseInt(cutSize / biggestStrKeys.length);
      biggestStrKeys.forEach(function (key) {
        truncate(key, cutStep);
      });
      var tailLen = cutSize - (cutStep * biggestStrKeys.length);
      if (tailLen > 0) {
        _.forEach(biggestStrKeys, function (key) {
          truncate(key, 1);
          if (tailLen > 1)
            tailLen -= 1;
          else
            return false;
        });
      }
      size -= cutSize;
    }

    for (var truncKey in toTruncate) {
      var baseStr = data[truncKey];
      baseStr = baseStr.substr(0, baseStr.length - (toTruncate[truncKey] + 3));
      data[truncKey] = baseStr + "...";
    }
  }

  function prepareMessage(data) {
    var strSize = 0;
    for (var key in data) {
      if (typeof data[key] === "object")
        delete data[key];
      else if (typeof  data[key] === "string")
        strSize += data[key].length;
    }
    if (TOTAL_SIZE_OF_STRINGS_IN_MESSAGE < strSize)
      truncateData(data, strSize - TOTAL_SIZE_OF_STRINGS_IN_MESSAGE);

    return EncodingUtil.stringifyJSONIgnoringCircularRefs(data);
  }

  var socketIOMessageRouter = function (message) {
    if (!message || !message.data)
      return;
    var obj = message.data ? JSON.parse(message.data) : undefined;
    if (!obj || !obj.type)
      return;
    var listenerSet = socketIOMessageListeners[obj.type];
    if (listenerSet)
      listenerSet.forEach(function (listener) {
        if (listener)
          listener(obj.type, obj.source_contact, obj.data);
      });
  };

  var connectTimeoutID = null;

  function clearConnectingTimeout() {
    clearTimeout(connectTimeoutID);
  }
  function clearExistingSocketIO() {
    if (socketIO != null) {
      socketIO.off('connect');
      socketIO.off('connect_error');
      socketIO.off('connect_timeout');
      socketIO.off('reconnecting');
      socketIO.off('reconnect');
      socketIO.off('reconnect_error');
      socketIO.off('reconnect_failed');
      socketIO.off('disconnect');
      socketIO.disconnect();
      clearConnectingTimeout();
      socketIO = null;
    }
  }

  function connectToTVC() {
    clearExistingSocketIO();
    console.log("Connecting to TVC Socket.IO: ", urlSocketIO);
    socketIO = io.connect(urlSocketIO, {
      path: pathSocketIO,
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
      query: "accessToken=" + accessTokenSocketIO
    });

    function socketIOMaybeConnected() {
      if (socketIO && socketIO.connected) {
        stateMachine.handle(TRIGGERS.connected);
      }
    }

    socketIO.on("connect", socketIOMaybeConnected);

    socketIO.on("connect_error", function (error) {
      clearExistingSocketIO();
      console.error("Error connecting to TVC socket.io", urlSocketIO, -1, JSON.stringify(error));
      stateMachine.handle(TRIGGERS.should_reconnect_after_delay);
    });

    socketIO.on("connect_timeout", function (error) {
      clearExistingSocketIO();
      console.error("TVC socket.io connecting timeout", urlSocketIO, -1, JSON.stringify(error));
      stateMachine.handle(TRIGGERS.should_reconnect_after_delay);
    });


    socketIO.on("reconnecting", function (num) {
      console.log("TVC socket.io reconnect attempt: " + num + "...");
    });

    socketIO.on("reconnect", function (num) {
      console.log("TVC socket.io reconnected after " + num + " retries.");
    });

    socketIO.on("reconnect_error", function (error) {
      clearExistingSocketIO();
      console.error("TVC socket.io reconnect error", error);
      stateMachine.handle(TRIGGERS.should_reconnect_after_delay);
    });

    socketIO.on("reconnect_failed", function (error) {
      clearExistingSocketIO();
      console.error("TVC socket.io reconnect failed", error);
      stateMachine.handle(TRIGGERS.should_reconnect_after_delay);
    });

    socketIO.on('disconnect', function (reason) {
      clearExistingSocketIO();
      console.log("TVC socket.io connection closed, reason: " + reason);
      stateMachine.handle(TRIGGERS.should_reconnect_after_delay);
    });

    socketIOMaybeConnected();

    connectTimeoutID = setTimeout(function () {
      if (!socketIO || !socketIO.connected) {
        clearExistingSocketIO();
        console.log("Internal error. " +
          "Was not able to connect to TVC socket.io endpoint in 7 seconds.", urlSocketIO);
        stateMachine.handle(TRIGGERS.should_reconnect_after_delay);
      }
    }, 7000);

  }


  this.configure = function (url, path, accessToken) {
    urlSocketIO = url;
    pathSocketIO = path;
    accessTokenSocketIO = accessToken;
    stateMachine.handle(TRIGGERS.configured);
  };

  this.logout = function () {
    urlSocketIO = null;
    pathSocketIO = null;
    accessTokenSocketIO = null;
    stateMachine.handle(TRIGGERS.logout);
  };

}

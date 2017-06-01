'use strict';


var TVCWebSocketStateEvents = {
  READY: "ready",
  ERROR: "error",
  CLOSED: "closed"
};

var TVCWebSocketStates = {
  CLOSED: WebSocket.CLOSED,
  CLOSING: WebSocket.CLOSING,
  READY: WebSocket.OPEN,
  CONNECTING: WebSocket.CONNECTING
};

/**
 * Provides methods for network interoperation with Trader Voice Command (TVC)
 * server WebSocket API.
 *
 * @constructor
 *
 * @param {string} urlWebSocket URL of TVC web socket endpoint. Should contain all auth data in its params.
 *
 */
function TVCWebSocket() {
  var urlWebSocket = null;

  var socket = null;

  var socketMessageListeners = {};

  var socketStateListeners = new Set();

  var CHANNEL_CHECK_MESSAGE = 'channel_check';
  var CHANNEL_CHECK_DISABLED_PROPERTY = 'tvb.CHANNEL_CHECK_DISABLED';
  var CHANNEL_CHECK_TIMEOUT_PROPERTY = 'tvb.CHANNEL_CHECK_TIMEOUT_SECONDS';
  var DEFAULT_CHANNEL_CHECK_TIMEOUT = 15;
  var CHANNEL_CHECK_MESSAGES_SENDING_INTERVAL = 5000;


  this.setUrl = function(url) {
    var urlParser = document.createElement('a');
    urlParser.href = url;

    if (this.isChannelCheckEnabled()) {
      urlParser.href += urlParser.search ? '&' : '?';
      urlParser.href += 'channel_check_timeout=' + this.getChannelCheckTimeout();
    }

    urlWebSocket = urlParser.href;
  };

  this.getUrl = function(){
    return urlWebSocket;
  };

  /**
   * TVC web socket state change listener.
   * Receives notification when socket is ready, closed or experience errors.
   *
   * @callback TVC~socketStateListener
   * @param {string} eventType One of TVCWebSocketStateEvents,
   * @param {number} [code] Code of the event (for example on socket close),
   * @param {string} [reason] Text reason of the event (for example on socket close).
   */

  /**
   * Adds a listener for TVC websocket state change events: ready, closed, error.
   * See: TVCWebSocketStateEvents for state event type constants.
   * @param {TVC~socketStateListener} listener Callback function receiving eventType, code and textReason.
   *
   */
  this.addStateListener = function (listener) {
    socketStateListeners.add(listener);
  };

  /**
   * Remove TVC websocket state change listener.
   *
   * @param {TVC~socketStateListener} listener Listener to be removed.
   */
  this.removeStateListener = function (listener) {
    socketStateListeners.delete(listener);
  };

  var triggerSocketStateChangeEvent = function (event, code, reason) {
    socketStateListeners.forEach(function (listener) {
      listener(event, code, reason);
    });
  };

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
   * @param {TVC~socketMessageListener} listener Callback function receiving message with fields:
   *                                      type, source_contact, data.
   */
  this.addMessageListener = function (messageType, listener) {
    if (socketMessageListeners[messageType] === undefined)
      socketMessageListeners[messageType] = new Set();

    socketMessageListeners[messageType].add(listener);
  };

  /**
   * Remove TVC websocket message listener.
   * @param {string} messageType String message type.
   * @param {TVC~socketMessageListener} listener Listener to be removed.
   */
  this.removeMessageListener = function (messageType, listener) {
    if (socketMessageListeners[messageType] === undefined)
      return;
    socketMessageListeners[messageType].delete(listener);
  };

  function logOutgoingMessage(message){
    //console.info("TVC websocket outgoing message: " + message);
    GKTLog.sendAppEvent("events.tvc.ws.outgoing_message", {
      "message": message
    });
  }

  function logIncomingMessage(message) {
    //console.info("TVC websocket incoming message: " + message);
    GKTLog.sendAppEvent("events.tvc.ws.incoming_message", {
      "message": message
    });
  }

  /**
   * Send websocket message to TVC.
   * @param {string} messageType Type of the message.
   * @param {Object} data Body of the message having structure depending on the message type.
   */
  this.sendMessageToTVC = function (messageType, data) {
    if (socket) {
      var message = JSON.stringify({'type': messageType, 'data': data});
      logOutgoingMessage(message);
      socket.send(message);
    }
  };

  /**
   * Send peer-to-peer websocket message to the specified direct contact.
   * TVC will route the message to the contact client app and provide
   * your uid in "source_contact" field on his/her side.
   * @param {string} contactUID UID of the contact of this user to send message to.
   * @param {string} messageType Type of the message.
   * @param {Object} data Body of the message having structure depending on the message type.
   */
  this.sendMessageToContact = function (contactUID, messageType, data) {
    if (socket) {
      var message = JSON.stringify({'destination_contact': contactUID, 'type': messageType, 'data': data});
      logOutgoingMessage(message);
      socket.send(message);
    }
  };

  var socketMessageRouter = function (message) {
    if (!message || !message.data) { return; }

    logIncomingMessage(message.data);

    var obj = message.data ? JSON.parse(message.data) : undefined;
    if (!obj || !obj.type) { return; }

    var listenerSet = socketMessageListeners[obj.type];
    if (listenerSet) {
      listenerSet.forEach(function (listener) {
        if (listener) {
          listener(obj.type, obj.source_contact, obj.data);
        }
      });
    }
  };

  this.isChannelCheckEnabled = function() {
    return !GKTConfig.getBoolean(CHANNEL_CHECK_DISABLED_PROPERTY, false);
  };

  this.getChannelCheckTimeout = function() {
    return GKTConfig.getProperty(CHANNEL_CHECK_TIMEOUT_PROPERTY, DEFAULT_CHANNEL_CHECK_TIMEOUT);
  };

  this.startChannelCheckMessagesSending = function() {
    function sendChannelCheckMessage() {
      if (!socket) {
        return;
      }

      socket.send(CHANNEL_CHECK_MESSAGE);
      setTimeout(sendChannelCheckMessage, CHANNEL_CHECK_MESSAGES_SENDING_INTERVAL);
    }

    sendChannelCheckMessage();
  };

  this.connectToTVC = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
      if(socket)
        reject(new TVCWebServiceError("TVC WebSocket is already in connecting or connected state", urlWebSocket, -1, ""));

      console.log("Connecting to TVC WebSocket: ", urlWebSocket);

      /* TVC spends some time on initializing websocket after it is connected.
       * When socket is ready TVC sends "channel-ready" message.
       * So until the socket is not ready we put it into a local temp variable and only
       * when everything is ok we assign real listeners and store the socket object into TVC singleton.
       */
      socket = new WebSocket(urlWebSocket);

      console.log("Connected to TVC WebSocket. Waiting for channel ready message...");

      socket.onclose = function (event) {
        reject(new TVCWebServiceError("TVC web socket closed right after connecting.",
            urlWebSocket, event.code, event.reason));
        socket = null;
      };

      socket.onerror = function (error) {
        reject(new TVCWebServiceError("TVC web socket error right after connecting.",
            urlWebSocket, error.code, error.reason));
      };


      socket.onopen = function() {
        /* If we have communication problems, socket will not be closed unitl massage not send.
         Client side not sending ping messages to server
         (fast fix)*/
        if (self.isChannelCheckEnabled()) {
          self.startChannelCheckMessagesSending();
        }
      };

      socket.onmessage = function (message) {
        if (!message || !message.data) { return; }

        var json = message.data ? JSON.parse(message.data) : undefined;

        if (json.type === "force_logout") {
          reject(new TVCWebServiceError("Got force_logout message from TVC on web socket initialization.",
              urlWebSocket, 4001, message.data));
        }
        else if (json.type === "channel" && json.data && json.data.status === "ready") {
          console.log("TVC WebSocket ready message received");

          socket.onmessage = socketMessageRouter;

          socket.onclose = function (event) {
            if (!event.wasClean)
              console.log("WebSocket closed non-clean. Code: " + event.code + ", reason: " + event.reason);
            else
              console.log("WebSocket closed clean");

            socket.onmessage = null;
            socket = null;

            triggerSocketStateChangeEvent(TVCWebSocketStateEvents.CLOSED, event.code, event.reason);
          };

          socket.onerror = function (error) {
            triggerSocketStateChangeEvent(TVCWebSocketStateEvents, event.code, event.reason);
          };


          triggerSocketStateChangeEvent(TVCWebSocketStateEvents.READY);
          resolve();
        }
      };

      //Rejecting after 7 seconds if no "channel ready" message received.
      setTimeout(function () {
        if (!socket)
          reject(new TVCWebServiceError("Internal error. TVC did not send \"channel ready\"" +
              " message via web socket within 7 seconds after connecting."));
      }, 7000);

    });
  };

  this.getState = function() {
    var currSocket = socket;
    return currSocket ? currSocket.readyState : TVCWebSocketStates.CLOSED;
  };

  this.disconnectFromTVC = function () {
    if (socket)
      socket.close(1000);
  };

}

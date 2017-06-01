'use strict';

/*
 * Copyright (C) 2015 Green Key Technologies <https://greenkeytech.com/>
 */

/**
 * Log reporting routines.
 *
 * Provides methods for sending log messages to the server for further browsing
 * them in Kibana.
 *
 * This script should be executed after gkt.js - "GKT" var should be already
 * initialized.
 */
var GKTLog = new (function () {

  var gkt = null;

  var tvc = null;

  var config = null;

  var PROP_EVENT_NAME_TO_SHOULD_LOG_MAP = "gkt.log.config.EVENT_NAME_TO_SHOULD_LOG_FLAG_JSON";

  var eventNameToShouldLogFlagMap = {};

  var self = this;

  function _shouldSendEvent(eventName) {
    return typeof eventNameToShouldLogFlagMap[eventName] === 'undefined'
      || eventNameToShouldLogFlagMap[eventName] === true;
  }

  function _updateConfig() {
    eventNameToShouldLogFlagMap = config.getJSON(PROP_EVENT_NAME_TO_SHOULD_LOG_MAP, {});
  }

  /**
   *
   * @param {RemoteConfig~PropertyUpdateEvent} event
   * @private
   */
  function _configPropChangeListener(event) {
    if (event.propertyName === PROP_EVENT_NAME_TO_SHOULD_LOG_MAP) {
      _updateConfig();
    }
  }

  this.init = function (gktService, tvcService, configService) {
    gkt = gktService;
    tvc = tvcService;
    if (config != null) {
      config.removePropertyUpdatedListener(_configPropChangeListener);
    }
    config = configService;

    if (config != null) {
      _updateConfig();
      config.addPropertyUpdatedListener(_configPropChangeListener);
    }
  };


  /**
   * Uses overriden "console.log" method to send log entry to the server (INFO
   * level) and print it out to the console.
   *
   * @param message
   */
  this.log = function (message) {
    console.log(message);
  };

  /**
   * Uses overriden "console.log" method to send log entry to the server (INFO
   * level) and print it out to the console.
   *
   * @param message
   */
  this.info = function (message) {
    console.log(message);
  };

  /**
   * Uses overriden "console.log" method to send log entry to the server (WARN
   * level) and print it out to the console.
   *
   * @param message
   */
  this.warn = function (message) {
    console.warn(message);
  };

  /**
   * Uses overriden "console.log" method to send log entry to the server
   * (ERROR level) and print it out to the console.
   *
   * @param message
   */
  this.error = function (message) {
    console.error(message);
  };

  /**
   * @typedef {Object} GKTLog~MessageCacheEntry
   * @property {string} messageType
   * @property {Object} message
   */

  /**
   *
   * @type {GKTLog~MessageCacheEntry[]}
   * @private
   */
  var _messageCache = [];

  /**
   * Messages shouldn't be removed from the queue when logging process is in progress
   * @type {boolean}
   */
  var isQueueBlocked = false;

  /**
   *
   * @param {string} messageType
   * @param {Object} message
   * @private
   */
  function _sendOrCache(messageType, message) {
    tryToSendCachedMessages();

    if (!_shouldSendEvent(message.event)) {
      return;
    }

    // it needs to add timestamp when message was received
    // to avoid issues with sending messages in "not original" order
    assignTimestamp(message);

    if (!gkt || !tvc) {
      return addMessageToQueue(messageType, message);
    }
    tvc.sendSocketIOMessageToTVC(messageType, appendMandatoryFields(message))
      .catch(function() {
        addMessageToQueue(messageType, message);
      });
  }

  function addMessageToQueue(messageType, message) {
    _messageCache.push({messageType: messageType, message: message});
    removeOldMessages();
  }

  function removeOldMessages(forceRemoval) {
    if (_messageCache.length < 1000 || (!forceRemoval && isQueueBlocked)) {
      return;
    }

    if (_messageCache.length === 1000) {
      _messageCache.shift();
    } else {
      _messageCache = _messageCache.slice(_messageCache.length - 1000);
    }
  }

  function appendMandatoryFields(message) {
    var mandatoryFields = {
      app_version: gkt.version
    };

    return _.defaults(message, mandatoryFields);
  }

  function assignTimestamp(message) {
    message.timestamp = (new Date()).toISOString();
  }

  function tryToSendCachedMessages(isRepeat) {
    if (!gkt || !tvc || (!isRepeat && isQueueBlocked)) {
      return;
    }

    // unblock queue when all messages are already logged
    if (_messageCache.length === 0) {
      isQueueBlocked = false;
      return;
    }

    // remove old messages before sending
    removeOldMessages(true);

    isQueueBlocked = true;
    var cachedMessage = getNextMessageFromQueue();
    tvc.sendSocketIOMessageToTVC(cachedMessage.messageType, cachedMessage.message)
      .then(function() {
        _messageCache.shift();
        tryToSendCachedMessages(true);
      })
      .catch(function() {
        isQueueBlocked = false;
      });
  }

  function getNextMessageFromQueue() {
    var nextMessageIndex = _.findIndex(_messageCache, function(cachedMessage) {
      return cachedMessage && cachedMessage.message && _shouldSendEvent(cachedMessage.message.event)
    });

    // remove messages that shouldn't be logged
    if (nextMessageIndex > 0) {
      _messageCache = _messageCache.slice(nextMessageIndex)
    }

    return appendMandatoryFields(_messageCache[0]);
  }

  /**
   * Send application event to the server. Comparing to simple log messages,
   * application events contain structured data describing the event for
   * further searching by its fields.
   *
   * @param eventKeyStr
   * @param eventData structure example: {event: "string", message: "string", uri: "string", code: wholeNumber, code1: wholeNumber, code2: wholeNumber, code3: wholeNumber}
   */
  this.sendAppEvent = function (eventKeyStr, eventData, shouldLogToConsole) {
    try {

      var msg = {
        event: eventKeyStr
      };

      _.assign(msg, eventData);

      _sendOrCache("event-entry", msg);

    } catch (error) {
      console.info("Can't post event to Kibana", error);
    }
  };

  this.sendChatHistoryDomEvent = function (domString) {
    if (gkt && gkt.isLoggedIn()) {
      try {

        var msg = {
          data: domString
        };

        _sendOrCache("chat-history-dom-entry", msg);

      } catch (error) {
        console.info("Can't post event to Kibana", error);
      }
    }
  };

  /**
   * Overrides console "log", "warn" and "error" methods.
   *
   * After executing this method console will send log entries to the server
   * before printing out them to the browser's console.
   */
  function _init() {
    var console = window.console;
    if (!console)
      return;

    function postingNotNeededFor(args) {
      return Array.isArray(args)
        && args.length > 0
        && typeof (arguments[0]) === 'string'
        && arguments[0].indexOf("=====") < 0;
    }

    function intercept(method) {
      var original = console[method];
      var level = method === 'error' ? 'error' : method === 'warn' ? 'warn' : 'info';

      console[method] = function () {
        if (original.apply) {
          // For Chrome, FireFox, e.t.c.
          original.apply(console, arguments);
          if (!postingNotNeededFor(arguments))
            _sendOrCache("log-entry", {
              event: "console." + level,
              level: level,
              message: EncodingUtil.stringifyJSONIgnoringCircularRefs(arguments.length === 1 ? arguments[0] : arguments)
            });
        } else {
          // For IE
          var message = Array.prototype.slice.apply(arguments).join(' ');
          original(message);
        }
      }
    }

    var methods = ['log', 'warn', 'error', 'info'];
    for (var i in methods) {
      intercept(methods[i]);
    }

    var _handleLogEvent = function(type) {

    };

    function handleInnerBusEvent(busData){
      sendAppEvent(busData.eventName, busData.data);
    }


    if (window.fin && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      fin.desktop.InterApplicationBus.subscribe('*', 'audio.log.sendAppEvent', self.handleInnerBusEvent);
      fin.desktop.InterApplicationBus.subscribe('*', 'audio.log.log', self.log);
      fin.desktop.InterApplicationBus.subscribe('*', 'audio.log.info', self.info);
      fin.desktop.InterApplicationBus.subscribe('*', 'audio.log.warn', self.warn);
      fin.desktop.InterApplicationBus.subscribe('*', 'audio.log.error', self.error);
    }
  }

  _init();


})();

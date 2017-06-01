(function() {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
    .factory('OpenFin', ['BrowserDetectService', 'commonConstants', '$timeout',
      '$rootScope', 'TornWindowStorage', 'CallManager', 'OpenfinMessage',
      'OpenfinPopupInitializer', 'HotkeysService', OpenFinService]);

  function OpenFinService(BrowserDetectService, constants, $timeout, $rootScope,
                          TornWindowStorage, CallManager, OpenfinMessage,
                          OpenfinPopupInitializer, HotkeysService) {

    var TYPES = {
      hoots: 'hoots',
      ringdowns: 'ringdowns',
      calls: 'calls',
      panels: 'panels',
      panelUids: {
        hoots: 'HOOTS_PANEL_FAKE_UID',
        ringdowns: 'RINGDOWNS_PANEL_FAKE_UID'
      }
    };

    var tornConnections = {};
    tornConnections[TYPES.hoots] = {};
    tornConnections[TYPES.ringdowns] = {};
    tornConnections[TYPES.calls] = {};
    tornConnections[TYPES.panels] = {};

    // convert connections info to torn options
    var CONNECTION_CONVERTERS = {};
    CONNECTION_CONVERTERS[constants.GKT.CONTACT_TYPE.hoot] = _createHootOptions;
    CONNECTION_CONVERTERS[constants.GKT.CONTACT_TYPE.blastGroup] = _createBlastOptions;
    CONNECTION_CONVERTERS[constants.GKT.CONTACT_TYPE.ringdown] = _createRingdownOptions;
    CONNECTION_CONVERTERS[constants.GKT.CONTACT_TYPE.sipTDMRingdown] = _createRingdownOptions;
    CONNECTION_CONVERTERS[constants.GKT.CONTACT_TYPE.external] = _createRingdownOptions;

    // service takes care about closing torn panels
    $rootScope.$on('$destroy', function() {
      _.each(tornConnections[TYPES.panels], function(tornWindow) {
        tornWindow.close();
      });
    });

    var DEFAULT_WINDOW_OPTIONS = {
      alwaysOnTop: true,
      autoShow: true,
      frame: false,
      resizable: false,
      maximizable: false,
      showTaskbarIcon: false
    };

    var HOOT_WINDOW_OPTIONS = _.assign(_.clone(DEFAULT_WINDOW_OPTIONS), {
      defaultWidth: 250,
      defaultHeight: 80,
      minWidth: 250,
      minHeight: 80,
      maxWidth: 250,
      maxHeight: 80,
      url: '/openfin/popouts.html#/torn-hoot',
      cornerRounding: {
        width: 18,
        height: 18
      }
    });

    var RINGDOWN_WINDOW_OPTIONS = _.assign(_.clone(DEFAULT_WINDOW_OPTIONS), {
      defaultWidth: 210,
      defaultHeight: 70,
      minWidth: 210,
      minHeight: 70,
      maxWidth: 210,
      maxHeight: 70,
      url: '/openfin/popouts.html#/torn-ringdown',
      cornerRounding: {
        width: 80,
        height: 100
      }
    });

    var CALL_WINDOW_OPTIONS = _.assign(_.clone(DEFAULT_WINDOW_OPTIONS), {
      defaultWidth: 222,
      defaultHeight: 80,
      minWidth: 222,
      minHeight: 80,
      maxWidth: 222,
      maxHeight: 80,
      url: '/openfin/popouts.html#/torn-call',
      cornerRounding: {
        width: 3,
        height: 3
      }
    });

    var HOOTS_PANEL_OPTIONS = _.assign(_.clone(DEFAULT_WINDOW_OPTIONS), {
      name: "hoots_panel_torn_window",
      defaultWidth: 500,
      defaultHeight: 500,
      minWidth: 500,
      minHeight: 500,
      maxWidth: 500,
      maxHeight: 500,
      url: '/openfin/popouts.html#/hoots-panel',
      cornerRounding: {
        width: 20,
        height: 20
      }
    });

    var RINGDOWNS_PANEL_OPTIONS = _.assign(_.clone(HOOTS_PANEL_OPTIONS), {
      name: "ringdowns_panel_torn_window",
      url: '/openfin/popouts.html#/ringdowns-panel'
    });

    function _openIntegratedWindow(windowOptions, onMessage, onClose,
                                   initialMessage, onOpen) {

      function openedCallback(finWindow) {

        finWindow.contentWindow.receiveMessageFromPopup = onMessage;

        finWindow.sendMessage = function(message) {
          if(_.isFunction(finWindow.contentWindow.receiveMessageFromTvb))
            finWindow.contentWindow.receiveMessageFromTvb(message);
        };

        // some time for openfin to complete window opening
        $timeout(function() {
          initialMessage && finWindow.sendMessage(initialMessage);
        }, 200);

        _.isFunction(onOpen) && onOpen();



      }

      var windowWrapper = new fin.desktop.Window(windowOptions, function() {
        windowWrapper.show();
        openedCallback(windowWrapper);
      });

      windowWrapper.addEventListener('closed', onClose);

      return windowWrapper;
    }

    function _openTornOutWindow(contentId, windowOptions, initialMessage, type) {

      var existingWindows = tornConnections[type];
      if(existingWindows.hasOwnProperty(contentId)) {
        return existingWindows[contentId];
      }

      var onMessage = function(message) {
        if(message.action === OpenfinMessage.ACTIONS.FROM_FIN.close) {
          TornWindowStorage.removeTornConnection(contentId);
          return;
        }

        if(message.action === OpenfinMessage.ACTIONS.FROM_FIN.controlSignal) {
          $timeout(function() {
            $rootScope.$emit(constants.UI_EVENTS.connection_control_signal,
              {uid: message.uid}, 'OpenFin', message.data.signal);
          });
        }

        if(message.action === OpenfinMessage.ACTIONS.FROM_FIN.confirmInit) {
          OpenfinPopupInitializer.unregisterTornWindow(message.uid);
        }
      };

      var onClose = function() {
        OpenfinPopupInitializer.unregisterTornWindow(contentId);
        delete existingWindows[contentId];
      };

      var onOpen = function() {
        OpenfinPopupInitializer.registerTornWindow(contentId, windowWrapper,
          initialMessage);
      };

      var windowWrapper = _openIntegratedWindow(
        windowOptions, onMessage, onClose, initialMessage, onOpen);

      existingWindows[contentId] = windowWrapper;

      return windowWrapper;
    }

    function _generateTornActiveCallName(uid) {
      return 'tornOutActiveCall' + uid;
    }

    function _generateTornRingdownName(uid) {
      return 'tornOutRingdown' + uid;
    }

    function _generateTornHootName(uid) {
      return 'tornOutHoot' + uid;
    }

    function _createHootOptions(connection) {
      var isOnline = connection.status === constants.GKT.PRESENCE.online;
      return {
        uid: connection.uid,
        isOnline: isOnline,
        isAway: connection.contact.last_idle_status,
        shouting: connection.status === constants.GKT.PRESENCE.online &&
          connection.isShouting(),
        contactName: connection.contact.display_name,
        inboundShout: connection.isCounterpartyShouting(),
        silenced: connection.paused,
        photo: connection.contact.full_photo_link,
        connecting: isOnline && !(
          connection.callStatus === constants.GKT.CALL_STATUS.active ||
          connection.callStatus === constants.GKT.CALL_STATUS.muted),
        hotKey: HotkeysService.getAssignedHotKey(connection.uid)
      };
    }

    function _createBlastOptions(connection, isOnline) {
      if(isOnline === undefined) {
        var hoots = CallManager.getCurrentHootConnections();
        isOnline = _.any(connection._members, function(uid) {
          return hoots[uid] && hoots[uid].isOnline();
        });
      }

      return {
        uid: connection.uid,
        isOnline: isOnline,
        shouting: connection.shouting,
        contactName: connection.name,
        isBlast: true,
        hotKey: HotkeysService.getAssignedHotKey(connection.uid)
      };
    }

    function _createRingdownOptions(connection) {
      return {
        uid: connection.uid,
        isAway: connection.contact.last_idle_status,
        contactName: connection.contact.display_name,
        isSpeedDial: connection.contact.isExternal(),
        isOnline: (connection.isOnline() ||
          // for speed dial contacts
        connection.contact.isExternal())
          // for sip tdm ringdown
        && (connection.type !== constants.GKT.CONTACT_TYPE.sipTDMRingdown
        || connection.callStatus === constants.GKT.CALL_STATUS.active),
        inCall: inCall(connection)
      };
    }

    function inCall(connection) {
      return _.includes([
          constants.GKT.CALL_STATUS.active,
          constants.GKT.CALL_STATUS.connecting,
          constants.GKT.CALL_STATUS.muted
        ], connection.callStatus) &&
        (connection.type !== constants.GKT.CONTACT_TYPE.sipTDMRingdown
        || connection.sipTDMStatus !== constants.GKT.SIP_EVENTS.sipTDMDisconnected);
    }

    function _createInitialMessage(data) {
      return OpenfinMessage
        .createAnonymous(OpenfinMessage.ACTIONS.TO_FIN.init)
        .withData(data);
    }

    function _createUpdateMessage(uid, property, value) {
      return OpenfinMessage
        .create(OpenfinMessage.ACTIONS.TO_FIN.update, uid)
        .withProperty(property, value);
    }

    function _tearHootOut(connection) {
      TornWindowStorage.saveTornConnection(connection.uid);
      return _openTornOutWindow(connection.uid,
        _.assign(HOOT_WINDOW_OPTIONS, {
          name: _generateTornHootName(connection.uid)
        }), _createInitialMessage(_createHootOptions(connection)), TYPES.hoots);
    }

    function _tearBlastOut(connection, isOnline) {
      TornWindowStorage.saveTornConnection(connection.uid);
      return _openTornOutWindow(connection.uid,
        _.assign(HOOT_WINDOW_OPTIONS, {
          name: _generateTornHootName(connection.uid)
        }), _createInitialMessage(_createBlastOptions(connection, isOnline)),
        TYPES.hoots);
    }

    function _tearRingdownOut(connection) {
      TornWindowStorage.saveTornConnection(connection.uid);
      return _openTornOutWindow(connection.uid,
        _.assign(RINGDOWN_WINDOW_OPTIONS, {
          name: _generateTornRingdownName(connection.uid)
        }), _createInitialMessage(_createRingdownOptions(connection)),
        TYPES.ringdowns);
    }

    function _tearActiveCallOut(connection, selected) {
      var options = {
        uid: connection.uid,
        displayName: connection.contact.display_name,
        ringing: connection.GKT_isInboundCall &&
        connection.callStatus !== constants.GKT.CALL_STATUS.active,
        muted: connection.muted,
        selected: selected,
        silenced: connection.paused,
        poppedOut: true
      };

      return _openTornOutWindow(connection.uid,
        _.assign(CALL_WINDOW_OPTIONS, {
          name: _generateTornActiveCallName(connection.uid)
        }), _createInitialMessage(options), TYPES.calls);
    }

    function _tearPanelOut(panelId, connections) {

      // TODO create method for detection
      var existingWindows = tornConnections[TYPES.panels];
      if(existingWindows.hasOwnProperty(panelId)) {
        return existingWindows[panelId];
      }

      TornWindowStorage.saveTornConnection(panelId);

      var connectionsData = _.map(connections, function(connection) {
        var converter = CONNECTION_CONVERTERS[connection.type];
        return converter ?
          converter.call(this, connection) : {};
      });

      var windowOptions = panelId === TYPES.panelUids.ringdowns ?
        RINGDOWNS_PANEL_OPTIONS :
        HOOTS_PANEL_OPTIONS;

      return _openTornOutWindow(panelId, windowOptions,
        _createInitialMessage({
          uid: panelId,
          connections: connectionsData
        }), TYPES.panels);
    }

    function _updateWindow(type, id, connectionUid, property, value) {
      if(!tornConnections[type] || !tornConnections[type][id]) {
        return;
      }

      var existing = tornConnections[type][id];
      existing.sendMessage(
        _createUpdateMessage(connectionUid, property, value));
    }

    function openWindowWithPreloader(windowOptions, delay) {
      return new Promise(function(resolve, reject) {

        var mainWindowOptions = _.assign({}, windowOptions, {
          autoShow: false,
          name: windowOptions.name + Math.random()
        });
        var mainWindow = new fin.desktop.Window(mainWindowOptions,
          handleMainWindowReadyEvent, reject);
        mainWindow.show();

        var preloaderWindowOptions = _.assign({}, windowOptions, {
          name: mainWindowOptions.name + 'preloader',
          url: "/openfin/popouts.html#/preloader"
        });
        var preloaderWindow = new fin.desktop.Window(preloaderWindowOptions);
        preloaderWindow.show();
        preloaderWindow.addEventListener('closed', handlePreloaderClosedEvent);


        function handlePreloaderClosedEvent() {
          mainWindow.close();
          reject();
        }

        function handleMainWindowReadyEvent() {

          preloaderWindow.removeEventListener('closed', handlePreloaderClosedEvent);

          // let the main window time to render content
          setTimeout(function() {
            // actualize main window's position and size
            preloaderWindow.getBounds(function(bounds) {
              mainWindow.moveTo(bounds.left, bounds.top);
              mainWindow.resizeTo(bounds.width, bounds.height);

              mainWindow.show();
              preloaderWindow.close();

              resolve(mainWindow);
            });
          }, delay || 1000);
        }
      });
    }

    /**
     * Public API
     */

    return {
      TYPES: TYPES,
      exists: BrowserDetectService.isOpenFin,
      hasHoot: function(id) {
        return tornConnections.hoots.hasOwnProperty(id);
      },

      updateTornPanel: function(panelId, connectionUid, property, value) {
        _updateWindow(TYPES.panels, panelId, connectionUid, property, value);
      },

      updateTornPanelContacts: function(panelId, action, connection) {
        if(!tornConnections[TYPES.panels] || !tornConnections[TYPES.panels][panelId]) {
          return;
        }

        var message = OpenfinMessage.create(action, connection.uid);
        var converter = CONNECTION_CONVERTERS[connection.type];

        if(action === OpenfinMessage.ACTIONS.TO_FIN.contactAdded) {
          message.withData({
            connection: converter ? converter.call(this, connection) : {}
          });
        }

        var existing = tornConnections[TYPES.panels][panelId];
        existing.sendMessage(message);
      },

      updateTornPanelContactsSorting: function (panelId, action, contactsIds) {
        if (!tornConnections[TYPES.panels] || !tornConnections[TYPES.panels][panelId]) {
          return;
        }

        var message = OpenfinMessage.createAnonymous(action).withData(contactsIds);
        
        var existing = tornConnections[TYPES.panels][panelId];
        existing.sendMessage(message);
      },

      updateTornWindow: function(uid, type, property, value) {
        _updateWindow(type, uid, uid, property, value);
      },

      closeTornWindow: function(uid, type) {
        var tornWindow = tornConnections[type][uid];
        if(!tornWindow) return;

        tornWindow.close();
        delete tornConnections[type][uid];
      },

      forceShowWindow: function(tornWindow) {
        tornWindow.restore();
        tornWindow.bringToFront();
        tornWindow.focus();
      },

      openWindowWithPreloader: openWindowWithPreloader,
      openIntegratedWindow: _openIntegratedWindow,
      tearHootOut: _tearHootOut,
      tearBlastOut: _tearBlastOut,
      tearRingdownOut: _tearRingdownOut,
      tearActiveCallOut: _tearActiveCallOut,
      tearOutPanel: _tearPanelOut,
      isConnectionTornOutPermanently: TornWindowStorage.isConnectionTornOut,
      bringMainWindowToFront: function() {
        var finWin = fin.desktop.Window.getCurrent();
        if(finWin && _.isFunction(finWin.bringToFront))
          finWin.bringToFront();
      }
    };
  }
})();

(function () {
  'use strict';

  var app = angular.module('gkt.voiceBox.hoots');

  app.directive('hootBox', function () {
    return {
      restrict: 'EA',
      scope: {
        hoot: '=',
        // TODO probably columns binding can be removed (it's not used)
        columns: '=',
        draggingData: '='
      },
      controller: [
        '$scope',
        '$rootScope',
        '$timeout',
        'commonConstants',
        'tvbUIState',
        'ngDialog',
        'OpenFin',
        'SilencedHootsService',
        'HootsSettingsService',
        'TVC',
        'HotkeysService',
        'KeyboardService',
        'MidiService',
        hootBoxCtrl
      ],
      templateUrl: '/partials/hoot.html',
      replace: true
    };
  });

  function hootBoxCtrl($scope, $rootScope, $timeout, constants, tvbUIState, ngDialog, OpenFin, SilencedHootsService,
                       HootsSettingsService, TVC, HotkeysService, KeyboardService, MidiService) {

    var unwatches = [];
    var activeShoutSources = {};

    $scope.constants = constants;

    $scope.$watch('hoot', function (newVal, oldVal) {
      if((newVal.emptySlot && oldVal.emptySlot) || newVal.uid === oldVal.uid) {
        return;
      }

      // close the window bound to old hoot from this cell
      closeTornOutWindowSafe(oldVal.uid);

      // we need to clean watchers at any case: whether hoot is deleted, created or changed
      cleanUpWatches();

      // remove hotkeys assignations listeners
      unsubscribeFromHotKeyChangeEvents(oldVal.uid);

      // we need to init the directive again only if it's not the empty slot
      // and destroy otherwise
      newVal.emptySlot ?
          destroy() :
          setUp();
    });

    $scope.$on('$destroy', function () {
      cleanUpWatches();
      destroy();
    });

    if (!$scope.hoot || $scope.hoot.emptySlot) {
      return;
    }

    setUp();

    // definitions
    function setUp() {
      activeShoutSources = [];

      $scope.uiState = tvbUIState;
      $scope.isOpenFin = OpenFin.exists();

      $scope.isOnline = $scope.hoot.status === constants.GKT.PRESENCE.online;
      var callStatus = $scope.hoot.callStatus || constants.GKT.CALL_STATUS.disconnected;

      // restore connection state with callStatus
      $scope.isConnected = callStatus === constants.GKT.CALL_STATUS.active ||
          callStatus === constants.GKT.CALL_STATUS.muted;

      $scope.isConnecting = $scope.isOnline && !$scope.isConnected;
      $scope.isIncomingShouting = $scope.hoot.isCounterpartyShouting();
      $scope.isOutgoingShouting = $scope.hoot.isShouting();

      // for a volume meter
      $scope._isVolumeMuted = function () {
        return !$scope.isOutgoingShouting;
      };

      // if there is new hoot in this cell, close obsolete torn out window
      closeTornOutWindowSafe();

      // give OpenFin window time to run onOpen / onClose callback
      $timeout(function() {
        if (OpenFin.exists() && OpenFin.isConnectionTornOutPermanently($scope.hoot.uid)) {
          OpenFin.tearHootOut($scope.hoot);
        }
      }, 500);

      setIncomingShoutListener();
      setStatusChangeListeners();
      setUiHandlers();
      setAngularListeners();
      checkSilencedHoot();
      detectAssignedHotKey();
    }

    function destroy() {
      delete $scope.uiState;
      delete $scope.isOpenFin;
      delete $scope.isOnline;
      delete $scope.isConnected;
      delete $scope.isConnecting;
      delete $scope.isIncomingShouting;
      delete $scope.isOutgoingShouting;
      delete $scope._isVolumeMuted;
      delete $scope.getOutputDeviceContext;
      delete $scope.tearOut;
      delete $scope.isInPttMode;
      delete $scope.switchPttMode;
      delete $scope.handleShoutPressed;
      delete $scope.handleShoutDepressed;
      delete $scope.togglePauseAudio;
      delete $scope.deleteHoot;

      closeTornOutWindowSafe();
      unsubscribeFromHotKeyChangeEvents();
    }

    function closeTornOutWindowSafe(hootUid) {
      var uid = hootUid || $scope.hoot && $scope.hoot.uid;
      uid && OpenFin.closeTornWindow(uid, OpenFin.TYPES.hoots);
    }

    function setIncomingShoutListener() {
      function _incomingShoutListener(msg) {
        // Needed for the first time, when the user paused the hoot but the session not exist.
        if ($scope.hoot.paused) {
          $scope.hoot.pauseAudio();
        }

        $timeout(function () {
          activeShoutSources[msg.data.speaking_contact_uid] = msg.data.shout;
          var values = _.values(activeShoutSources);
          $scope.isIncomingShouting = values.reduce(function (prev, current) {
            return prev || current;
          });

          $rootScope.$emit($scope.isIncomingShouting ?
                  constants.GKT.CALL_EVENTS.inbound_shout :
                  constants.GKT.CALL_EVENTS.inbound_shout_end,
              $scope.hoot, msg);
        });
      }

      if ($scope.hoot.addShoutListener)
        unwatches.push($scope.hoot.addShoutListener(_incomingShoutListener));
    }

    function emitConnectingEvent(wasConnecting, isConnecting) {
      if(wasConnecting === isConnecting)
        return;

      $rootScope.$emit(constants.UI_EVENTS.hoot_connecting_state_changed,
        $scope.hoot, $scope.isConnecting);
    }

    function setStatusChangeListeners() {
      // this will be replaced with state machine
      function _onCallStatusChange(event) {
        var newValue = event.newStatus;
        $timeout(function () {
          var wasConnecting = $scope.isConnecting;
          $scope.isConnecting = true;

          switch (newValue) {
            case constants.GKT.CALL_STATUS.active:
              $scope.isConnected = true;
              $scope.isConnecting = false;
              break;
            case constants.GKT.CALL_STATUS.muted:
              $scope.isConnected = true;
              $scope.isConnecting = false;
              break;
            case constants.GKT.CALL_STATUS.canceled:
              $scope.isConnected = false;
              $scope.isConnecting = $scope.isOnline;
              break;
            case constants.GKT.CALL_STATUS.connecting:
              $scope.isConnected = false;
              $scope.isConnecting = true;
              break;
            case constants.GKT.CALL_STATUS.disconnected:
              $scope.isConnected = false;
              $scope.isConnecting = $scope.isOnline;
              if ($scope.isIncomingShouting)
                $rootScope.$emit(constants.GKT.CALL_EVENTS.inbound_shout_end, $scope.hoot);
              if ($scope.isOutgoingShouting)
                $rootScope.$emit(constants.GKT.CALL_EVENTS.outbound_shout_end, $scope.hoot);
              break;
            case constants.GKT.CALL_STATUS.rejected:
              $scope.isConnected = false;
              $scope.isConnecting = false;
              break;
            case constants.GKT.CALL_STATUS.connection_paused:
              $scope.isConnected = false;
              $scope.isConnecting = true;
              break;
            default:
              if (!$scope.hoot.isRansquawk()) {
                $scope.isConnected = false;
                $scope.isConnecting = false;
              } else {
                $scope.isConnected = false;
              }
          }

          $scope.isIncomingShouting = $scope.hoot.isCounterpartyShouting();
          $scope.isOutgoingShouting = $scope.hoot.isShouting();
          $scope.isConnecting = $scope.hoot.connectionPaused || $scope.isConnecting;

          checkSilencedHoot();

          emitConnectingEvent(wasConnecting, $scope.isConnecting);
        });
      }

      unwatches.push($scope.hoot.onCallStatusChange(_onCallStatusChange));


      function handleConnectionStatusChange(newValue) {
        $timeout(function () {
          var wasConnecting = $scope.isConnecting;
          if (newValue === constants.GKT.PRESENCE.online) {
            $scope.isOnline = true;
            $scope.isConnecting = true;
            $rootScope.$emit(constants.UI_EVENTS.connection_came_online, $scope.hoot);
          } else if (newValue === constants.GKT.PRESENCE.offline) {
            $scope.isOnline = false;
            $scope.isConnected = false;
            $scope.isConnecting = false;
            // it need's to reset shouting flags when hoot is offline
            // or hoot box's appearance will be restored as it was before, e.g. shout-button will be green
            $scope.isOutgoingShouting = false;
            $scope.isIncomingShouting = false;
            $rootScope.$emit(constants.UI_EVENTS.connection_came_offline, $scope.hoot);
          }

          emitConnectingEvent(wasConnecting, $scope.isConnecting);
        });
      }

      unwatches.push($scope.hoot.onConnectionStatusChange(handleConnectionStatusChange));
    }

    function setUiHandlers() {

      initializePttModeStatus();

      $scope.getOutputDeviceContext = function () {
        return {
          disabled: !$scope.isOnline || !$scope.isConnected || tvbUIState.settingsVisible || $scope.hoot.isRansquawk() || $scope.hoot.mutedUser,
          deviceId: $scope.hoot.getAudioOutputDeviceId()
        };
      };

      if ($scope.isOpenFin) {
        $scope.tearOut = function () {
          OpenFin.tearHootOut($scope.hoot);
        };
      }

      $scope.handleShoutPressed = function (event) {
        if ($scope.draggingData.isDragging || !$scope.isOnline || $scope.hoot.isRansquawk()) {
          return;
        }
        // to prevent unexpected mute in ptt mode
        if ($scope.isInPttMode && $scope.isOutgoingShouting) {
          return;
        }
        toggleShouting();

        event && event.stopPropagation();
      };

      $scope.handleShoutDepressed = function (event) {
        if ($scope.isInPttMode && $scope.isOutgoingShouting) {
          toggleShouting();
        }
        event && event.stopPropagation();
      };

      $scope.togglePauseAudio = function () {
        if ($scope.draggingData.isDragging) {
          return;
        }
        if ($scope.hoot.paused) {
          $scope.hoot.playAudio();
          SilencedHootsService.unsilence($scope.hoot);
        }
        else {
          $scope.hoot.pauseAudio();
          SilencedHootsService.persistSilence($scope.hoot);
        }
      };

      $scope.deleteHoot = function () {
        if ($scope.hoot.contact.type === constants.GKT.CONTACT_TYPE.ransquawk)
          return;

        ngDialog.openConfirm({
          template: '/partials/common/confirmDelete.html',
          data: {
            contactType: 'Hoot'
          }
        }).then(function () {
          TVC.deleteConnection($scope.hoot);
        });
      };
    }

    function initializePttModeStatus() {
      $scope.isInPttMode = HootsSettingsService.isPttModeOn($scope.hoot.uid);
      updatePttLabel();

      // switches between ptt and continues modes
      $scope.switchPttMode = function () {
        // if a hoot was in Continues mode and in shouting mode and user switches it to Push-to-talk
        // the hoot should be unshouted
        if (!$scope.isInPttMode && $scope.isOutgoingShouting) {
          toggleShouting();
        }

        $scope.isInPttMode = !$scope.isInPttMode;
        HootsSettingsService.setPttModeStatus($scope.hoot.uid, $scope.isInPttMode);
        updatePttLabel();
      };

      function updatePttLabel() {
        $scope.pttLabel = $scope.isInPttMode ? 'Hold to talk' : 'Push to talk';
      }
    }

    function setAngularListeners() {
      unwatches.push(
          $rootScope.$on(constants.UI_EVENTS.shout_changed_from_event_log, function (event, hootId) {
            if ($scope.hoot.uid === hootId)
              toggleShouting();
          }),

          $rootScope.$on(constants.UI_EVENTS.midi_push_shout_button, function (event, uid) {
            if ($scope.hoot.contact.uid !== uid) {
              return;
            }
            // toggle shouting in continues mode or start shouting in ptt mode
            if (!$scope.isInPttMode || !$scope.isOutgoingShouting) {
              toggleShouting();
            }
          }),

          $rootScope.$on(constants.UI_EVENTS.midi_release_shout_button, function (event, uid) {
            if ($scope.hoot.contact.uid !== uid) {
              return;
            }
            // stop shouting in ptt mode
            if ($scope.isInPttMode && $scope.isOutgoingShouting) {
              toggleShouting();
            }
          }),

          $rootScope.$on(constants.UI_EVENTS.connection_control_signal, function (event, connection, source, signal) {
            if (!connection || connection.uid !== $scope.hoot.uid) {
              return;
            }

            switch (signal) {
              case constants.UI_EVENTS.openfin_push_shout_button:
                $scope.handleShoutPressed();
                break;

              case constants.UI_EVENTS.openfin_release_shout_button:
                $scope.handleShoutDepressed();
                break;

              case constants.CONNECTION_SIGNALS.MUTE:
                $scope.isOutgoingShouting && toggleShouting();
                break;

              case constants.CONNECTION_SIGNALS.UNMUTE:
                !$scope.isOutgoingShouting && toggleShouting();
                break;
            }
          })
      );
    }

    function checkSilencedHoot() {
      if (SilencedHootsService.isSilenced($scope.hoot)) {
        $scope.hoot.pauseAudio();
      }
    }

    function detectAssignedHotKey() {
      updateHotKey();

      MidiService.addConnectionKeyChangeListener($scope.hoot.uid, updateHotKey);
      KeyboardService.addConnectionKeyChangeListener($scope.hoot.uid, updateHotKey);
    }

    function updateHotKey() {
      $scope.hotKey = HotkeysService.getAssignedHotKey($scope.hoot.uid);
    }

    function unsubscribeFromHotKeyChangeEvents(oldHootUid) {
      oldHootUid = oldHootUid || $scope.hoot.uid;
      MidiService.removeConnectionKeyChangeListener(oldHootUid, updateHotKey);
      KeyboardService.removeConnectionKeyChangeListener(oldHootUid, updateHotKey);
    }


    function toggleShouting() {
      if (!$scope.isConnected || $scope.draggingData.isDragging || $scope.hoot.mutedUser) {
        return;
      }

      try {
        $scope.hoot.toggleMute();
        $scope.isOutgoingShouting = !$scope.isOutgoingShouting;
        $scope.hoot.sendShoutStatus();
        $rootScope.$emit($scope.isOutgoingShouting ?
            constants.GKT.CALL_EVENTS.outbound_shout :
            constants.GKT.CALL_EVENTS.outbound_shout_end,
            $scope.hoot);
      }
      catch (err) {
        // On any exception, set the state to be muted
        $scope.hoot.mute();
        $scope.isOutgoingShouting = false;
        $scope.hoot.sendShoutStatus();
        // Ensure error is logged
        throw err;
      }
    }

    function cleanUpWatches() {
      _.each(unwatches, function (fn) {
        fn();
      });

      unwatches = [];
    }
  }

})();

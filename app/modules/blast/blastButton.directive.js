(function () {
  'use strict';

  angular.module('gkt.voiceBox.blast')
      .directive('blastButton', function () {
        return {
          restrict: 'E',
          scope: {
            blast: '=',
            columns: '='
          },
          replace: true,
          controller: [
            '$rootScope',
            '$scope',
            '$timeout',
            'commonConstants',
            'tvbUIState',
            'Blasts',
            'BlastUi',
            'ngDialog',
            'OpenFin',
            'CallManager',
            'HotkeysService',
            'KeyboardService',
            'MidiService',
            'AudioDevices',
            blastGroupController
          ],
          templateUrl: '/partials/blast/blastButton.html'
        };
      });

  function blastGroupController($rootScope, $scope, $timeout, constants, uiState, Blasts, BlastUi, ngDialog, OpenFin,
                                CallManager, HotkeysService, KeyboardService, MidiService, AudioDevices) {
    $scope.uiState = uiState;
    $scope.isOpenFin = OpenFin.exists();
    $scope.onlineQty = 0;
    $scope.isOnline = false;
    var hootStatusListeners = {};
    var unwatches = [];

    initPresenceListeners();
    detectAssignedHotKey();
    updatePttLabel();

    $scope.$watch('blast.id', function (newValue, oldValue) {
      if (newValue === oldValue) {
        return;
      }

      closeTornOutWindowSafe(oldValue);
      reinitializeButton();
      reinitializeHotKey(oldValue);
      updatePttLabel();
    });

    unwatches.push(
        $rootScope.$on(constants.UI_EVENTS.blasts_saved, reinitializeButton),

        $rootScope.$on(constants.UI_EVENTS.midi_push_shout_button, function (event, id) {
          $scope.blast.id === id && $scope.handleShoutPressed();
        }),

        $rootScope.$on(constants.UI_EVENTS.midi_release_shout_button, function (event, id) {
          $scope.blast.id === id && $scope.handleShoutDepressed();
        }),

        $rootScope.$on(constants.UI_EVENTS.connection_control_signal,
            function (event, connection, source, signal) {
              if (!connection || connection.uid !== $scope.blast.uid) {
                return;
              }

              switch (signal) {
                case constants.UI_EVENTS.openfin_push_shout_button:
                case constants.UI_SIGNALS.PRESS:
                  $scope.handleShoutPressed();
                  break;

                case constants.UI_EVENTS.openfin_release_shout_button:
                case constants.UI_SIGNALS.RELEASE:
                  $scope.handleShoutDepressed();
                  break;
              }
            })
    );

    function closeTornOutWindowSafe(groupId) {
      var uid = groupId || $scope.blast && $scope.blast.uid;
      uid && OpenFin.closeTornWindow(uid, OpenFin.TYPES.hoots);
    }

    function destroy() {
      closeTornOutWindowSafe();
      unsubscribeFromHotKeyChangeEvents();
    }

    function handleConnectionStatus(newStatus) {
      $timeout(function () {
        newStatus === constants.GKT.PRESENCE.online ? increaseOnlineMembersQty() : decreaseOnlineMembersQty();
        updateBlastStatus();
      });
    }
    
    function increaseOnlineMembersQty() {
      $scope.onlineQty++;
    }
    
    function decreaseOnlineMembersQty() {
      $scope.onlineQty > 0 && $scope.onlineQty--;
    }

    function updateBlastStatus() {
      var previousStatus = $scope.isOnline;
      $scope.isOnline = $scope.onlineQty > 0;
      // to prevent events flood it needs to check if status really changed
      if (previousStatus !== $scope.isOnline) {
        var events = constants.UI_EVENTS,
            eventName = $scope.isOnline ? events.connection_came_online : events.connection_came_offline;
        // notify torn blast buttons about status changing
        $rootScope.$emit(eventName, $scope.blast);
      }
    }

    function initPresenceListeners() {
      $scope.onlineQty = 0;

      CallManager.getHootConnections().then(function (data) {
        // set presence listeners for all members
        _.each($scope.blast._members, function (hootId) {
          var hoot = data[hootId];
          if (!hoot) return;

          hoot.status === constants.GKT.PRESENCE.online && increaseOnlineMembersQty();
          hootStatusListeners[hoot.uid] = hoot.onConnectionStatusChange(handleConnectionStatus);
        });

        // it's possible to update blast's status only when its online members are counted
        updateBlastStatus();

        // give OpenFin window time to run onOpen / onClose callback
        $timeout(function() {
          // Open torn window, if it's persisted
          if (OpenFin.exists() && OpenFin.isConnectionTornOutPermanently($scope.blast.uid))
            OpenFin.tearBlastOut($scope.blast, $scope.onlineQty > 0);
        }, 500);
      });
    }

    function clearPresenceListeners() {
      _.each(_.values(hootStatusListeners), function (fn) {
        fn();
      });
    }

    function reinitializeButton() {
      clearPresenceListeners();
      initPresenceListeners();
    }

    function reinitializeHotKey(oldBlastUid) {
      unsubscribeFromHotKeyChangeEvents(oldBlastUid);
      detectAssignedHotKey();
    }

    function detectAssignedHotKey() {
      updateHotKey();

      MidiService.addConnectionKeyChangeListener($scope.blast.uid, updateHotKey);
      KeyboardService.addConnectionKeyChangeListener($scope.blast.uid, updateHotKey);
    }

    function unsubscribeFromHotKeyChangeEvents(oldBlastUid) {
      oldBlastUid = oldBlastUid || $scope.blast.uid;
      MidiService.removeConnectionKeyChangeListener(oldBlastUid, updateHotKey);
      KeyboardService.removeConnectionKeyChangeListener(oldBlastUid, updateHotKey);
    }

    function updateHotKey() {
      $scope.hotKey = HotkeysService.getAssignedHotKey($scope.blast.uid);
    }

    function updatePttLabel() {
      $scope.pttLabel = $scope.blast.isInPttMode ? 'Hold to talk' : 'Push to talk';
    }

    function toggleShouting() {
      $scope.blast.shouting = !$scope.blast.shouting;
      sendSignalsToHoots();
      $rootScope.$emit($scope.blast.shouting ?
              constants.UI_EVENTS.blast_button_pressed :
              constants.UI_EVENTS.blast_button_released,
          $scope.blast);
    }

    function sendSignalsToHoots() {
      _.each($scope.blast._members, function (hootUid) {
        if (!$scope.blast.isPaused(hootUid)) {
          $rootScope.$emit(
            constants.UI_EVENTS.connection_control_signal,
            // connection; in fact only uid is checked
            {uid: hootUid},
            // where signal was send from
            'BlastGroup',
            // signal
            $scope.blast.shouting ? constants.CONNECTION_SIGNALS.UNMUTE : constants.CONNECTION_SIGNALS.MUTE
          );
        }
      });
    }

    $scope.$on('$destroy', function () {
      clearPresenceListeners();
      destroy();
      _.each(unwatches, function (fn) {
        fn();
      });
    });


    if ($scope.isOpenFin) {
      $scope.tearOut = function() {
        OpenFin.tearBlastOut($scope.blast, $scope.onlineQty > 0);
      };
    }

    $scope.handleShoutPressed = function () {
      // to prevent unexpected mute in ptt mode
      if ($scope.blast.isInPttMode && $scope.blast.shouting) {
        return;
      }
      // it shouldn't do anything if there are no active contacts
      if ($scope.onlineQty < 1) {
        return;
      }
      toggleShouting();
    };

    $scope.handleShoutDepressed = function () {
      if ($scope.blast.isInPttMode && $scope.blast.shouting) {
        toggleShouting();
      }
    };

    // switches between ptt and continues modes
    $scope.switchPttMode = function () {
      // if a blast group was in Continues mode, shouting was in progress and user switched it to Push-to-talk
      // all hoots of the blast group should be unshouted
      if (!$scope.blast.isInPttMode && $scope.blast.shouting) {
        toggleShouting();
      }

      $scope.blast.isInPttMode = !$scope.blast.isInPttMode;
      updatePttLabel();
      Blasts.save(true);
    };


    $scope.getOutputDeviceContext = function () {
      var hootAudioDeviceProfile = AudioDevices.getAudioDeviceProfile(HootConnection.getDefaultAudioDeviceProfileId());
      return {
        disabled: $scope.onlineQty === 0,
        deviceId: hootAudioDeviceProfile ? hootAudioDeviceProfile.getOutputDeviceContext() : null
      };
    };

    $scope.deleteBlastGroup = function () {
      ngDialog.openConfirm({
        template: '/partials/common/confirmDelete.html',
        data: {
          contactType: 'Blast Group'
        }
      }).then(function () {
        Blasts.deleteGroup($scope.blast.id);
        Blasts.save();
      });
    };

    $scope.showConfigDialog = function () {
      BlastUi.openBlastPanel();
      // give the blast panel time for initialization
      $timeout(function () {
        BlastUi.selectBlastGroup($scope.blast.id);
      }, 200);
    };

    $scope.openQuickBlastPanel = function(event) {
      event.stopPropagation();
      BlastUi.openQuickBlastPanel($scope.blast);
    };
  }

})();

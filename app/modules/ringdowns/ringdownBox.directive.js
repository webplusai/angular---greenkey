(function () {
  'use strict';

  angular.module('gkt.voiceBox.ringdowns')
      .directive('ringdownBox', function () {
        return {
          restrict: 'EA',
          scope: {
            ringdown: '=',
            draggingData: '='
          },
          controller: ['$scope', '$rootScope', '$timeout', 'commonConstants', 'tvbUIState',
            'CallService', 'ngDialog', 'OpenFin', 'TVC', ringdownBoxController
          ],
          templateUrl: '/partials/ringdowns/ringdown.html',
          replace: true
        };
      });

  function ringdownBoxController($scope, $rootScope, $timeout, constants, tvbUIState,
                                 callService, ngDialog, OpenFin, TVC) {

    //this variable need to be initialized here to add ability for changing column grid classes for ringdowns and for
    //empty slots. Also it shouldn't be deleted thru destroy() method.
    $scope.uiState = tvbUIState;

    var unwatches = [];
    var ON_CALL_STATUSES = [
      constants.GKT.CALL_STATUS.muted,
      constants.GKT.CALL_STATUS.active,
      constants.GKT.CALL_STATUS.connecting
    ];

    var ACTIVE_CALL_STATUSES = [
      constants.GKT.CALL_STATUS.muted,
      constants.GKT.CALL_STATUS.active
    ];

    // first, we need to watch changing of the cell's content
    $scope.$watch('ringdown', function (newVal, oldVal) {
      if (newVal.emptySlot && oldVal.emptySlot || newVal.uid === oldVal.uid) {
        return;
      }

      // close the window bound to old connection from this cell
      closeTornOutWindowSafe(oldVal.uid);
      
      // we need to clean watchers at any case: whether hoot is deleted, created or changed
      cleanUpWatches();

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

    if (!$scope.ringdown || $scope.ringdown.emptySlot) {
      return;
    }

    setUp();

    function refreshState() {
      $scope.onCall = ($scope.ringdown.type !== constants.GKT.CONTACT_TYPE.sipTDMRingdown
        || $scope.ringdown.sipTDMStatus !== constants.GKT.SIP_EVENTS.sipTDMDisconnected) &&
        _.includes(ON_CALL_STATUSES, $scope.ringdown.callStatus);

      var oldStatus = $scope.online;
      $scope.online = isOnline();
      if(oldStatus !== $scope.online){
        if($scope.online){
          callService.registerConnection($scope.ringdown);
          $rootScope.$emit(constants.UI_EVENTS.connection_came_online, $scope.ringdown);
        } else {
          callService.unregisterConnection($scope.ringdown.uid);
          $rootScope.$emit(constants.UI_EVENTS.connection_came_offline, $scope.ringdown);
        }
      }
    }

    function isOnline() {
      return ($scope.ringdown.type !== constants.GKT.CONTACT_TYPE.sipTDMRingdown
        || _.includes(ACTIVE_CALL_STATUSES, $scope.ringdown.callStatus)) &&
        $scope.ringdown.status === constants.GKT.PRESENCE.online;
    }

    // definitions
    function setUp() {
      $scope.isOpenFin = OpenFin.exists();
      $scope.isExternalContact = $scope.ringdown instanceof ExternalConnection;
      $scope.online = isOnline();
      refreshState();

      // register the connection if it's online and wasn't registered already
      if ($scope.online && !callService.getConnection($scope.ringdown.uid)) {
        callService.registerConnection($scope.ringdown);
      }

      // initially unmute the connection (all connections are created muted)
      if ($scope.ringdown.callStatus === constants.GKT.CALL_STATUS.active) {
        $timeout(function () {
          $scope.ringdown.unmute();
        }, 200);
      }

      // if there is new ringdown in this cell, close obsolete torn out window
      closeTornOutWindowSafe();

      // give OpenFin window time to run onOpen / onClose callback
      $timeout(function() {
        // Open torn window, if it's persisted
        if(OpenFin.exists() && OpenFin.isConnectionTornOutPermanently($scope.ringdown.uid))
          OpenFin.tearRingdownOut($scope.ringdown);
      }, 500);

      setStatusChangeListeners();
      setUiHandlers();
    }

    /**
     * Called when the cell becomes an empty slot
     */
    function destroy() {
      delete $scope.isOpenFin;
      delete $scope.isExternalContact;
      delete $scope.online;
      delete $scope.onCall;

      delete $scope.getOutputDeviceContext;
      delete $scope.tearOut;
      delete $scope.deleteRingdown;
      delete $scope.toggleMute;
      delete $scope.call;

      closeTornOutWindowSafe();
    }

    function closeTornOutWindowSafe(ringdownUid) {
      var uid = ringdownUid || $scope.ringdown && $scope.ringdown.uid;
      uid && OpenFin.closeTornWindow(uid, OpenFin.TYPES.ringdowns);
    }

    function setUiHandlers() {

      $scope.getOutputDeviceContext = function () {
        return {
          disabled: !$scope.ringdown.status || $scope.ringdown.status === constants.GKT.PRESENCE.offline || $scope.draggingData.isDragging || $scope.uiState.settingsVisible,
          deviceId: $scope.ringdown.getAudioOutputDeviceId()
        };
      };

      $scope.deleteRingdown = function () {
        ngDialog.openConfirm({
          template: '/partials/common/confirmDelete.html',
          data: {
            contactType: 'Ringdown'
          }
        }).then(function () {
          TVC.deleteConnection($scope.ringdown);
        });
      };

      $scope.toggleMute = function () {
        $scope.ringdown.toggleMute();
      };


      function callSpeedDialExternalContact() {
        // if call is in progress
        if (callService.getConnection($scope.ringdown.uid)) {
          $scope.ringdown.hangup();
        } else {
          callService.callExternalContact($scope.ringdown);
        }
      }

      function callRingdown() {
        callService.makeRingdownCall($scope.ringdown.uid);
      }

      $scope.call = function (tearout) {
        if ($scope.draggingData.isDragging || ($scope.uiState.settingsVisible && !tearout)) {
          return;
        }

        $scope.ringdown instanceof ExternalConnection ? callSpeedDialExternalContact() : callRingdown();
      };

      if ($scope.isOpenFin) {
        $scope.tearOut = function () {
          OpenFin.tearRingdownOut($scope.ringdown);
        };
      }
    }

    function setStatusChangeListeners() {
      if ($scope.ringdown.onCallStatusChange && $scope.ringdown.onConnectionStatusChange
        && $scope.ringdown.onSipTDMStatusChanged) {
        unwatches.push($scope.ringdown.onCallStatusChange(refreshStateInAngularContext));
        unwatches.push($scope.ringdown.onConnectionStatusChange(refreshStateInAngularContext));
        unwatches.push($scope.ringdown.onSipTDMStatusChanged(refreshStateInAngularContext));
      }

      unwatches.push($rootScope.$on(constants.UI_EVENTS.connection_control_signal,
          function (event, connection, source, signal) {
            if (!connection || connection.uid !== $scope.ringdown.uid) {
              return;
            }
            if (signal === 'call') {
              $scope.call(true);
            }
          }));
    }

    function refreshStateInAngularContext() {
      $timeout(function () {
        refreshState();
      });
    }

    function cleanUpWatches() {
      _.each(unwatches, function (fn) {
        fn();
      });

      unwatches = [];
    }

  }
})();
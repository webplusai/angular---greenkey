(function() {
  'use strict';

  angular.module('gkt.voiceBox.activeCalls')
    .directive('activeCallBox', function () {
      return {
        restrict: 'EA',
        scope: {
          call: '=',
          releaseSelectedCalls: '&',
          initializeAudio: '='
        },
        templateUrl: '/partials/activeCalls/activeCall.html',
        replace: true,
        controller: activeCallBoxController,
        controllerAs: 'callCtrl'
      };
    });

  function activeCallBoxController($rootScope, $scope, $timeout, AudioService, commonConstants, Notifications, Timer, OpenFin, tvbUIState) {
    $scope.muted = $scope.call.muted;
    $scope.silenced = $scope.call.paused;
    $scope.soundPromise = null;
    $scope.callStatus = getInitialStatus();
    var isActiveCall = $scope.callStatus === commonConstants.GKT.CALL_STATUS.active;
    $scope.accepted = !$scope.call.GKT_isInboundCall || isActiveCall;
    $scope.selected = false;
    $rootScope.$emit(commonConstants.UI_EVENTS.active_call_unselected, $scope.call);
    $scope.isOpenFin = OpenFin.exists();
    $scope.uiState = tvbUIState;
    $scope.isRingdownDeviceSet = true;
    $scope.audioDeviceLabel = $scope.isRingdownDeviceSet ? 'Move to hoot device' : 'Move to ringdown device';
    var offControlSignalListener;

    var audioService = $scope.call.GKT_isInboundCall ?
      AudioService.getNotificationAudioForInboundCall()
      : AudioService.getNotificationAudioForOutgoingCall($scope.call.getAudioOutputDeviceId());
    if (!isActiveCall) {
      audioService.play();
    }

    function getInitialStatus() {
      if ($scope.call.type !== commonConstants.GKT.CONTACT_TYPE.sipTDMRingdown) {
        return ($scope.call.callStatus && $scope.call.callStatus !== commonConstants.GKT.CALL_STATUS.disconnected) ?
          $scope.call.callStatus : commonConstants.GKT.CALL_STATUS.connecting;
      } else {
        return getCallStatus();
      }
    }

    function getCallStatus() {
      var res = null;
      if($scope.call.type === commonConstants.GKT.CONTACT_TYPE.sipTDMRingdown){
        if($scope.call.sipTDMStatus === commonConstants.GKT.SIP_EVENTS.sipTDMConnected){
          res = commonConstants.GKT.CALL_STATUS.active;
        } else if($scope.call.sipTDMStatus === commonConstants.GKT.SIP_EVENTS.sipTDMIncomingConnectionRequest) {
          res = commonConstants.GKT.CALL_STATUS.connecting;
        } else {
          res = commonConstants.GKT.CALL_STATUS.disconnected;
        }
      }
      else {
        res = $scope.call.callStatus;
      }
      return res;
    }

    function stopAudio(){
      if(audioService){
        audioService.pause();
        audioService = null;
      }
    }

    var onStatusChangeCbk = function(event, contactUid) {
      var newValue = getCallStatus();
      if (contactUid !== $scope.call.uid || newValue === $scope.callStatus)
        return;

      if (newValue === commonConstants.GKT.CALL_STATUS.disconnected) {
        $rootScope.$emit(commonConstants.UI_EVENTS.active_call_unselected, $scope.call);
        $rootScope.$emit(commonConstants.GKT.CALL_EVENTS.hangup_call, $scope.call);

        if ($scope.call.elapsedTime) {
          $scope.call.elapsedTime.cancel();
          $scope.call.elapsedTime = null;
        }
      }

      if (newValue === commonConstants.GKT.CALL_STATUS.active || newValue === commonConstants.GKT.CALL_STATUS.disconnected) {
        stopAudio();
        if ($scope.call.muted) {
          $scope.call.mute();
        } else {
          $scope.call.unmute();
        }
      }

      if (newValue === commonConstants.GKT.CALL_STATUS.rejected) {
        $rootScope.$emit('dialer:reset');
      }

      $timeout(function() {
        // it's stange but this timeout can be applied to different contact
        // need to understand how it can be
        if (contactUid === $scope.call.uid){
          $scope.callStatus = newValue;
          $scope.muted = $scope.call.muted;
          $scope.silenced = $scope.call.paused;
        }
      });

      if (newValue === commonConstants.GKT.CALL_STATUS.active) {
        $scope.call.elapsedTime = Timer.run(1000);
      }
    };

    $scope.call.onCallStatusChange(onStatusChangeCbk);
    $scope.call.onSipTDMStatusChanged(onStatusChangeCbk);

    $scope.changeAudioProfile = function() {
      /* Another way to change audio device profile needed */
    };

    $scope.hangup = function() {
      $scope.call.hangup();
      if ($scope.call.elapsedTime) {
        $scope.call.elapsedTime.cancel();
      }
    };

    $scope.acceptCall = function() {
      if (!$scope.accepted) {
        $scope.muted = false;
        $scope.call.acceptCall();
        $timeout(function() {
          $scope.call.unmute();
          $scope.muted = $scope.call.muted;
        },200);
        $scope.accepted = true;
        $rootScope.$emit(commonConstants.UI_EVENTS.active_call_accepted,
          commonConstants.CONNECTION_CONTAINER_TYPE.hootContainer, $scope.call);
      }
    };

    $scope.rejectCall = function() {
      if (!$scope.accepted) {
        $scope.call.rejectCall();
      }
    };

    var offActiveCallReleasedFn;
    $scope.selectCall = function () {
      $scope.selected = !$scope.selected;
      if ($scope.selected) {
        offActiveCallReleasedFn = $rootScope.$on(commonConstants.UI_EVENTS.selected_calls_released, $scope.hangup);
        $rootScope.$emit(commonConstants.UI_EVENTS.active_call_selected, $scope.call);
      } else {
        offActiveCallReleasedFn();
        offActiveCallReleasedFn = undefined;
        $rootScope.$emit(commonConstants.UI_EVENTS.active_call_unselected, $scope.call);
      }
    };

    $scope.toggleMute = function() {
      $scope.call.toggleMute();
      $scope.muted = $scope.call.muted;
      $rootScope.$emit(commonConstants.UI_EVENTS.active_call_toggled_mute, $scope.call, $scope.muted);
    };

    $scope.toggleSilence = function() {
      $scope.call[$scope.call.paused ? 'playAudio' : 'pauseAudio']();
      $scope.silenced = $scope.call.paused;
      $rootScope.$emit(commonConstants.UI_EVENTS.active_call_toggled_silence, $scope.call, $scope.silenced);
    };

    $scope._isVolumeMuted = function() {
      return $scope.muted || $scope.callStatus !== commonConstants.GKT.CALL_STATUS.active;
    };

    // e.g. from OpenFin
    offControlSignalListener = $rootScope.$on(commonConstants.UI_EVENTS.connection_control_signal,
      function(event, connection, source, signal) {
        if (!connection || connection.uid !== $scope.call.uid) {
          return;
        }
        switch (signal) {
          case 'accept':
            $scope.acceptCall();
            break;
          case 'reject':
            $scope.rejectCall();
            break;
          case 'mute':
            $scope.toggleMute();
            break;
          case 'select':
            $scope.selectCall();
            break;
          case 'release':
            $scope.releaseSelectedCalls()();
            break;
          case 'silence':
            $scope.toggleSilence();
            break;
        }
      });

    $scope.$on('$destroy', function () {
      if (offActiveCallReleasedFn){
        offActiveCallReleasedFn();
      }
      stopAudio();

      offControlSignalListener && offControlSignalListener();

      closeOpenFinPopupWindows();
      $scope.call.off(commonConstants.GKT.CALL_EVENTS.call_status_change, onStatusChangeCbk);
      $scope.call.off(commonConstants.GKT.CALL_EVENTS.sipTDMStatusChanged, onStatusChangeCbk);
    });

    if ($scope.isOpenFin) {
      $scope.tearOut = function () {
        OpenFin.tearActiveCallOut($scope.call, $scope.selected);

        /* Close out any notification to avoid user confusion, 
        notification and tearout for active calls are using the same template design */
        Notifications.closeConnectionNotification($scope.call.uid);
      };
    }

    function closeOpenFinPopupWindows(){
      if (!$scope.isOpenFin) { return; }

      OpenFin.closeTornWindow($scope.call.uid, OpenFin.TYPES.calls);
      Notifications.closeConnectionNotification($scope.call.uid);
    }
  }

})();

(function () {
  'use strict';

  angular.module('gkt.voiceBox.activeCalls')
    .directive('transcriptionTrainingPanel', function () {
      return {
        restrict: 'E',
        scope: {},
        controller: ['$scope', '$timeout', 'commonConstants',
          'CallService', 'ngDialog', 'usSpinnerService', trainingPanel
        ],
        templateUrl: '/partials/transcription/trainingPanel.html',
        replace: true
      };
    });

  function trainingPanel($scope, $timeout, constants,
                                 callService, ngDialog, usSpinnerService) {

    $scope.recording = false;
    $scope.connecting = false;
    $scope.recorded = false;
    $scope.playback = false;
    var contact = null;
    var offListener = null;

    $scope.closeThisDialog = function() {
      $scope.stop();
      ngDialog.close();
    };

    $scope._isVolumeMuted = function() {
      return !$scope.recording;
    };

    $scope.register = function() {
      ngDialog.open({
        template: '/partials/common/infoDialog.html',
        data: {
          title: 'Success',
          phrase: 'Recording was successfully registered!'
        }
      }).closePromise.then(function() {
        $scope.closeThisDialog();
      });
    };

    $scope.reset = function() {
      $scope.recording = false;
      $scope.recorded = false;
      $scope.playback = false;
      $scope.connecting = false;
    };

    $scope.startRecording = function() {
      $scope.connecting = true;
      contact = callService.makeExternalCall("8000", "Transcription Training");

      offListener = contact.onCallStatusChange(function(data) {
        if(data.newStatus === data.oldStatus) return;

        if(data.newStatus === constants.GKT.CALL_STATUS.active) {
          $timeout(function(){
            $scope.recording = true;
            $scope.playback = false;
            $scope.connecting = false;
            usSpinnerService.spin('spinner-1');
          }, 4000);
        }

        if(data.newStatus === constants.GKT.CALL_STATUS.disconnected) {
          $scope.stop();
        }
      });
    };

    $scope.play = function() {
      $scope.recording = false;
      $scope.playback = true;
    };

    $scope.stop = function() {
      if($scope.recording) {
        $scope.recorded = true;
        usSpinnerService.stop('spinner-1');
        contact && contact.hangup();
        offListener && offListener();
        contact = null;
        offListener = null;
      }

      $scope.recording = false;
      $scope.playback = false;
    };
  }
})();
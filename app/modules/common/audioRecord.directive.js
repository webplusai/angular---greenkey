(function() {
  'use strict';
  angular.module('gkt.voiceBox.common')

  .directive('audioRecord', function($timeout, AudioRecordingService, commonConstants, CallManager, AudioRecordingMediatorService) {
    return {
      restrict: 'AE',
      scope: {
        connection: '=',
        connectionUid: '='
      },
      templateUrl: '/partials/audio-record.html',
      link: function audioRecordLink(scope, element) {
        var recording;
        var audioTag = null;
        var isRecording;
        var connection = scope.connection;

        scope.isRecordingAvailable = false;
        scope.isPlaying = false;

        var _getConnectionById = function(uid) {
          var cons = CallManager.getActiveConnectionsByType([commonConstants.GKT.CONTACT_TYPE.hoot]);
          return _.find(cons, { uid: uid });
        };

        var _createAudioTag = function(audioURL) {
          audioTag = $('<audio controls src="' + audioURL + '"></audio>');
          element.append(audioTag);

          audioTag[0].addEventListener('ended', function() {
            scope.$apply(function() {
              scope.isPlaying = false;
            });
          });
        };

        var _onStopRecording = function(audioURL) {
          if (!isRecording) { return; }

          $timeout(function() {
            _createAudioTag(audioURL);
            isRecording = false;
            scope.isRecordingAvailable = true;
          });
        };

        var _onShout = function() {
          if (isRecording && !connection.isCounterpartyShouting()) {
            recording.stopRecording();
          }
        };

        scope.onPlay = function() {
          if (audioTag) {
            audioTag[0].play();
            AudioRecordingMediatorService.publishPlayRecording();
            scope.isPlaying = true;
          }
        };

        scope.onPause = function() {
          if (audioTag) {
            audioTag[0].pause();
            scope.isPlaying = false;
          }
        };

        scope.onStop = function() {
          if (audioTag && scope.isPlaying) {
            audioTag[0].pause();
            audioTag[0].currentTime = 0;
            $timeout(function() {
              scope.isPlaying = false;
            });
          }
        };

        if (!scope.connectionUid && !scope.connection) { return; }

        if (scope.connectionUid) {
          connection = _getConnectionById(scope.connectionUid);
        }

        recording = AudioRecordingService.startRecording(connection, 30000);

        if (!recording) {
          return;
        }

        recording.onRecordingStopped(_onStopRecording.bind(this));
        isRecording = true;

        if (connection.type === commonConstants.GKT.CONTACT_TYPE.hoot) {
          connection.addShoutListener(_onShout);
        }

        AudioRecordingMediatorService.addPlayListener(scope.onStop);

        scope.$on('destroy', function() {
          connection.removeShoutListener(_onShout);
          recording.clearRecordedData();
          audioTag.remove();
          AudioRecordingMediatorService.removePlayListener(scope.onStop);
        });
      }

    };
  });

})();

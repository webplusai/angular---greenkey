(function() {
  'use strict';

  var RECORDING_STOPPED_EVENT = 'recordingStopped';

  angular.module('gkt.voiceBox.services')

  .factory('AudioRecordingService', function() {

    var recordHash = {};

    var _onRecordingStopped = function(audioURL, mediator, conn) {
      mediator.publish(RECORDING_STOPPED_EVENT, audioURL);
      delete recordHash[conn.uid];
    };

    var _startRecording = function(conn, duration) {
      if (!conn) { return null; }

      if (recordHash[conn.uid]) {
        return recordHash[conn.uid];
      }

      var mediator = new Mediator();
      var mediaStream = conn.getRemoteStream();

      if (!mediaStream) { return null; }

      var recordRTC = new RecordRTC(mediaStream.clone(), {
        recorderType: StereoAudioRecorder,
        disableLogs: true,
        numberOfAudioChannels: 1
      });
      var recording = recordRTC.setRecordingDuration(duration || 30000);

      recording.onRecordingStopped(function(audioURL) {
        _onRecordingStopped(audioURL, mediator, conn);
        recordRTC.clearRecordedData();
      });

      recordRTC.startRecording({
        audio: true,
        video: false
      });

      var record = {
        onRecordingStopped: function(cbk) { // allowing multiple recording listeners.
          mediator.on(RECORDING_STOPPED_EVENT, cbk);
        },

        clearRecordedData: recordRTC.clearRecordedData,
        stopRecording: function() {
          recordRTC.stopRecording(function(audioURL) {
            _onRecordingStopped(audioURL, mediator, conn);
            recordRTC.clearRecordedData();
          });
        }
      };

      recordHash[conn.uid] = record;

      return record;
    };

    return {
      startRecording: _startRecording
    };

  });
})();

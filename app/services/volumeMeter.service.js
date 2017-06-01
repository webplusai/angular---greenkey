(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .service('VolumeMeterService', function($rootScope, $interval, CallService, commonConstants) {

    var confByMic = {};

    function init(sinkId) {
      sinkId = sinkId || '';

      if (confByMic[sinkId]) { return; }

      confByMic[sinkId] = {};
      confByMic[sinkId].sinkId = sinkId;
      confByMic[sinkId].microphoneInputVolume = 0;
      confByMic[sinkId].isInitialized = false;
      confByMic[sinkId].isCalculationInProgress = false;
      confByMic[sinkId].isMeasuring = false;

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia(_buildAudioConstraints(sinkId))
          .then(initializeServiceObjects.bind(this, sinkId))
          .catch(handleUnsuccessfulGetMedia);
      } else {
        navigator.getUserMedia(_buildAudioConstraints(sinkId), initializeServiceObjects.bind(this, sinkId), handleUnsuccessfulGetMedia);
      }

      // activate analyzer only when outbound stream exists
      $rootScope.$on(commonConstants.UI_EVENTS.outbound_streams_count_updated, function() {
        CallService.outboundStreamExists() ? startVolumeMeasuring(sinkId) : stopVolumeMeasuring();
      });
    }

    function handleUnsuccessfulGetMedia() {
      console.log('Cannot initialize volume meter: not available to get media stream');
    }

    function initializeServiceObjects(sinkId, stream) {
      var AudioContext = window.AudioContext || window.webkitAudioContext;

      if (typeof AudioContext !== 'function') {
        return;
      }

      confByMic[sinkId].audioContext = new AudioContext();
      confByMic[sinkId].analyser = confByMic[sinkId].audioContext.createAnalyser();
      confByMic[sinkId].analyser.fftSize = 128;
      confByMic[sinkId].microphoneStreamSample = new Uint8Array(confByMic[sinkId].analyser.frequencyBinCount);
      confByMic[sinkId].processor = confByMic[sinkId].audioContext.createScriptProcessor(1024, 1, 1);

      var microphoneStream = confByMic[sinkId].audioContext.createMediaStreamSource(stream);
      microphoneStream.connect(confByMic[sinkId].analyser);
      confByMic[sinkId].processor.onaudioprocess = measureCurrentMicrophoneVolume.bind(this, sinkId);

      confByMic[sinkId].isInitialized = true;

      // if we already have opened line
      if (CallService.outboundStreamExists()) {
        startVolumeMeasuring(sinkId);
      }
    }

    function measureCurrentMicrophoneVolume(sinkId) {
      // to prevent concurrent calculations
      if (confByMic[sinkId].isCalculationInProgress) {
        return;
      }
      confByMic[sinkId].isCalculationInProgress = true;
      confByMic[sinkId].analyser.getByteFrequencyData(confByMic[sinkId].microphoneStreamSample);
      confByMic[sinkId].microphoneInputVolume = calculateAverageVolume(sinkId);
    }

    function calculateAverageVolume(sinkId) {
      var sampleSize = confByMic[sinkId].microphoneStreamSample.length,
          sum = 0;

      // leave very low frequencies out of account
      for (var i = Math.floor(sampleSize / 8); i < sampleSize; i++) {
        sum += confByMic[sinkId].microphoneStreamSample[i];
      }

      confByMic[sinkId].isCalculationInProgress = false;
      return Math.floor(sum / sampleSize);
    }

    function startVolumeMeasuring(sinkId) {
      if (!confByMic[sinkId].isInitialized || confByMic[sinkId].isMeasuring) {
        return;
      }
      confByMic[sinkId].isMeasuring = true;
      confByMic[sinkId].processor.connect(confByMic[sinkId].audioContext.destination);
      // update all volume meters on page 5 times per second
      confByMic[sinkId].updateGuiInterval = $interval(notifyVolumeChange.bind(this, sinkId), 200);
    }

    function stopVolumeMeasuring() {
      _.each(_.values(confByMic), function(val) {
        if (val.isInitialized) {
          $interval.cancel(val.updateGuiInterval);
          val.processor.disconnect();
          val.isMeasuring = false;
          val.microphoneInputVolume = 0;
          notifyVolumeChange(val.sinkId);
        }
      });
    }

    function notifyVolumeChange(sinkId) {
      $rootScope.$emit(commonConstants.UI_EVENTS.meter_volume_changed, confByMic[sinkId].microphoneInputVolume, sinkId);
    }

    function _buildAudioConstraints(sinkId) {
      return {
        audio: {
          optional: [{
            sourceId: sinkId
          }]
        }
      };
    }


    return {
      init: init,
      startVolumeMeasuring: startVolumeMeasuring,
      stopVolumeMeasuring: stopVolumeMeasuring
    };

  });

})();

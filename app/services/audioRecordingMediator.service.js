(function() {
  'use strict';

  var PLAY_RECORDING_EVENT = 'play_recording';

  angular.module('gkt.voiceBox.services')

  .factory('AudioRecordingMediatorService', function() {

    var mediator = new Mediator();

    var _publishPlayRecording = mediator.trigger.bind(mediator, PLAY_RECORDING_EVENT);
    var _addPlayListener = mediator.on.bind(mediator, PLAY_RECORDING_EVENT);
    var _removePlayListener = mediator.off.bind(mediator, PLAY_RECORDING_EVENT);

    return {
      publishPlayRecording: _publishPlayRecording,
      addPlayListener: _addPlayListener,
      removePlayListener: _removePlayListener,
    };

  });
})();

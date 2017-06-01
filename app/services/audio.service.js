(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .factory('AudioService', ['AUDIO_CONSTANTS', 'AudioDevices', function(AUDIO_CONSTANTS, AudioDevices) {

    var audioElemById = {};

    function getAudioElemId(type, sinkId){
      return type + '_' + (sinkId || '');
    }

    function getAudioElem(type, sinkId, replayInterval) {
      if(!sinkId){
        var device = AudioDevices.getNotificationDevice();
        sinkId = device && device.deviceId ? device.deviceId : AudioController.prototype.getAECDevice();
      }
      var id = getAudioElemId(type, sinkId);
      var audio = audioElemById[id];

      if (!audio) {
        audio = new Audio(type);
        audioElemById[id] = audio;
        if (audio.setSinkId && sinkId) {
          audio.setSinkId(sinkId);
        }

        var originalPlay = audio.play.bind(audio);
        var originalPause = audio.pause.bind(audio);
        var playRequestsCount = 0;
        var replayTimerId = null;

        var stop = function(){
          originalPause();
          audio.currentTime = 0;
        };

        var replay = function(){
          stop();
          originalPlay();
        };

        audio.isPlayingNow = function () {
          return playRequestsCount > 0;
        };

        audio.play = function () {
          if (playRequestsCount <= 1 || !replayInterval) {
            playRequestsCount = 1;
            replay();
            if (replayInterval && replayInterval > 0 && !replayTimerId) {
              replayTimerId = setInterval(function() {
                replay();
              }, replayInterval);
            }
          } else {
            playRequestsCount++;
          }
        };

        audio.forcePause = function(){
          playRequestsCount = 0;
          this.pause();
        };

        audio.pause = function () {
          playRequestsCount--;
          if (!this.isPlayingNow()) {
            stop();
            if (replayTimerId) {
              clearInterval(replayTimerId);
              replayTimerId = null;
            }
          }
        };
      }

      return audio;
    }

    function createNotificationAudioController(type, outputDeviceId, audioDelay, replayInterval){
      var audio = getAudioElem(type, outputDeviceId, replayInterval);
      var playing = null;
      return {
        play: function() {
          setTimeout(function() {
            if(playing === null){
              playing = true;
              audio.play();
            }
          }, audioDelay);
        },
        pause: function(){
          if(playing){
            audio.pause();
          }
          playing = false;
        },

        isPlaying: function() {
          return !!playing;
        }
      }
    }

    return {
      //Stop all sounds
      pause: function() {
        _.forEach(audioElemById, function(audioElem){
          audioElem.forcePause();
        });
      },

      getNotificationAudioForOutgoingCall: function(outputDeviceId){
        //1000ms is to avoid mixing this sound with "click" sound
        //played when users clicks on a ringdown
        return createNotificationAudioController(AUDIO_CONSTANTS.DIAL_DIRECT_RINGDOWN, outputDeviceId, 1000, 2000);
      },

      getNotificationAudioForInboundCall: function(outputDeviceId){
        return createNotificationAudioController(AUDIO_CONSTANTS.DIAL_DIRECT_RINGDOWN, outputDeviceId, 10, 3000);
      },

      getNotificationAudioForHangup: function(outputDeviceId){
        return createNotificationAudioController(AUDIO_CONSTANTS.HANG_UP_DIRECT_RINGDOWN, outputDeviceId, 0, 0);
      },

      getNotificationAudioForClick: function(outputDeviceId){
        var clickUpElem = getAudioElem(AUDIO_CONSTANTS.CLICK_UP, outputDeviceId);
        clickUpElem.pause();
        return getAudioElem(AUDIO_CONSTANTS.CLICK_DOWN, outputDeviceId);
      },

      getNotificationAudioForClickUp: function(outputDeviceId){
        var clickDownElem = getAudioElem(AUDIO_CONSTANTS.CLICK_DOWN, outputDeviceId);
        clickDownElem.pause();
        return getAudioElem(AUDIO_CONSTANTS.CLICK_UP, outputDeviceId);
      },

      getNotificationAudioForIncomingMsg: function(outputDeviceId){
        return getAudioElem(AUDIO_CONSTANTS.ALERT_NEW_MESSAGE, outputDeviceId);
      },

      dtmf: {
        '1': new Audio(AUDIO_CONSTANTS.DIAL_ONE),
        '2': new Audio(AUDIO_CONSTANTS.DIAL_TWO),
        '3': new Audio(AUDIO_CONSTANTS.DIAL_THREE),
        '4': new Audio(AUDIO_CONSTANTS.DIAL_FOUR),
        '5': new Audio(AUDIO_CONSTANTS.DIAL_FIVE),
        '6': new Audio(AUDIO_CONSTANTS.DIAL_SIX),
        '7': new Audio(AUDIO_CONSTANTS.DIAL_SEVEN),
        '8': new Audio(AUDIO_CONSTANTS.DIAL_EIGHT),
        '9': new Audio(AUDIO_CONSTANTS.DIAL_NINE),
        '0': new Audio(AUDIO_CONSTANTS.DIAL_ZERO),
        '*': new Audio(AUDIO_CONSTANTS.DIAL_STAR),
        '#': new Audio(AUDIO_CONSTANTS.DIAL_DIEZ)
      }

    }; // return.

  }]);
})();

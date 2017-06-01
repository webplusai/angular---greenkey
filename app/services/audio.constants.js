(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .constant('AUDIO_CONSTANTS', {
    INCOMING_MESSAGE: 'assets/sounds/incomingMessage.wav',
    INCOMING_FILE: 'assets/sounds/incomingMessage.wav',
    INCOMING_CALL: 'assets/sounds/us-ring.mp3',
    INCOMING_CALL_DIRECT_RINGDOWN: 'assets/sounds/incomingCallDirectRingdown.wav',
    OUTGOING_CALL: 'assets/sounds/us-ring.mp3',

    DIAL_ZERO: 'assets/sounds/zero_0.wav',
    DIAL_ONE: 'assets/sounds/one_1.wav',
    DIAL_TWO: 'assets/sounds/two_2.wav',
    DIAL_THREE: 'assets/sounds/three_3.wav',
    DIAL_FOUR: 'assets/sounds/four_4.wav',
    DIAL_FIVE: 'assets/sounds/five_5.wav',
    DIAL_SIX: 'assets/sounds/six_6.wav',
    DIAL_SEVEN: 'assets/sounds/seven_7.wav',
    DIAL_EIGHT: 'assets/sounds/eight_8.wav',
    DIAL_NINE: 'assets/sounds/nine_9.wav',
    DIAL_DIEZ: 'assets/sounds/diez.wav',
    DIAL_STAR: 'assets/sounds/star.wav',
    
    BUSY: 'assets/sounds/busy.wav',
    DIAL: 'assets/sounds/dialStandardCalls.wav',
    DIAL_DIRECT_RINGDOWN: 'assets/sounds/dialDirectRingdown.wav',
    HANG_UP: 'assets/sounds/hangup.wav',
    HANG_UP_DIRECT_RINGDOWN: 'assets/sounds/hangupDirectRingdown.wav',
    HANG_UP_DIRECT_HOOT: 'assets/sounds/hangupDirectHoot.wav',

    CALL_SECURITY_ON: 'assets/sounds/zrtpSecure.wav',
    CALL_SECURITY_ERROR: 'assets/sounds/zrtpAlert.wav',

    WEBCAM_SNAPSHOT: 'assets/sounds/webcamSnapshot.wav',

    TEST_SOUND: 'assets/sounds/testSound.wav',
    CLICK_DOWN: 'assets/sounds/ClickDown.wav',
    CLICK_UP: 'assets/sounds/ClickUp.wav',

    ALERT_NEW_MESSAGE: 'assets/sounds/chat/new-message.wav'
  });

})();
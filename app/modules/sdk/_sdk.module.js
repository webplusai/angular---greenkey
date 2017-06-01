(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk', [])

  .config(function(GKTProvider, CallManagerProvider, TVCProvider, SipManagerProvider, AudioDevicesProvider) {

    var gkt = new GKTService();
    var gktCallManager = gkt.getCallManager();
    var gktTVC = gkt.getTVC();
    var gktSipManager = gkt.getSipManager();
    var audioDevices = gkt.getAudioDevices();

    GKTProvider.init(gkt);
    CallManagerProvider.init(gktCallManager);
    TVCProvider.init(gktTVC);
    SipManagerProvider.init(gktSipManager);
    AudioDevicesProvider.init(audioDevices);

    // Exposing globals to debugging purpose:
    window.GKTDebug = {
      gkt: gkt,
      CallManager: gktCallManager,
      TVC: gktTVC,
      GktSipManager: gktSipManager,
      AudioDevices: audioDevices
    };
  });
})();

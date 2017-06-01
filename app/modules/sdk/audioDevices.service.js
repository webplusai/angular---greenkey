(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk').provider("AudioDevices", function() {

    var audioDevices = null;

    this.init = function (audioDevicesInstance) {
      audioDevices = audioDevicesInstance;
    };

    this.$get = ["GKT", "VolumeMeterService", function (GKT, VolumeMeterService) {

      function initVolumeMeter(audioDeviceProfiles){
        _.forEach(audioDeviceProfiles, function(audioDeviceProfile){
          var inputDeviceId = audioDeviceProfile.getInputDeviceId();
          if(inputDeviceId){
            VolumeMeterService.init(inputDeviceId);
          }
        });
      }

      GKT.addConfiguredListener(function(){
        initVolumeMeter(audioDevices.getConfiguredAudioDeviceProfiles());
      });

      function setAudioDeviceConfiguration(audioDeviceProfiles, notificationDevice, aecDevice){
        audioDevices.setAudioDeviceConfiguration(audioDeviceProfiles, notificationDevice, aecDevice);
        initVolumeMeter(audioDeviceProfiles);
      }

      function isHootAudioDeviceProfileSet(connection){
        var audioDeviceProfile = connection && connection.getAudioDeviceProfile && connection.getAudioDeviceProfile();
        return audioDeviceProfile && audioDeviceProfile.getId() === HootConnection.getDefaultAudioDeviceProfileId();
      }

      function switchAudioDeviceProfile(connection) {
        if (connection.type === GKTConstants.CONTACT_TYPE.blastGroup) {
          /* Audio device can't be set for blast group */
          return;
        }
        var audioDeviceProfileId = isHootAudioDeviceProfileSet(connection) ?
          RingdownConnection.getDefaultAudioDeviceProfileId() :
          HootConnection.getDefaultAudioDeviceProfileId();
        audioDevices.setAudioDeviceProfile(connection, audioDevices.getAudioDeviceProfileById(audioDeviceProfileId));
      }

      function getHootAudioDeviceProfile(){
        return audioDevices.getAudioDeviceProfileById(HootConnection.getDefaultAudioDeviceProfileId());
      }

      function getRingdownAudioDeviceProfile(){
        return audioDevices.getAudioDeviceProfileById(RingdownConnection.getDefaultAudioDeviceProfileId());
      }

      return {
        setAudioDeviceConfiguration: setAudioDeviceConfiguration,
        getHootAudioDeviceProfile: getHootAudioDeviceProfile,
        getRingdownAudioDeviceProfile: getRingdownAudioDeviceProfile,
        getAECDevice: audioDevices.getAECDevice.bind(audioDevices),
        getNotificationDevice: audioDevices.getNotificationDevice.bind(audioDevices),
        isHootAudioDeviceProfileSet: isHootAudioDeviceProfileSet,
        switchAudioDeviceProfile: switchAudioDeviceProfile
      }
    }];
  });
})();

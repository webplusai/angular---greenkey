function AudioDeviceProfile(id, outputDevice, inputDevice) {
  'use strict';

  outputDevice = outputDevice || {};
  inputDevice = inputDevice || {};

  this.getId = function () {
    return id;
  };

  this.getOutputDeviceId = function () {
    return outputDevice.deviceId;
  };

  this.getOutputDevice = function () {
    return outputDevice;
  };

  this.getInputDeviceId = function () {
    return inputDevice.deviceId;
  };

  this.getInputDevice = function () {
    return inputDevice;
  };

  this.switchDevices = function (outputDevice, inputDevice) {
    return new AudioDeviceProfile(id, outputDevice, inputDevice);
  };
}


function AudioDeviceService() {
  'use strict';

  var CONFIG_KEY = "gkt.audioDevices";
  var AUDIO_DEVICE_PROFILE_KEY = 'audioDeviceProfiles';
  var AEC_DEVICE_KEY = "aecDevice";
  var NOTIFICATION_DEVICE_KEY = "notificationsDevice";
  var AUDIO_DEVICE_PROFILE_FOR_CONNECTION_KEY = "gkt.audioDeviceProfileForConnection";

  var audioDeviceProfileById = {};
  var connectionAudioDeviceProfileByConnectionId = {};
  var notificationDevice = null;
  var aecDevice = null;
  var gktConfig = null;
  var callManager = null;
  var self = this;

  function getCorrectValue(audioDevice) {
    return audioDevice && audioDevice.deviceId ? audioDevice : {};
  }

  this.init = function (gktConfigService, callManagerService, userName, appStorage) {
    gktConfig = gktConfigService;
    callManager = callManagerService;
    var config = gktConfig.getProperty(CONFIG_KEY, {});
    var audioDeviceProfiles = config[AUDIO_DEVICE_PROFILE_KEY];

    /* Settings possible stored in app storage, temporary code */
    if (!audioDeviceProfiles) {
      config = migrateSettingsFromAppStorageToGKTConfig(userName, appStorage, config);
      audioDeviceProfiles = config ? config[AUDIO_DEVICE_PROFILE_KEY] : null;
    }

    if (audioDeviceProfiles) {
      _.forEach(audioDeviceProfiles, function (audioDeviceProfile, id) {
        if (id && audioDeviceProfile) {
          audioDeviceProfileById[id] = new AudioDeviceProfile(id, getCorrectValue(audioDeviceProfile.outputDevice),
            getCorrectValue(audioDeviceProfile.inputDevice));
        }
      });
    }

    aecDevice = getCorrectValue(config[AEC_DEVICE_KEY]);
    notificationDevice = getCorrectValue(config[NOTIFICATION_DEVICE_KEY]);

    if (!aecDevice.deviceId) {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
          .then(function (deviceInfos) {
            _.forEach(deviceInfos, function (deviceInfo) {
              if (deviceInfo.kind === "audiooutput" && deviceInfo.deviceId === 'default') {
                AudioController.prototype.setAECDevice(deviceInfo.deviceId);
                return false;
              }
            })
          })
      }
    } else {
      AudioController.prototype.setAECDevice(aecDevice.deviceId);
    }

    connectionAudioDeviceProfileByConnectionId = gktConfig.getProperty(AUDIO_DEVICE_PROFILE_FOR_CONNECTION_KEY, {});
    callManager.getAllConnections().then(checkRemovedConnections);
    callManager.addOnRemoveConnectionListener(onConnectionRemoved);
  };

  this.setAudioDeviceConfiguration = function (audioDeviceProfiles, newNotificationDevice, newAECDevice) {
    var config = {};
    var audioDeviceProfilesConfig = {};
    if (audioDeviceProfiles) {
      _.forEach(audioDeviceProfiles, function (newAudioDeviceProfile) {
        var oldAudioDeviceProfile = self.getAudioDeviceProfileById(newAudioDeviceProfile.getId());
        if (oldAudioDeviceProfile) {
          var outputDevice = newAudioDeviceProfile.getOutputDevice() || oldAudioDeviceProfile.getOutputDevice();
          var inputDevice = newAudioDeviceProfile.getInputDevice() || oldAudioDeviceProfile.getInputDevice();
          newAudioDeviceProfile = newAudioDeviceProfile.switchDevices(getCorrectValue(outputDevice), getCorrectValue(inputDevice));
        }
        audioDeviceProfileById[newAudioDeviceProfile.getId()] = newAudioDeviceProfile;

        var connections = callManager.getCurrentConnections();
        if (connections) {
          _.forEach(connections, function (connection) {
            connection.updateAudioDeviceProfile(newAudioDeviceProfile);
          })
        }
      });
    }

    _.forEach(audioDeviceProfileById, function (audioDeviceProfile) {
      audioDeviceProfilesConfig[audioDeviceProfile.getId()] = {
        outputDevice: audioDeviceProfile.getOutputDevice(),
        inputDevice: audioDeviceProfile.getInputDevice()
      };
    });
    config[AUDIO_DEVICE_PROFILE_KEY] = audioDeviceProfilesConfig;

    newNotificationDevice = getCorrectValue(newNotificationDevice);
    if (newNotificationDevice.deviceId) {
      config[NOTIFICATION_DEVICE_KEY] = newNotificationDevice;
      notificationDevice = newNotificationDevice;
    }
    newAECDevice = getCorrectValue(newAECDevice);
    if (newAECDevice.deviceId) {
      config[AEC_DEVICE_KEY] = newAECDevice;
      aecDevice = newAECDevice;
      AudioController.prototype.setAECDevice(aecDevice.deviceId);
    }

    gktConfig.setProperty(CONFIG_KEY, config);

  };

  this.getConfiguredAudioDeviceProfiles = function () {
    return _.values(audioDeviceProfileById);
  };

  this.getAudioDeviceProfileById = function (id) {
    var audioDeviceProfile = audioDeviceProfileById[id];
    if (!audioDeviceProfile && id) {
      audioDeviceProfile = new AudioDeviceProfile(id, {}, {});
      /* Reduce objects number */
      audioDeviceProfileById[id] = audioDeviceProfile;
    }
    return audioDeviceProfile;
  };

  this.getAECDevice = function () {
    return aecDevice;
  };

  this.getNotificationDevice = function () {
    return notificationDevice
  };

  this.getAudioDeviceProfile = function (connection, defaultProfileId) {
    var audioDeviceProfile = connectionAudioDeviceProfileByConnectionId[connection.uid];
    var audioDeviceProfileId = audioDeviceProfile && audioDeviceProfile.type === connection.type ? audioDeviceProfile.id : defaultProfileId;
    return this.getAudioDeviceProfileById(audioDeviceProfileId);
  };

  this.setAudioDeviceProfile = function (connection, audioDeviceProfile) {
    connectionAudioDeviceProfileByConnectionId[connection.uid] = {
      id: audioDeviceProfile.getId(),
      type: connection.type
    };
    connection.setAudioDeviceProfile(audioDeviceProfile);
    gktConfig.setProperty(AUDIO_DEVICE_PROFILE_FOR_CONNECTION_KEY, connectionAudioDeviceProfileByConnectionId);
  };

  function onConnectionRemoved(connection) {
    delete connectionAudioDeviceProfileByConnectionId[connection.uid];
    gktConfig.setProperty(AUDIO_DEVICE_PROFILE_FOR_CONNECTION_KEY, connectionAudioDeviceProfileByConnectionId);
  }

  function checkRemovedConnections(connections) {
    var connectionById = {};
    var changed = false;
    _.forEach(connections, function (connection) {
      connectionById[connection.uid] = connection;
    });

    for (var connectionId in connectionAudioDeviceProfileByConnectionId) {
      var connection = connectionById[connectionId];
      var audioDeviceProfile = connectionAudioDeviceProfileByConnectionId[connectionId];
      if (!connection || !audioDeviceProfile && !(connection.type !== audioDeviceProfile.type)) {
        delete connectionAudioDeviceProfileByConnectionId[connectionId];
        changed = true;
      }
    }

    if (changed) {
      gktConfig.setProperty(AUDIO_DEVICE_PROFILE_FOR_CONNECTION_KEY, connectionAudioDeviceProfileByConnectionId);
    }
  }


  /* Temporary code */
  function migrateSettingsFromAppStorageToGKTConfig(userName, appStorage) {
    var config = {};
    var oldConfig = appStorage[CONFIG_KEY];
    userName = (":" + userName).toLowerCase();
    var userConfig = oldConfig ? oldConfig[userName] : null;
    if (userConfig && userConfig[AUDIO_DEVICE_PROFILE_KEY]) {
      config = userConfig;
      gktConfig.setProperty(CONFIG_KEY, config);
      delete oldConfig[userName];
    }
    return config;
  }
}
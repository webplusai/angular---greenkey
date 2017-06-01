(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .service('AudioDeviceModalService', function($rootScope, ngDialog, AudioDevices, commonConstants) {

    var _errorCallback = function(scope, error) {
      console.error('navigator.getUserMedia error: ', error);
      scope.experimentalFeaturesDisabled = true;
    };

    function getSelectedNotificationDeviceId(){
      var notificationDevice = AudioDevices.getNotificationDevice();
      return notificationDevice ? notificationDevice.deviceId : null;
    }

    function getSelectedAECDeviceId(){
      var aecDevice = AudioDevices.getAECDevice();
      return aecDevice ? aecDevice.deviceId : null;
    }

    var _gotDevices = function(scope, deviceInfos) {
      scope.$apply(function() {
        var filteredOutputDevices = _.filter(deviceInfos, function(dev) {
          return dev.kind === 'audiooutput' && dev.deviceId !== 'default' && dev.deviceId !== 'communications';
        });
        var filteredInputDevices = _.filter(deviceInfos, function(dev) {
          return dev.kind === 'audioinput' && dev.deviceId !== 'default' && dev.deviceId !== 'communications';
        });

        var outputDevices = _.map(filteredOutputDevices, function(info) {
          return _.pick(info, 'deviceId', 'label');
        });
        var inputDevices = _.map(filteredInputDevices, function(info) {
          return _.pick(info, 'deviceId', 'label');
        });

        // Setting outputs
        scope.ringdowns.outputs = scope.hoots.outputs = scope.notifications.outputs = scope.aec.outputs = outputDevices;

        // Setting inputs
        scope.ringdowns.inputs = scope.hoots.inputs = inputDevices;

        scope.hoots.outputChosen = _.find(outputDevices, { deviceId: AudioDevices.getHootAudioDeviceProfile().getOutputDeviceId() }) || { deviceId: null };
        scope.hoots.inputChosen = _.find(inputDevices, { deviceId: AudioDevices.getHootAudioDeviceProfile().getInputDeviceId() }) || { deviceId: null };
        scope.ringdowns.outputChosen = _.find(outputDevices, { deviceId: AudioDevices.getRingdownAudioDeviceProfile().getOutputDeviceId() }) || { deviceId: null };
        scope.ringdowns.inputChosen = _.find(inputDevices, { deviceId: AudioDevices.getRingdownAudioDeviceProfile().getInputDeviceId() }) || { deviceId: null };
        scope.notifications.outputChosen = _.find(outputDevices, { deviceId: getSelectedNotificationDeviceId() }) || { deviceId: null };
        scope.aec.outputChosen = _.find(outputDevices, { deviceId: getSelectedAECDeviceId() }) || { deviceId: null };
      });
    };

    // Please keep the array declaration for ngDialog controllers (minification issues).
    var _controller = ['$scope', function($scope) {
      $scope.experimentalFeaturesDisabled = !navigator.mediaDevices.enumerateDevices;

      if ($scope.experimentalFeaturesDisabled) {
        return;
      }

      $scope.hoots = {
        outputs: [],
        inputs: [],
        outputChosen: null,
        inputChosen: null
      };
      $scope.ringdowns = {
        outputs: [],
        inputs: [],
        outputChosen: null,
        inputChosen: null
      };
      $scope.notifications = {
        outputs: [],
        outputChosen: null
      };
      $scope.aec = {
        outputs: [],
        outputChosen: null
      };

      $scope.saveChanges = function () {
        var hootAudioDeviceProfile = AudioDevices.getHootAudioDeviceProfile();
        hootAudioDeviceProfile =  hootAudioDeviceProfile.switchDevices($scope.hoots.outputChosen, $scope.hoots.inputChosen);
        var ringdownAudioDeviceProfile = AudioDevices.getRingdownAudioDeviceProfile();
        ringdownAudioDeviceProfile = ringdownAudioDeviceProfile.switchDevices($scope.ringdowns.outputChosen, $scope.ringdowns.inputChosen);
        AudioDevices.setAudioDeviceConfiguration([hootAudioDeviceProfile, ringdownAudioDeviceProfile],
          $scope.notifications.outputChosen, $scope.aec.outputChosen);
        $scope.closeThisDialog();
      };

      navigator.mediaDevices.enumerateDevices()
        .then(_gotDevices.bind(this, $scope))
        .catch(_errorCallback.bind(this, $scope));
    }];

    var _open = function() {
      return ngDialog.open({
        className: 'modal-window-wrapper',
        closeByEscape: true,
        closeByNavigation: false,
        closeByDocument: false,
        template: '/partials/audio/audioDeviceModalService.html',
        controller: _controller
      });
    };

    return {
      open: _open
    };

  });
})();
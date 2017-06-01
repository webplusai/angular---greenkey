(function() {
  'use strict';

  angular.module('gkt.voiceBox.login')
    .controller('VoiceAuthController', voiceAuthController);

  function voiceAuthController($scope, authService, $location,
                               $window, $localStorage, GKT, tvbUIState,
                               commonConstants, $http, usSpinnerService) {

    $scope.stage = 'initial';
    $scope.failed = false;
    $scope.error = '';
    var audioRecording;

    // todo for volume meter
    // $scope._isVolumeMuted = function() {
    //   return $scope.stage !== 'recording';
    // };

    function setStage(stage) {
      $scope.stage = stage;
    }

    function isStage(stage) {
      return stage === $scope.stage;
    }

    function showError(text) {
      $scope.failed = true;
      $scope.error = text;
    }

    $scope.record = function() {
      if(!isStage('initial'))
        return;

      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
      if(!_.isFunction(navigator.getUserMedia)) {
        showError('Sorry, your browser does not support audio recording.');
        return;
      }

      setStage('recording');

      navigator.getUserMedia({audio: true, video: false},
        function(stream) {
          audioRecording = new RecordRTC(stream, {
            type: 'audio'
          });
          console.warn(audioRecording);
          console.warn(stream);
          audioRecording.startRecording();
        }, function() {
          showError('GKT was not able to get audio stream.');
        });
    };

    $scope.stop = function() {
      if(!isStage('recording'))
        return;

      usSpinnerService.spin('spinner-1');
      setStage('saving');
      audioRecording.stopRecording(function() {
        $scope.$apply(function() {
          usSpinnerService.stop('spinner-1');
          setStage('recorded');
        });
      });
    };

    $scope.reset = function() {
      if(!isStage('recorded') && !isStage('processed'))
        return;

      $scope.failed = false;
      setStage('initial');
    };

    $scope.login = function() {
      if(!isStage('recorded'))
        return;

      setStage('processing');
      usSpinnerService.spin('spinner-1');

      var fileName = Math.round(Math.random() * 99999999) + 99999999;
      var blob = audioRecording.getBlob();
      var formData = new FormData();
      formData.append("filename", fileName + '.wav');
      formData.append("data", blob);

      function callback(response) {
        usSpinnerService.stop('spinner-1');
        setStage('processed');

        if(response.result === "ERROR") {
          showError("Server error occurred.");
          return;
        }

        if(response.result.toLowerCase() ===
          GKT.getUserInfo().userName.toLowerCase()) {
          $location.path('/dashboard');
          return;
        }

        showError("GKT wasn't able to recognize your voice pattern. Please try again.");
      }

      $http.post("https://voiceprint.tradervoicebox.com/tvbweblogin", formData, {
          transformRequest: angular.identity,
          headers: {'Content-Type': undefined}
        })
        .success(callback)
        .error(function() {
          usSpinnerService.stop('spinner-1');
          setStage('processed');
          showError("Server error occurred..");
        });
    };

    $scope.logout = function() {
      authService.logout().then(function() {
        $localStorage[commonConstants.APP.symphonyModeVarName] = tvbUIState.symphonyMode;
        $window.location.reload();
      });
    };

  }
})();

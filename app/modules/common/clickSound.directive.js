(function () {
  'use strict';

  angular.module('gkt.voiceBox.common')
    .directive('clickSound', function (AudioService) {
      return {
        restrict: 'A',
        template: '',
        scope: {
          audioContext: '&'
        },
        link: function (scope, element, attrs) {
          var clicked = false;

          element.on('click', function() {
            var audioContext = {};
            if(attrs.audioContext){
              audioContext = scope.$eval(scope.audioContext());
              if(!audioContext || audioContext.disabled){
                return;
              }
            }

            if (clicked) {
              AudioService.getNotificationAudioForClickUp(audioContext.deviceId).play();
            }
            else {
              AudioService.getNotificationAudioForClick(audioContext.deviceId).play();
            }
            clicked = !clicked;
          });
        }
      };
    });

})();

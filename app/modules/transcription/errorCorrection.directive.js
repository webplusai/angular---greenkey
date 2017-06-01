(function () {
  'use strict';

  angular.module('gkt.voiceBox.ringdowns')
    .directive('errorCorrectionPanel', function () {
      return {
        restrict: 'E',
        scope: {},
        controller: ['$scope', 'ngDialog', errorCorrectionController
        ],
        templateUrl: '/partials/transcription/errorCorrectionPanel.html',
        replace: true
      };
    });

  function errorCorrectionController($scope, ngDialog) {

    $scope.closeThisDialog = ngDialog.close;
    $scope.originalText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras in justo egestas, blandit velit tristique, pulvinar felis.";
    $scope.correctedText = $scope.originalText;
    $scope.accuracy = 100;

    var originalWords = $scope.originalText.split(" ");

    $scope.reset = function() {
      $scope.correctedText = $scope.originalText;
      $scope.accuracy = 100;
    };

    $scope.confirm = function() {
      ngDialog.open({
        template: '/partials/common/infoDialog.html',
        data: {
          title: 'Success',
          phrase: 'Corrected text was successfully submitted!'
        }
      }).closePromise.then(function() {
        $scope.closeThisDialog();
      });
    };

    $scope.onChange = function() {
      var newWords = $scope.correctedText.split(" ");
      var correctWords = 0;
      _.each(newWords, function(word, index) {
        if(word === originalWords[index])
          correctWords++;
      });
      $scope.accuracy = Math.round(100 * correctWords / newWords.length);
    };
  }
})();
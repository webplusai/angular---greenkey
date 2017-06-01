(function() {
  'use strict';
  angular.module('gkt.voiceBox.common')

  .directive('languagePicker', function() {
    return {
      restrict: 'E',
      scope: {},
      templateUrl: '/partials/common/languagePicker.html',
      controller: languagePickerController
    };
  });


  function languagePickerController($scope, $translate, $timeout) {
    var langHash = {};
    $scope.langSelected = null;
    $scope.supportedLangs = [
      {
        name: 'ENGLISH_LANG',
        key: 'en-US'
      },
      {
        name: 'SPANISH_LANG',
        key: 'es-419'
      },
      {
        name: 'JAPANESE_LANG',
        key: 'ja'
      },
      {
        name: 'PORTUGUESE_LANG',
        key: 'pt-BR'
      },
      {
        name: 'CHINESE_LANG',
        key: 'zn-ch'
      },
      {
        name: 'KOREAN_LANG',
        key: 'ko'
      }
    ];

    $scope.supportedLangs.forEach(function(lang) {
      langHash[lang.key] = lang;
    });

    $scope.onChangeLang = function(lang) {
      $translate.use(lang.key);
    };

    var setCurrentLang = function() {
      $scope.langSelected = langHash[$translate.use()];
    };

    $timeout(setCurrentLang, 500);
  }

})();

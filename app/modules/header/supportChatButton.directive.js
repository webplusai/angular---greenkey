(function () {
  'use strict';

  angular.module('gkt.voiceBox.header')
    .directive('supportChatButton', function () {
      return {
        restrict: 'E',
        templateUrl: '/partials/header/supportChatButton.html',
        controller: ['$scope', '$window', 'TVC', supportChatButtonController]
      };
    });

  function supportChatButtonController($scope, $window, TVC) {

    var currentUser = {};

    var onEndChat = function () {
      $window.$zopim.livechat.hideAll();
    }

    $scope.startChat = function () {
      $window.$zopim || (function (d, s) {
        var z = $window.$zopim = function (c) {
          z._.push(c)
        }, $ = z.s = d.createElement(s), e = d.getElementsByTagName(s)[0];
        z.set = function (o) {
          z.set._.push(o)
        };
        z._ = [];
        z.set._ = [];
        $.async = !0;
        $.setAttribute('charset', 'utf-8');
        $.src = '//v2.zopim.com/?3v1xJT232T2KyHdKudU3GptOjhe6YTjB';
        z.t = +new Date;
        $.type = 'text/javascript';
        e.parentNode.insertBefore($, e)
      })(document, 'script');

      $window.$zopim(function () {
        $window.$zopim.livechat.window.show();
        $window.$zopim.livechat.setName(
          currentUser.firstName + " " + currentUser.lastName +
          " (" + currentUser.company + ")");
        $window.$zopim.livechat.setPhone(currentUser.phone);
        $window.$zopim.livechat.setEmail(currentUser.email);
        $window.$zopim.livechat.setOnChatEnd(onEndChat);
        $window.$zopim.livechat.window.onHide($window.$zopim.livechat.hideAll);
      });
    };

    TVC.getProfile().then(function (userData) {
      currentUser.firstName = userData.first_name;
      currentUser.lastName = userData.last_name;
      currentUser.company = userData.company_name;
      currentUser.email = userData.email;
      currentUser.phone = userData.phone_internal;
    });
  }

})();

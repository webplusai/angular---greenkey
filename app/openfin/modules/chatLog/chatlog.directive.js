(function() {
  'use strict';
  angular.module('openFinIntegration')
  .directive('chatLogPanel', function() {
    return {
      restrict: 'AE',
      scope: {},
      // replace: true,
      controller: chatLogController,
      templateUrl: '/openfin/modules/chatLog/chatLogModal.html'
      // template: '/partials/chatLog/chatLogModal.html'
    };
  });


  function chatLogController($scope, $timeout) {
    'ngInject';

    var intervalId = null;
    var INTERVAL_TO_FETCH = 15000;
    var userInfo = {
      userName: '',
      userId: ''
    };
    $scope.chats = [];
    $scope.isLoading = true;

    $scope.refresh = function() {
      clearInterval(intervalId);
      getLogPeriodically();
    };

    function filterChatsByUser(data) {
      var userName = userInfo.userName;
      var userId = userInfo.userId;

      return _.filter(data.conversations || data.search, function(log) {
        log.participants = _.map(log.to, 'userName').join(' - ');

        if (log.userInfo && log.userInfo.gktUserId) {
          return (log.userInfo.gktUserId === userId) ? log : false;
        }

        if (log.from.userName === userName || log.participants.match(userName)) {
          return log;
        }

        return false;
      });
    }

    function fetchChatLog() {
      $scope.isLoading = true;
      fin.desktop.InterApplicationBus.publish('fetchChatLog', 'get');
    }

    function getLogPeriodically() {
      fetchChatLog();

      intervalId = setInterval(function() {
        fetchChatLog();
      }, INTERVAL_TO_FETCH);
    }

    setTimeout(function() {
      getLogPeriodically();

      fin.desktop.InterApplicationBus.subscribe('*', 'sendUserInfo', function(gktUserInfo) {
        userInfo.userId = gktUserInfo.userId;
        userInfo.userName = gktUserInfo.userName;
      });

      fin.desktop.InterApplicationBus.subscribe('*', 'sendChatLog', function(data) {
        $timeout(function() {
          $scope.chats = filterChatsByUser(data);
          $scope.isLoading = false;
        });
      });

      fin.desktop.InterApplicationBus.publish('getUserInfo', 'get');
    }, 1500);
  }

})();

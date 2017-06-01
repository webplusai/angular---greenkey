(function() {
  'use strict';

  angular.module('gkt.voiceBox.chatLog')
    .controller('ChatLogController', ['$scope', '$timeout', 'ChatLogService', 'GKT', chatLogController]);

  function chatLogController($scope, $timeout, ChatLogService, GKT) {

    var intervalId = null;
    var MAX_PAGE_SIZE = 500;
    var INTERVAL_TO_FETCH = 15000;
    $scope.chats = [];
    $scope.isLoading = true;

    $scope.refresh = function() {
      clearInterval(intervalId);
      getLogPeriodically();
    };

    function filterChatsByUser(data) {
      var userName = GKT.getUserInfo().userName;
      var userId = GKTConfig.getJSON('net.java.sip.communicator.url.WEBSOCKET_HEADERS')['My-User-Uid'];

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

      ChatLogService.fetchChatLog(MAX_PAGE_SIZE)
        .then(function(data) {
          $timeout(function() {
            $scope.chats = filterChatsByUser(data);
            $scope.isLoading = false;
          });
        });
    }

    function getLogPeriodically() {
      fetchChatLog();

      intervalId = setInterval(function() {
        fetchChatLog();
      }, INTERVAL_TO_FETCH);
    }

    $scope.$on('$destroy', function() {
      clearInterval(intervalId);
    });

    getLogPeriodically();
  }

})();

(function() {
  'use strict';
  angular.module('gkt.voiceBox.chatLog')
    .factory('ChatLogService', ['TVC', 'GKT', chatLogService]);

  function chatLogService(TVC, GKT) {

    function fetchChatLog(pageSize) {
      return TVC.getChatMessages(pageSize);
    }

    return {
      fetchChatLog: fetchChatLog
    };
  }
})();

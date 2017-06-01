(function() {
  'use strict';
  angular.module("openFinIntegration")
    .directive('tornChat', function() {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        controller: ['$scope', '$window', 'commonConstants', tornChatCtrl],
        templateUrl: '/openfin/modules/chat/whatsApp/tornChat.tpl.html'
      };
    });

  function tornChatCtrl($scope, $window, commonConstants) {

    $scope.contactName = undefined;
    $scope.avatar = null;
    $scope.messageText = "";
    $scope.messages = [];
    $scope.isGroup = false;
    /**
     * If we can determine qty of new messages, it will be a number,
     * otherwise just boolean true
     * @type {number|boolean}
     */
    $scope.unreadQty = 0;
    $scope.waitingForUpdate = true;
    $scope.initialized = false;
    $scope.chatConstants = commonConstants.GKT.CHAT_NETWORKS;

    function transformMessage(messageFromTvb) {
      return {
        content: messageFromTvb.content,
        from: messageFromTvb.isSentByMe ? 'Me' : messageFromTvb.participant,
        isOutbound: messageFromTvb.isSentByMe,
        date: new Date(messageFromTvb.messageDate),
        type: messageFromTvb.type,
        attachmentCaption: messageFromTvb.attachmentCaption || '',
        decodedUrl: messageFromTvb.decodedUrl || ''
      };
    }

    function scrollToBottom() {
      var messages = $window.document.querySelector(".messages");
      if(messages)
        messages.scrollTop = messages.scrollHeight;
    }

    function updateUnreadQtyInTitle() {
      var title = $window.document.title;
      if(title.startsWith('(')) {
        var splitted = title.split(')');
        splitted.shift();
        title = splitted.join('');
      }

      if($scope.unreadQty === true)
        $window.document.title = "(!) " + title;
      else if($scope.unreadQty > 0)
        $window.document.title = "(" + $scope.unreadQty + ") " + title;
      else
        $window.document.title = title;
    }

    $window.addEventListener('focus', function(e) {
      $scope.$apply(function() {
        $scope.unreadQty = 0;
        updateUnreadQtyInTitle();
      });
    }, false);

    function update(message) {
      $scope.$apply(function() {
        var data = message.data;

        if(message.type === "initial") {
          $scope.waitingForUpdate = false;
          $scope.contactName = data.contactName;
          $scope.avatar = data.avatar;
          $scope.isGroup = data.isGroup;

          $window.document.title = data.chatName + " Chat with " + $scope.contactName;
          _.each(data.messages, function(item) {
            if(item) {
              $scope.messages.push(
                data.msgTransformNeeded ? transformMessage(item) : item);
            }
          });
          $scope.initialized = true;
        }

        if(message.type === "newMessages") {
          _.each(message.data.messages, function(item) {
            if(item)
              $scope.messages.push(transformMessage(item));
          });
          $scope.waitingForUpdate = false;
          $scope.unreadQty = 0;
          updateUnreadQtyInTitle();
        }

        if(message.type === "unreadMessages") {
          $scope.unreadQty = message.data.quantity === null ? 
            true : message.data.quantity;
          if($scope.unreadQty === true || $scope.unreadQty > 0)
            $scope.waitingForUpdate = true;

          updateUnreadQtyInTitle();
        }

        // wait for DOM
        setTimeout(scrollToBottom, 200);
      });

    }

    addTvbMessageListener(update);

    $scope.onKeydown = function(e) {
      if(e.keyCode === 13 && !e.shiftKey) {
        $scope.send();
        e.preventDefault();
      }
    };

    $scope.pin = function() {
      $window.sendMessageToApplication({
        action: "pin",
        data: {
          messages: $scope.messages
        }
      })
    };
    
    $scope.send = function() {
      $window.sendMessageToApplication({
        action: "send",
        text: $scope.messageText
      });
      $scope.messageText = "";
    };

  }
})();
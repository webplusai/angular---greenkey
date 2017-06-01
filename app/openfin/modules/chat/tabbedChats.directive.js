(function () {
  'use strict';
  angular.module("openFinIntegration")
    .directive('tabbedChat', function () {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        controller: ['$scope', '$window', '$timeout', 'commonConstants', tabbedChatCtrl],
        templateUrl: '/openfin/modules/chat/whatsApp/tornChat.tpl.html'
      };
    });

  // TODO same as TornChatCtrl. Apply DRY here
  function tabbedChatCtrl($scope, $window, $timeout, commonConstants) {

    $window.document.title = 'Chats';

    $scope.tabbedView = true;
    $scope.chats = [];
    var chatsByUid = {};
    /**
     * Storage for text input state of different tabs
     * uid => input
     */
    var inputStates = {};

    $scope.contactName = undefined;
    $scope.avatar = null;
    $scope.isGroup = false;
    $scope.messageText = "";
    $scope.messages = [];
    $scope.activeUid = null;
    $scope.initialized = false;
    /**
     * If we can determine qty of new messages, it will be a number,
     * otherwise just boolean true
     * @type {number|boolean}
     */
    $scope.unreadQty = 0;
    $scope.waitingForUpdate = true;
    $scope.chatConstants = commonConstants.GKT.CHAT_NETWORKS;

    function removeChat(uid, needSwitching) {
      var chat = chatsByUid[uid];
      if(!chat)
        return;

      delete chatsByUid[uid];
      var index = $scope.chats.indexOf(chat);
      if (index === -1) return;

      $scope.chats.splice(index, 1);

      // make another chat active or close the window
      if (needSwitching && $scope.chats.length > 0) {
        $scope.switchChat($scope.chats[0]);
      }
    }

    $scope.unpin = function () {
      var activeUid = $scope.activeUid;
      var chat = chatsByUid[activeUid];
      if(!chat)
        return;

      removeChat(activeUid, true);

      $window.sendMessageToApplication({
        action: "unpin",
        uid: activeUid,
        contactName: chat.contactName,
        avatar: chat.avatar,
        isGroup: chat.isGroup,
        chatNetworkId: chat.chatNetworkId,
        messages: chat.messages
      });
    };

    $scope.switchChat = function (chatData) {
      if ($scope.activeUid === chatData.uid) {
        return;
      }

      // update input state
      inputStates[$scope.activeUid] = $scope.messageText;
      $scope.messageText = inputStates.hasOwnProperty(chatData.uid) ?
        inputStates[chatData.uid] : '';

      $scope.contactName = chatData.contactName;
      $scope.avatar = chatData.avatar;
      $scope.isGroup = chatData.isGroup;
      $scope.messages = chatData.messages;
      $scope.activeUid = chatData.uid;
      $scope.unreadQty = chatData.unreadQty = 0;
      $scope.waitingForUpdate = false;
      updateUnreadQtyInTitle();

      $window.sendMessageToApplication({
        action: "switch",
        uid: $scope.activeUid
      });

      setTimeout(scrollToBottom, 200);
    };

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
      if (messages)
        messages.scrollTop = messages.scrollHeight;
    }

    function updateUnreadQtyInTitle() {
      var title = $window.document.title;
      if (title.startsWith('(')) {
        var splitted = title.split(')');
        splitted.shift();
        title = splitted.join('');
      }

      if ($scope.unreadQty === true)
        $window.document.title = "(!) " + title;
      else if ($scope.unreadQty > 0)
        $window.document.title = "(" + $scope.unreadQty + ") " + title;
      else
        $window.document.title = title;
    }

    $window.addEventListener('focus', function (e) {
      $scope.$apply(function () {
        $scope.unreadQty = 0;
        $scope.waitingForUpdate = false;
        updateUnreadQtyInTitle();
      });
    }, false);

    function _markUnreadMsg(chat) {
      if ($scope.activeUid === chat.uid) {
        return;
      }

      chat.unread = true;
      $timeout(function() {
        chat.unread = false;
      }, 6000);
    }

    function update(message) {
      $scope.$apply(function () {
        var data = message.data;

        if (message.type === "newChat") {
          if(data.msgTransformNeeded) {
            data.messages = _.map(_.filter(data.messages, function(msg) {
              return Boolean(msg)
            }), transformMessage)
          }

          data.unreadQty = 0;
          $scope.chats.push(data);
          chatsByUid[data.uid] = data;

          // new chat becomes active one
          $scope.switchChat(data);
          $scope.waitingForUpdate = false;

          $scope.initialized = true;
        }

        if (message.type === "newMessages") {
          var chat = chatsByUid[message.uid];
          if (!chat) return;

          _.each(_.filter(data.messages, function(msg) {
            return Boolean(msg)
          }), function(item) {
            if (item)
              chat.messages.push(transformMessage(item));
          });
          $scope.waitingForUpdate = false;
          chat.unreadQty = $scope.unreadQty = 0;
          updateUnreadQtyInTitle();

          if (message.data.messages && message.data.messages.length === 1) {
            if (!message.data.messages[0].isSentByMe) {
              _markUnreadMsg(chat);
            }
          }
        }

        if (message.type === "unreadMessages") {
          var chat = chatsByUid[message.uid];
          if (!chat) return;

          chat.unreadQty = data.quantity === null ?
            true : data.quantity;

          if (chat.uid === $scope.activeUid) {
            $scope.unreadQty = chat.unreadQty;
            if ($scope.unreadQty === true || $scope.unreadQty > 0)
              $scope.waitingForUpdate = true;
          }
          updateUnreadQtyInTitle();
          _markUnreadMsg(chat);
        }

        if(message.type === 'makeTabActive') {
          var chatData = chatsByUid[message.uid];
          $scope.switchChat(chatData);
        }

        if(message.type === 'closeChats') {
          var i = 0;
          var qty = data.uids.length;
          _.each(data.uids, function(uid) {
            removeChat(uid, ++i === qty)
          });
        }

        // wait for DOM
        setTimeout(scrollToBottom, 200);
      });

    }

    addTvbMessageListener(update);

    $scope.onKeydown = function (e) {
      if (e.keyCode === 13 && !e.shiftKey) {
        $scope.send();
        e.preventDefault();
      }
    };

    $scope.send = function () {
      $window.sendMessageToApplication({
        action: "send",
        uid: $scope.activeUid,
        text: $scope.messageText
      });
      $scope.messageText = "";
    };

    $scope.closeChat = function(uid) {
      var chat = chatsByUid[uid];
      if (!chat) { return; }

      $window.sendMessageToApplication({
        action: "close-tabbed-chat",
        uid: uid,
        chatNetworkId: chat.chatNetworkId
      });

      removeChat(uid, $scope.activeUid === uid);
    };

  }
})();
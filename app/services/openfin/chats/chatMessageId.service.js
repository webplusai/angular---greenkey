(function () {
  'use strict';

  angular.module('gkt.voiceBox.openFin').service('ChatMessageIdService', ChatMessageIdService);

  function ChatMessageIdService() {
    function ChatMessageId() {
      this.reset();
    }

    ChatMessageId.prototype.reset = function () {
      this.localIndexes = {};
      this.lastDate = null;
      this.lastLocalIndex = 0;
      this.previousMessageFirst = null;
      this.previousMessageSecond = null;
    };

    ChatMessageId.prototype._update = function (date) {
      if (!this.lastDate && date) {
        this.lastDate = date;
      } else if (date && date.toISOString() !== this.lastDate.toISOString()) {
        this.reset();
        this.lastDate = date;
      } else {
        this.lastLocalIndex++;
      }
    };

    ChatMessageId.prototype.getNext = function (fromUser, toUser, date, text) {
      this._update(date);

      var hash = md5(fromUser + toUser + this.lastDate.toISOString() + text +
        this.previousMessageFirst + this.previousMessageSecond);

      if (!this.localIndexes[hash] || this.lastLocalIndex > this.localIndexes[hash]) {
        this.localIndexes[hash] = this.lastLocalIndex;
      }

      var id = md5(hash + this.localIndexes[hash]);
      this.previousMessageFirst = this.previousMessageSecond;
      this.previousMessageSecond = id;

      return id;
    };

    ChatMessageId.prototype.getLastDate = function () {
      return this.lastDate;
    };

    return ChatMessageId;
  }
})();
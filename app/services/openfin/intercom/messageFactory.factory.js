(function() {
  'use strict';

  angular.module('gkt.voiceBox.openFin.intercom')
    .service('OpenfinMessage', OpenfinMessageFactory);

  function OpenfinMessageFactory() {

    function Message(action, uid, data) {
      this.uid = uid;
      this.action = action;
      this.data = data;
    }

    Message.ACTIONS = {
      TO_FIN: {
        init: 'init',
        update: 'update',
        contactAdded: 'contactAdded',
        contactRemoved: 'contactRemoved',
        contactsReordered: 'contactsReordered'
      }, 
      FROM_FIN: {
        close: 'close',
        controlSignal: 'controlSignal',
        confirmInit: 'confirmInit'
      }
    };

    Message.create = function(action, uid) {
      return new Message(action, uid, {});
    };

    Message.createAnonymous = function(action) {
      return new Message(action, null, {});
    };

    Message.prototype.withData = function(data) {
      this.data = data;
      return this;
    };

    Message.prototype.withSignal = function(signal) {
      this.data = {
        signal: signal
      };
      return this;
    };

    Message.prototype.withProperty = function(name, value) {
      this.data = {
        property: name,
        value: value
      };
      return this;
    };

    return Message;
  }
})();

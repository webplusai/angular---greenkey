(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')
    .factory('ChatConfigService', ['commonConstants', ChatConfigService]);

  function ChatConfigService(constants) {

    var BLACK_LIST_PROPS = {};
    BLACK_LIST_PROPS[constants.GKT.CHAT_NETWORKS.wechat] =
      "tvb.web.chats.logging.do.not.log.weChat";
    BLACK_LIST_PROPS[constants.GKT.CHAT_NETWORKS.whatsapp] =
      "tvb.web.chats.logging.do.not.log.whatsApp";
    BLACK_LIST_PROPS[constants.GKT.CHAT_NETWORKS.aim] =
      "tvb.web.chats.logging.do.not.log.aim";
    BLACK_LIST_PROPS[constants.GKT.CHAT_NETWORKS.yahoo] =
      "tvb.web.chats.logging.do.not.log.yahoo";

    // not used right now, but may be in future
    var WHITE_LIST_PROPS = {};

    function trimId(id) {
      return id ? id.trim() : '';
    }

    var ID_CONVERTERS = {};
    ID_CONVERTERS[constants.GKT.CHAT_NETWORKS.wechat] = trimId;
    ID_CONVERTERS[constants.GKT.CHAT_NETWORKS.aim] = trimId;
    ID_CONVERTERS[constants.GKT.CHAT_NETWORKS.yahoo] = trimId;
    ID_CONVERTERS[constants.GKT.CHAT_NETWORKS.whatsapp] = function(id) {
      return id.replace(/[^\d]/g, '');
    };


    function getList(prop) {
      if(!prop) return [];

      var list = GKTConfig.getProperty(prop);
      // tmp - remove after switching to real properties
      if(_.isString(list)) {
        try {
          list = JSON.parse(list);
        } catch (e){
          // do nothing
        }
      }

      if(!list || !_.isArray(list) || list.length === 0) return [];

      return list;
    }

    function LoggingManager(chatNetworkName) {
      if(!chatNetworkName) {
        this.whiteList = [];
        this.blackList = [];
        return;
      }

      var idConverter = ID_CONVERTERS[chatNetworkName];
      this.whiteList = _.map(
        getList(WHITE_LIST_PROPS[chatNetworkName]), idConverter);
      this.blackList = _.map(
        getList(BLACK_LIST_PROPS[chatNetworkName]), idConverter);
    }

    LoggingManager.createEmpty = function() {
      return new LoggingManager();
    };

    LoggingManager.prototype.isLoggingAllowed = function(contactId) {
      if(!contactId)
        return false;

      contactId = contactId.trim();
      // let's check for white list first
      if(this.whiteList.length > 0) {
        return _.includes(this.whiteList, contactId);
      }

      // and then for black list
      return !_.includes(this.blackList, contactId);
    };
    
    return {
      createLoggingManager: function(chatNetwork) {
        return new LoggingManager(chatNetwork);
      },

      createEmptyManager: function() {
        return LoggingManager.createEmpty();
      }
    };

  }
})();
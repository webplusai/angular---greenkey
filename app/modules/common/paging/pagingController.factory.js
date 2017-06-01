(function() {
  'use strict';

  angular.module('gkt.voiceBox.common.paging')
    .factory('PaginatorFactory', ['commonConstants', PaginatorFactory]);

  function PaginatorFactory(constants) {

    function ContactsPage(index) {
      this.inboundCallsQty = 0;
      this.outboundCallsQty = 0;
      this.index = index;
    }

    function PaginatorController($scope, $rootScope) {

      this.$scope = $scope;
      this.$rootScope = $rootScope;
      this.pagesByUid = {};

      $scope.active = 0;
      $scope.tabs = [];

      // main goal of the paginator
      $scope.onTabClicked = function(index) {
        $scope.active = index;
        $rootScope.$emit($scope.changeEventName, index);
      };

      // subscribe on connection list changed
      $rootScope.$on($scope.initEventName, function(event, elements) {
        this.resetPages(elements);
      }.bind(this));

      this.resetPages([]);
      this.subscribeOnBlinkingEvents();
      this.customInit();
    }

    PaginatorController.prototype.resetPages = function(elements) {

      this.$scope.size = this.$scope.size > 0 ? this.$scope.size : 1;
      var itemsQty = elements ? elements.length : 0;

      // tabs count
      var tabsNumber = this.$scope.fixedCount && $.isNumeric(this.$scope.fixedCount) ?
        parseInt(this.$scope.fixedCount) :
        Math.ceil(itemsQty / this.$scope.size);

      this.pagesByUid = {};
      this.$scope.tabs = [];
      for (var i = 0; i < tabsNumber; i++) {
        this.$scope.tabs.push(new ContactsPage(i));
      }

      _.each(elements, function(item) {
        this.pagesByUid[item.uid] = item.pageIndex;
        this.checkItemForBlinking(item);
      }.bind(this));
    };

    PaginatorController.prototype._updateCallsQty =
      function(contactUid, isActive, property) {
        var page = this.pagesByUid[contactUid];
        if(page === undefined || page >= this.$scope.tabs.length)
          return;

        this.$scope.tabs[page][property] += isActive ? 1 : -1;
        if(this.$scope.tabs[page].outboundCallsQty < 0)
          this.$scope.tabs[page].outboundCallsQty = 0;
      };

    PaginatorController.prototype.updateOutboundCallsQty =
      function(connection, isActive) {
        this._updateCallsQty(connection.uid, isActive, 'outboundCallsQty');
      };

    PaginatorController.prototype.updateInboundCallsQty =
      function(connection, isActive) {
        this._updateCallsQty(connection.uid, isActive, 'inboundCallsQty');
      };

    PaginatorController.prototype.subscribeOnBlinkingEvents = function() {
      // subscribe on shouts
      // TODO make those event directive's properties
      this.$rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout,
        function(event, connection) {
          this.updateOutboundCallsQty(connection, true);
        }.bind(this));

      this.$rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout_end,
        function(event, connection) {
          this.updateOutboundCallsQty(connection, false);
        }.bind(this));

      this.$rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout,
        function(event, connection) {
          this.updateInboundCallsQty(connection, true);
        }.bind(this));

      this.$rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout_end,
        function(event, connection) {
          this.updateInboundCallsQty(connection, false);
        }.bind(this));

    };


    // abstract methods

    PaginatorController.prototype.checkItemForBlinking = function(item) {
       throw new Error("Not implemented");
    };

    PaginatorController.prototype.customInit = function() {
       throw new Error("Not implemented");
    };

    return PaginatorController;
  }
})();

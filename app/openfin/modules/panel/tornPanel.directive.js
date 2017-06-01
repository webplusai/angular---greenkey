(function() {
  'use strict';
  angular.module("openFinIntegration")
    .directive('tornPanel', function() {
      return {
        restrict: 'E',
        scope: {
          title: '@',
          isHoots: '='
        },
        replace: true,
        controller: ['$scope', '$rootScope', 'ComponentService', 'MessageService',
          'commonConstants', tornPanelController],
        templateUrl: '/openfin/modules/panel/tornPanel.partial.html'
      };
    });

  function tornPanelController($scope, $rootScope, ComponentService, MessageService,
                               commonConstants) {
    var CONNECTIONS_ON_PAGE = 10;
    var connectionsByUid = {};

    $scope.uiConstants = commonConstants.UI;
    $scope.activePageIndex = 0;
    $scope.connections = [];
    $scope.emptyCells = [];

    var MESSAGE_HANDLERS = {};

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.init] = function(message) {
      $scope.connections = message.data.connections;

      _.each($scope.connections, function (connection) {
        connectionsByUid[connection.uid] = connection;
      });

      updatePageIndex();
      fillEmptyCells();

      $rootScope.$emit('connections_fetched', $scope.connections);

      MessageService.sendInitConfirmation(message.data.uid);
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.update] = function(message) {
      var data = message.data;
      var connection = connectionsByUid[message.uid];
      if(!connection) return;

      connection[data.property] = data.value;

      // tabs blinking
      if($scope.isHoots) {
        if(data.property === 'inboundShout') {
          $rootScope.$emit(data.value ?
            commonConstants.GKT.CALL_EVENTS.inbound_shout :
            commonConstants.GKT.CALL_EVENTS.inbound_shout_end,
            connection
          );
        }

        if(data.property === 'shouting') {
          $rootScope.$emit(data.value ?
            commonConstants.GKT.CALL_EVENTS.outbound_shout :
            commonConstants.GKT.CALL_EVENTS.outbound_shout_end,
            connection
          );
        }
      }
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.contactAdded] = function(message) {
      var connection = message.data.connection;

      connectionsByUid[connection.uid] = connection;
      $scope.connections.push(connection);
      updatePageIndex();
      fillEmptyCells();
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.contactRemoved] = function(message) {
      if(!connectionsByUid[message.uid]) return;

      delete connectionsByUid[message.uid];
      var index = _.findIndex($scope.connections, { 'uid': message.uid });
      if(index > -1) {
        $scope.connections.splice(index, 1);
        updatePageIndex();
        fillEmptyCells();
      }
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.contactsReordered] = function (message) {
      $scope.connections = _.sortBy($scope.connections, function (connection) {
        return message.data.indexOf(connection.uid);
      });
      updatePageIndex();
      fillEmptyCells();
    };

    /* Listener to page changes */
    $rootScope.$on('page_changed', function (ev, activeIndex) {
      $scope.activePageIndex = activeIndex;
      fillEmptyCells();
    });

    function updatePageIndex() {
      _.each($scope.connections, function (connection, i) {
        connection.pageIndex = Math.floor(i / CONNECTIONS_ON_PAGE);
      });
    }

    function fillEmptyCells() {
      var visibleItems = _.filter($scope.connections, {pageIndex: $scope.activePageIndex});
      var size = CONNECTIONS_ON_PAGE - visibleItems.length;

      $scope.emptyCells = [];
      for (var i = 0; i < size; i++) {
        $scope.emptyCells.push({
          emptySlot: true
        });
      }
    }

    function update(message) {
      var handler = MESSAGE_HANDLERS[message.action];
      if(!handler) return;

      $scope.$apply(handler.bind(this, message))
    }

    addTvbMessageListener(update);

    $scope.close = function() {
      MessageService.sendCloseAction();
      ComponentService.closeComponent();
    };
  }

})();
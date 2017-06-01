(function () {
  'use strict';

  angular.module('gkt.voiceBox.connection')
    .directive('contactSelectionDialogContent', function () {
      return {
        restrict: 'E',
        replace: true,
        controller: [
          '$scope',
          'CallManager',
          'commonConstants',
          contactSelectionDialogContentController
        ],
        templateUrl: '/partials/connection/connectionSelectionDialogContent.html'
      };
    });

  function contactSelectionDialogContentController($scope, CallManager, commonConstants) {

    var selectedConnectionIds = new Set();
    $scope.connections = [];
    $scope.searchString = '';

    CallManager.getAllConnections().then(function (connections) {
      var connectionById = {};
       _.assign(connectionById, connections.hoots, connections.ringdowns, connections.externals, connections.speedDials);
      $scope.connections = _.filter(connectionById, $scope.ngDialogData.filter);
    });

    $scope.isVisible = function(connection) {
      // only online contacts should be visible - TVBWEB-2462
      if (connection.status !== commonConstants.GKT.PRESENCE.online) {
        return false;
      }
      // hide incorrect records
      if (!connection.contact || !_.isString(connection.contact.display_name)) {
        return false;
      }

      var searchString = $scope.searchString ? $scope.searchString.trim().toLowerCase() : '';
      var contactName = connection.contact.display_name.trim().toLowerCase();
      return searchString.length === 0 || (contactName.indexOf(searchString) > -1);
    };

    $scope.onSelected = function () {
      var connections = getSelectedConnections();
      $scope.closeThisDialog();
      if (connections && connections.length > 0 && $scope.ngDialogData.onSelected)
        $scope.ngDialogData.onSelected(connections);
    };

    $scope.isOnline = function (connection) {
      return connection.status === commonConstants.GKT.PRESENCE.online;
    };

    $scope.selectConnection = function (connection) {
      if (!selectedConnectionIds.has(connection.uid))
        selectedConnectionIds.add(connection.uid);
      else
        selectedConnectionIds.delete(connection.uid);
    };

    $scope.isSelected = function (contact) {
      return selectedConnectionIds.has(contact.uid);
    };

    function getSelectedConnections() {
      return _.filter($scope.connections, function(item) {
        return selectedConnectionIds.has(item.uid);
      });
    }
  }
})();
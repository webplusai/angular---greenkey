(function() {
  'use strict';

  angular.module('gkt.voiceBox.dashboard')

  .directive('pendingConnections', function() {
    return {
      restrict: 'E',
      scope: {
        onChangeEvent: '=',
        compactMode: '@'
      },
      replace: true,
      templateUrl: '/partials/pending-connections.html',
      controller: [
        '$scope',
        '$rootScope',
        '$localStorage',
        '$interval',
        'TVC',
        'commonConstants',
        'GKT',
        'SubtleNotificationService',
        function($scope, $rootScope, $localStorage, $interval, TVC, constants, GKT, SubtleNotificationService) {

        $scope.pendingCons = [];
        $scope.constants = constants;
        $scope.currentUserName = GKT.getUserInfo().displayName;
        var hiddenCons;

        var onChange = function(triggerUpdate) {
          if ($scope.onChangeEvent && angular.isFunction($scope.onChangeEvent)) {
            $scope.onChangeEvent($scope.pendingCons, triggerUpdate);
          }
        };

        var getCurrentHidenConnections = function() {
          var cons = $localStorage.hiddenPendingCons || [];
          var now = new Date();

          // Removing hiden conns older than 24hs.
          cons = _.filter(cons, function(con) {
            return (now - new Date(con.time)) / 36e5 < 24;
          });

          $localStorage.hiddenPendingCons = cons;

          return cons;
        };

        var getContactRequests = function(silent) {
          hiddenCons = getCurrentHidenConnections();
          var hiddenConsIds = _.map(hiddenCons, function(con) { return con.id; });

          TVC.getContactRequests()
            .then(function(data) {
              $scope.pendingCons = _.filter(data.objects, function (obj) {
                return obj.status !== 'Rejected' && !_.includes(hiddenConsIds, obj.id);
              });

              $scope.onChangeEvent($scope.pendingCons, !silent);
            });
        };

        var handleContactAddRequest = function(newReq) {
          var request = _.find($scope.pendingCons, { id: newReq.id });

          if (!request) {
            $scope.pendingCons.push(newReq);
            onChange(true);
          }
        };

        var handleContactDeleteRequest = function(newReq) {
          _.remove($scope.pendingCons, { id: newReq.id });
          onChange(true);
        };

        var init = function() {
          getContactRequests(true);

          TVC.addNewContactRequestListener(handleContactAddRequest);
          TVC.addUpdateContactRequestListener(handleContactDeleteRequest);
          TVC.addDeleteContactRequestListener(handleContactDeleteRequest);
        };

        $scope.acceptPendingConnection = TVC.acceptPendingConnection;

        $scope.rejectPendingConnection = TVC.rejectPendingConnection;

        $scope.cancelPendingConnection = TVC.cancelOutgoingPendingConnection;

        $scope.resendPendingConnection = function(connection) {
          TVC.resendPendingConnection(connection)
            .then(function() {
              SubtleNotificationService.notify('Connection request was successfully sent');
            });
        };

        $scope.hide = function(con, index) {
          $scope.pendingCons.splice(index, 1);
          onChange(true);
          hiddenCons.push({
            id: con.id,
            time: new Date()
          });
          $localStorage.hiddenPendingCons = hiddenCons;
        };

        $scope.$on('destroy', function() {
          TVC.removeNewContactRequestListener(handleContactAddRequest);
          TVC.removeUpdateContactRequestListener(handleContactDeleteRequest);
          TVC.removeDeleteContactRequestListener(handleContactDeleteRequest);
        });

        init();

      }]
    };
  });

})();

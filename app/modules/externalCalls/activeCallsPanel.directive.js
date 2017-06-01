(function() {
  'use strict';

  angular.module('gkt.voiceBox.activeCalls')
    .directive('activeCallsPanel', function() {
    return {
      restrict: 'A',
      scope: {},
      replace: true,
      controller: function($scope, $rootScope, $timeout, tvbUIState, commonConstants, CallManager) {
        $scope.calls = [];
        $scope.selectedCallsCount = 0;
        $scope.uiState = tvbUIState;

        var offActiveCallSelectedFn =
            $rootScope.$on(commonConstants.UI_EVENTS.active_call_selected, function () {
              $scope.selectedCallsCount++;
            });

        var offActiveCallUnselectedFn =
            $rootScope.$on(commonConstants.UI_EVENTS.active_call_unselected, function () {
              if ($scope.selectedCallsCount > 0) {
                $scope.selectedCallsCount--;
              }
            });

        $scope.releaseSelectedCalls = function () {
          $rootScope.$emit(commonConstants.UI_EVENTS.selected_calls_released);
          $scope.selectedCallsCount = 0;
        };

        this.addCall = function(call) {
          if (!_.findWhere($scope.calls, { uid: call.uid }) ) {
            $scope.calls.push(call);
          }
        };

        this.removeCall = function(contact) {
          _.remove($scope.calls, function(arrayElem) {
            return arrayElem.contact.uid === contact.contact.uid;
          });
        };

        this.removeConnection = function(uid) {
          _.remove($scope.calls, function(conn) {
            return conn.uid === uid;
          });
        };

        var that = this;

        CallManager.addOutboundCallListener(function(connection) {
          connection.GKT_isInboundCall = false;
          if(connection.type !== commonConstants.GKT.CONTACT_TYPE.sipTDMRingdown) {
            connection.callStatus = commonConstants.GKT.CALL_STATUS.connecting;
          }
          that.addCall(connection);
          connection.on(commonConstants.GKT.CALL_STATUS.canceled, function() {
            $scope.selectedCallsCount--;
          });
        });

        CallManager.addInboundCallListener(function(connection) {
          if (connection.type === commonConstants.GKT.CONTACT_TYPE.hoot
            || connection.sipTDMConnectionNeeded()) { return; } // temporal fix for inbound_call triggered on Hoot's shout.
          connection.GKT_isInboundCall = true;
          that.addCall(connection);
        });

        CallManager.addOnRemoveConnectionListener(function(connection) {
          that.removeConnection(connection.uid);
        });

        $rootScope.$on(commonConstants.GKT.CALL_EVENTS.hangup_call, function(options, contact) {
          $timeout(function() {
            that.removeCall(contact);
          });
        });

        $scope.$on('$destroy', function () {
          offActiveCallSelectedFn();
          offActiveCallUnselectedFn();
        });

      },
      templateUrl: '/partials/activeCalls/activeCallsPanel.html'
    };
  });

})();

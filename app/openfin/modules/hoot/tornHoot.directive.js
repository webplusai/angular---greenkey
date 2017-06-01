(function() {
  'use strict';
  angular.module("openFinIntegration")
    .directive('tornHoot', function() {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        controller: ['$scope', 'ComponentService', '$timeout',
          'commonConstants', 'MessageService',
          tornHootController],
        templateUrl: '/openfin/modules/hoot/tornHoot.tpl.html'
      };
    });

  function tornHootController($scope, ComponentService, $timeout,
                              constants, MessageService) {

    $scope.initialized = false;
    $scope.inPanel = false;
    $scope.isTornWindow = false;
    $timeout(function() {
      $scope.isTornWindow = ComponentService.isTornWindow();
    }, 200);

    $scope.hoot = {};

    var MESSAGE_HANDLERS = {};

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.init] = function(message) {
      if($scope.initialized)
        return;
        
      $scope.initialized = true;

      _.defaults($scope.hoot, message.data);
      MessageService.sendInitConfirmation(message.data.uid);
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.update] = function(message) {
      var data = message.data;
      $scope.hoot[data.property] = data.value;

      // close notification when counterparty stops to shout
      // see TVBWEB-2888
      // TODO: this condition can be removed when closing notifications from main application becomes available again
      if (data.property === 'inboundShout' && !data.value) {
        ComponentService.closeComponent();
      }
    };

    var update = function(message) {
      var handler = MESSAGE_HANDLERS[message.action];
      if(!handler) return;

      $scope.$apply(handler.bind(this, message))
    };

    addTvbMessageListener(update);

    $scope.close = function() {
      if(ComponentService.isTornWindow()) {
        MessageService.sendCloseAction();
      }
      ComponentService.closeComponent();
    };

    function sendSignalToApplication(signal) {
      MessageService.sendSignalAction($scope.hoot.uid, signal);
    }

    $scope.handleShoutPressed = sendSignalToApplication.bind(
      this, constants.UI_EVENTS.openfin_push_shout_button);
    $scope.handleShoutDepressed = sendSignalToApplication.bind(
      this, constants.UI_EVENTS.openfin_release_shout_button);
  }
})();
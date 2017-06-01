(function () {
  'use strict';
  angular.module("openFinIntegration")
    .directive('tornRingdown', function() {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        controller: ['$scope', 'ComponentService', 'MessageService', 
          tornRingdownController],
        templateUrl: '/openfin/modules/ringdown/tornRingdown.partial.html'
      };
    });

  function tornRingdownController($scope, ComponentService, MessageService) {

    $scope.initialized = false;
    $scope.inPanel = false;
    $scope.ringdown = {};

    var MESSAGE_HANDLERS = {};

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.init] = function(message) {
      if($scope.initialized)
        return;
      
      $scope.initialized = true;
      _.defaults($scope.ringdown, message.data);
      MessageService.sendInitConfirmation(message.data.uid);
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.update] = function(message) {
      var data = message.data;
      $scope.ringdown[data.property] = data.value;
    };
    
    var update = function(message) {
      var handler = MESSAGE_HANDLERS[message.action];
      if(!handler) return;

      $scope.$apply(handler.bind(this, message))
    };

    addTvbMessageListener(update);

    function sendSignalToApplication(signal) {
      MessageService.sendSignalAction($scope.ringdown.uid, signal);
    }

    $scope.close = function() {
      if(ComponentService.isTornWindow()) {
        MessageService.sendCloseAction();
      }
      ComponentService.closeComponent();
    };

    $scope.call = sendSignalToApplication.bind(this, 'call');
  }
})();
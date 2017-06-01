(function() {
  'use strict';
  angular.module("openFinIntegration")

    .directive('tornCall', function() {
      return {
        restrict: 'E',
        scope: {},
        replace: true,
        controller: ['$scope', 'ComponentService', 'MessageService', 
          tornCallController],
        templateUrl: '/openfin/modules/calls/tornCall.tpl.html'
      };
    });

  function tornCallController($scope, ComponentService, MessageService) {

    $scope.initialized = false;
    $scope.poppedOut = false;

    $scope.call = {};

    var MESSAGE_HANDLERS = {};

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.init] = function(message) {
      if($scope.initialized)
        return;

      var data = message.data;

      $scope.initialized = true;
      $scope.poppedOut = data.poppedOut;

      _.defaults($scope.call, message.data);
      MessageService.sendInitConfirmation(message.data.uid);
    };

    MESSAGE_HANDLERS[MessageService.ACTIONS.TO_FIN.update] = function(message) {
      var data = message.data;
      $scope.call[data.property] = data.value;

      // close notification when the call is over
      // see TVBWEB-2888
      // TODO: this condition can be removed when closing notifications from main application becomes available again
      if (data.property === 'inCall' && !data.value) {
        ComponentService.closeComponent();
      }
    };
    
    function update(message) {
      var handler = MESSAGE_HANDLERS[message.action];
      if(!handler) return;

      $scope.$apply(handler.bind(this, message))
    }

    addTvbMessageListener(update);

    function sendSignalToApplication(signal) {
      MessageService.sendSignalAction($scope.call.uid, signal);
    }

    $scope.close = ComponentService.closeComponent;

    $scope.acceptCall = function() {
      sendSignalToApplication('accept');
    };
    $scope.rejectCall = function() {
      sendSignalToApplication('reject');
      ComponentService.closeComponent();
    };
    $scope.toggleMute = sendSignalToApplication.bind(this, 'mute');
    $scope.toggleSilence = sendSignalToApplication.bind(this, 'silence');
    $scope.toggleSelect = sendSignalToApplication.bind(this, 'select');
    $scope.release = sendSignalToApplication.bind(this, 'release');

  }
})();
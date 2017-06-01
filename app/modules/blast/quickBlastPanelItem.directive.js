(function() {
  'use strict';

  angular.module('gkt.voiceBox.blast').directive('quickBlastPanelItem', function() {
    return {
      restrict: 'E',
      require: '^^quickBlastPanel',
      link: function($scope, $element, attributes, parentController) {
        $scope.parentController = parentController;
      },
      scope: {
        hoot: '='
      },
      replace: true,
      controller: [
        '$scope',
        'commonConstants',
        quickBlastPanelItemController
      ],
      controllerAs: 'quickBlastPanelItemCtrl',
      templateUrl: '/partials/blast/quickBlastPanelItem.html'
    };
  });


  function quickBlastPanelItemController($scope, constants) {

    updateHootStatus();
    var unregisterHootStatusListeners = $scope.hoot.onConnectionStatusChange(updateHootStatus);

    function updateHootStatus() {
      $scope.isOnline = $scope.hoot.status === constants.GKT.PRESENCE.online;
    }


    $scope.toggleContact = function() {
      return $scope.parentController.togglePausedStatusOfHoot($scope.hoot.uid);
    };

    $scope.isSelected = function() {
      return !$scope.parentController.isHootPaused($scope.hoot.uid);
    };


    $scope.$on('$destroy', function() {
      _.isFunction(unregisterHootStatusListeners) && unregisterHootStatusListeners();
    });

  }

})();


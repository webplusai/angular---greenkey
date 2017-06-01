(function() {
  'use strict';

  angular.module('gkt.voiceBox.blast').directive('quickBlastPanel', function() {
    return {
      restrict: 'E',
      scope: {},
      replace: true,
      controller: [
        '$scope',
        '$rootScope',
        'ngDialog',
        'commonConstants',
        'Blasts',
        'CallManager',
        quickBlastPanelController
      ],
      controllerAs: 'quickBlastPanelCtrl',
      templateUrl: '/partials/blast/quickBlastPanel.html'
    };
  });


  function quickBlastPanelController($scope, $rootScope, ngDialog, constants, blasts, CallManager) {

    $scope.blastGroup = $scope.$parent.ngDialogData.blastGroup;
    $scope.members = [];


    $scope.closeQuickBlastPanel = function() {
      ngDialog.close();
    };

    $scope.handleShoutPressed = function() {
      sendSignalToBlastButton(constants.UI_SIGNALS.PRESS);
    };

    $scope.handleShoutDepressed = function() {
      sendSignalToBlastButton(constants.UI_SIGNALS.RELEASE);
    };

    function sendSignalToBlastButton(signal) {
      $rootScope.$emit(
        constants.UI_EVENTS.connection_control_signal,
        // connection; in fact only uid is checked
        $scope.blastGroup,
        // where signal was send from
        'QuickBlastPanel',
        // signal
        signal
      );
    }


    CallManager.getHootConnections().then(function(hoots) {
      _.each(hoots, function(hoot, hootUid) {
        $scope.blastGroup.isMember(hootUid) && $scope.members.push(hoot);
      });
    });


    $scope.$on('$destroy', function() {
      blasts.save();
    });


    this.isHootPaused = function(hootUid) {
      return $scope.blastGroup.isPaused(hootUid);
    };

    this.togglePausedStatusOfHoot = function(hootUid) {
      blasts.togglePausedStatus($scope.blastGroup.uid, hootUid);
    };

  }

})();


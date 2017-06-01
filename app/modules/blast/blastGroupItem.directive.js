(function () {
  'use strict';

  angular.module('gkt.voiceBox.blast')
    .directive('blastGroupItem', function () {
      return {
        restrict: 'E',
        replace: true,
        require: '^^blastPanel',
        link: function(scope, element, attrs, parentController) {
          scope.parentCtrl = parentController;
        },
        scope: {
          hoot: '='
        },
        controller: ['$scope', 'commonConstants', 'Blasts', hootController],
        templateUrl: '/partials/blast/blastGroupItem.html'
      };
    });

  function hootController($scope, constants, Blasts) {

    $scope.isShown = function() {
      var displayName = $scope.hoot.contact.display_name.trim().toLowerCase();
      var searchValue = $scope.parentCtrl.hootSearchValue.trim().toLowerCase();
      if(!searchValue || searchValue.length === 0)
        return true;

      return displayName.indexOf(searchValue) > -1;
    };

    $scope.isSelected = function() {
      var activeGroupId = $scope.parentCtrl.hoveredGroupId || $scope.parentCtrl.selectedGroupId;
      if(!activeGroupId)
        return false;

      var activeGroup = Blasts.getGroup(activeGroupId);
      return activeGroup && activeGroup.isMember($scope.hoot.uid);
    };

    $scope.toggleContact = function() {
      $scope.parentCtrl.toggleContact($scope.hoot.uid);
    };

    // watch the presence
    $scope.isOnline = $scope.hoot.status === constants.GKT.PRESENCE.online;

    function _handleConnectionStatus(newValue) {
      $scope.isOnline = newValue === constants.GKT.PRESENCE.online;
      $scope.$apply();
    }

    var _offStatusListener = $scope.hoot.onConnectionStatusChange(_handleConnectionStatus);
    $scope.$on('$destroy', function() {
      _offStatusListener && _offStatusListener();
    });
  }
})();

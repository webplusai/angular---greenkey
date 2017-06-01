(function () {
  'use strict';

  angular.module('gkt.voiceBox.midi')
    .directive('contactListItem', function () {
      return {
        restrict: 'E',
        controller: ['$element', '$scope', 'commonConstants', itemController],
        templateUrl: '/partials/midi/contactListItem.html',
        replace: true,
        link: function(scope, element, attrs) {
          scope.item = scope.$eval(attrs.item);
        }
      };
    });

  function itemController($element, $scope, constants) {

    $scope.isBlast = $scope.item.hoot.type === constants.GKT.CONTACT_TYPE.blastGroup;

    $scope.isSelected = function() {
      // selectedItemId is from parent scope
      return $scope.item.id === $scope.selectedItemId;
    };

    $scope.online = false;
    if($scope.isBlast)
      return;

    // this is for hoots only
    $scope.online = $scope.item.hoot.status === constants.GKT.PRESENCE.online;

    function _handleConnectionStatus(newValue) {
      $scope.online = newValue === constants.GKT.PRESENCE.online;
      $scope.$apply();
    }

    $scope.item.hoot.onConnectionStatusChange(_handleConnectionStatus);
    $element.on('$destroy', function() {
      $scope.item.hoot.offConnectionStatusChange(_handleConnectionStatus);
    });
  }
})();

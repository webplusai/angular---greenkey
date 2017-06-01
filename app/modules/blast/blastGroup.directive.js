(function() {
  'use strict';

  angular.module('gkt.voiceBox.blast')
    .directive('blastGroup', function() {
      return {
        restrict: 'E',
        replace: true,
        require: '^^blastPanel',
        link: function(scope, element, attrs, parentController) {
          scope.parentCtrl = parentController;
        },
        scope: {
          blast: '='
        },
        controller: ['$scope', '$rootScope', 'ngDialog', 'Blasts', blastGroupController],
        templateUrl: '/partials/blast/blastGroup.html'
      };
    });

  function blastGroupController($scope, $rootScope, ngDialog, Blasts) {

    $scope.selectGroup = function() {
      $scope.parentCtrl.selectGroup($scope.blast.id);
    };

    $scope.isGroupSelected = function() {
      return $scope.parentCtrl.selectedGroupId === $scope.blast.id;
    };

    $scope.onMouseHover = function(hover) {
      $scope.parentCtrl.hoveredGroupId = hover ? $scope.blast.id : null;
    };

    $scope.removeGroup = function() {
      ngDialog.openConfirm({
        template: '/partials/common/confirmDelete.html',
        data: {
          contactType: 'Blast Group'
        }
      }).then(function() {
        Blasts.deleteGroup($scope.blast.id);
        $scope.parentCtrl.selectedGroupId = null;
      });
    };
  }

})();

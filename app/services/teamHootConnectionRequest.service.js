(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')

  .service('TeamHootConnectionRequestService', function($q, ngDialog, TVC) {

    function _open(teamHoot) {
      ngDialog.open({
        template: '/partials/connectionModals/add-teamhoot-connection.html',
        className: 'modal-window-wrapper add-company-connection-dialog',
        closeByEscape: true,
        controller: ['$scope', function($scope) {
          $scope.teamHoot = teamHoot;
          $scope.showError = false;
          $scope.message = 'Please add me to team hoot ' + teamHoot.name;

          $scope.saveTeamHootRequest = function() {
            if (!$scope.message) {
              $scope.showError = true;
              return;
            }

            _saveTeamHootConnection(teamHoot, $scope.message);
          };

        }]
      });
    }

    function _saveTeamHootConnection(teamHoot, message) {
      var data = {
        connection_type: 'team_hoot',
        counterparty_company: teamHoot.company.id,
        message: message || '',
        team_hoot_id: teamHoot.id
      };

      TVC.requestDirectCompanyConnection(data)
        .then(function() {
          ngDialog.close(); // closing all modals.
        }, function() {
          console.log('error: creating direct company connection');
        });
    }

    return {
      open: _open
    };

  });
})();

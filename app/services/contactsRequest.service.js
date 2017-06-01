(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')
  .factory('ContactsRequestService', function ContactsRequestService(ngDialog, GKT, TVC, $q) {

    var chooseConnectionTypeDialog = null;
    var connectionTypeOptions = {
      availableOptions: [
        {
          id: 'true',
          name: 'Hoot - Always Active Connection'
        },
        {
          id: 'false',
          name: 'Ringdown - Active Only On-Demand'
        }
      ],
      selectedOption: {
        id: 'false',
        name: 'Ringdown - Active Only On-Demand'
      }
    };

    function removeConnection(user) {
      var dfd = $q.defer();
      var userFrom = GKT.getUserInfo().displayName;
      var userTo = user.full_name;

      TVC.getContactRequests()
        .then(function(data) {
          var connection = _.find(data.objects, function (obj) {
            return (
              obj.status === 'Rejected' &&
              ( obj.to === userTo && obj.from === userFrom || obj.to === userFrom && obj.from === userTo )
            );
          });

          if (connection) {
            TVC.removeRejectedRequest(connection)
              .then(dfd.resolve)
              .catch(dfd.reject);
          } else {
            dfd.reject();
          }
        });

      return dfd.promise;
    }

    function saveConnection(toUser) {
      var auto_answer = false;
      var connectionType = connectionTypeOptions.selectedOption.id;
      if (connectionType === 'true') {
        auto_answer = true;
      }
      var data = {
        'display_name': toUser.fullName || toUser.full_name,
        'user_uid': toUser.uid,
        'auto_answer': auto_answer,
        'chat': false
      };
      return TVC.createDirectConnection(data)
        .then(function(data) {
          if (chooseConnectionTypeDialog) {
            chooseConnectionTypeDialog.close();
            chooseConnectionTypeDialog = null;
          }
        }, function(err) {
          console.log('error: create direct connection');
        });
    }

    function addConnection(user, cbk) {
      var connectionType = connectionTypeOptions;

      chooseConnectionTypeDialog = ngDialog.open({
        template: '/partials/connectionModals/add-connection.html',
        className: 'modal-window-wrapper',
        closeByEscape: true,
        controller: function($scope) {
          'ngInject';

          $scope.fullName = user.fullName || user.full_name;
          $scope.connectionType = connectionType;
          $scope.saveInProgress = false;
          $scope.saveConnection = function() {
            if ($scope.saveInProgress) { return; }
            $scope.saveInProgress = true;
            saveConnection(user)
              .then(
                function(){
                  cbk && cbk();
                }, // success cbk.
                function() { // error cbk.
                  $scope.saveInProgress = false;
                }
              );
          };
        }
      });
    }

    return {
      removeConnection: removeConnection,
      addConnection: addConnection
    };

  });

})();
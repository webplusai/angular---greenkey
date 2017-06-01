(function() {
  'use strict';

  angular.module('gkt.voiceBox.dashboard')
    .controller('ProfileWindowController', profileWindowController);

  function profileWindowController($scope, ProfileHelper, GKT, TVC, ngDialog, ContactsRequestService) {
    'ngInject';

    $scope.user = {};
    $scope.openProfile = ProfileHelper.openProfile;
    $scope.actionInProgress = false;
    $scope.isReady = false;
    var chooseConnectionTypeDialog = null;

    $scope.ngDialogData.userInfoPromise.then(function (data) {
      $scope.user = data;
      $scope.isReady = true;
    });

    // TODO refactor
    $scope.connectionType = {
      availableOptions: [
        {id: 'true', name: 'Hoot - Always Active Connection'},
        {id: 'false', name: 'Ringdown - Active Only On-Demand'}
      ],
      selectedOption: {id: 'false', name: 'Ringdown - Active Only On-Demand'}
    };

    function saveConnection() {
      var auto_answer = false;
      var connection_type = $scope.connectionType.selectedOption.id;
      if(connection_type == "true") {
        auto_answer = true;
      }
      var data = {
        'display_name': $scope.user.fullName,
        'user_uid': $scope.user.uid,
        'auto_answer': auto_answer,
        'chat': false
      };

      return TVC.createDirectConnection(data)
        .then(function(data) {
          if(chooseConnectionTypeDialog) {
            chooseConnectionTypeDialog.close();
            chooseConnectionTypeDialog = null;
            $scope.user.connectionStatus = 'Pending';
          }
        }, function(err) {
          console.log('error: create direct connection');
        });
    }

    $scope.addConnection = function() {
      ContactsRequestService.addConnection($scope.user, function() {
        $scope.user.connectionStatus = 'Pending';
      });
    };

    $scope.removeConnectionRequest = function() {
      if($scope.actionInProgress)
        return;

      $scope.actionInProgress = true;
      var userFrom = GKT.getUserInfo().displayName;
      var userTo = $scope.user.fullName;

      function resetUiStatus() {
        $scope.actionInProgress = false;
      }

      TVC.getContactRequests().then(function(data) {
        var connection = _.find(data.objects, function(obj) {
          return obj.status === 'Rejected' &&
            ( obj.to === userTo && obj.from === userFrom ||
            obj.to === userFrom && obj.from === userTo );
        });

        if(!connection) {
          resetUiStatus();
          return;
        }

        TVC.removeRejectedRequest(connection).then(function() {
            $scope.user.connectionStatus = 'Connect';
            resetUiStatus();
          })
          .catch(resetUiStatus);
      });
    };
  }

})();

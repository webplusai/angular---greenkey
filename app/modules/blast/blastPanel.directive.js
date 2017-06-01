(function() {
  'use strict';

  angular.module('gkt.voiceBox.blast').directive('blastPanel', function() {
    return {
      restrict: 'E',
      scope: {},
      replace: true,
      controller: [
        '$scope',
        '$rootScope',
        'ngDialog',
        'Blasts',
        'commonConstants',
        'CallManager',
        blastPanelController],
      controllerAs: 'panelCtrl',
      templateUrl: '/partials/blast/blastPanel.html'
    };
  });


  function blastPanelController($scope, $rootScope, ngDialog, Blasts, constants, CallManager) {

    this.selectedGroupId = null;
    this.hoveredGroupId = null;
    this.hootSearchValue = '';

    this.selectGroup = function(groupId) {
      if (Blasts.groupExists(groupId)) {
        this.selectedGroupId = groupId;
        $rootScope.$emit(constants.UI_EVENTS.blast_group_selected, groupId);
      }
    };

    this.toggleContact = function(uid) {
      if (this.selectedGroupId) {
        Blasts.toggleContact(this.selectedGroupId, uid);
      }
    };


    $scope.hoots = [];
    CallManager.getHootConnections().then(function(hoots) {
      $scope.hoots = _.values(hoots);
    });


    $scope.sortBlastGroupItems = function(hoot) {
      var activeBlastId = this.hoveredGroupId || this.selectedGroupId;
      if (!activeBlastId)
        return hoot.contact.display_name;

      var blast = Blasts.getGroup(activeBlastId);
      if (!blast)
        return hoot.contact.display_name;

      return ( blast.isMember(hoot.uid) ? '0' : '1') + hoot.contact.display_name;
    }.bind(this);

    $scope.getBlastGroups = function() {
      return Blasts.getAll();
    };

    $scope.isBlastsModified = Blasts.isModified;

    $scope.saveChanges = Blasts.save;

    $scope.closeBlastPanel = function() {
      if (!Blasts.isModified()) {
        ngDialog.closeAll();
        return;
      }

      ngDialog.openConfirm({
        template: '/partials/blast/promptDirty.html',
      }).then(function(action) {
        if (action === 'cancel')
          return;

        action === 'save' ? Blasts.save() : Blasts.discard();
        ngDialog.closeAll();
      });
    };

    var newBlastDialog;
    $scope.addNewBlastGroup = function() {
      $scope.dialogData = {
        blastName: ''
      };

      newBlastDialog = ngDialog.open({
        template: '/partials/blast/promptName.html',
        scope: $scope
      });
    };

    $scope.onKeyPress = function(event) {
      if (event.which === 13) {
        $scope.confirmNewBlast();
      }
    };

    var showErrorDialog = function(errMessage) {
      ngDialog.open({
        template: '/partials/common/promptError.html',
        data: {
          error: errMessage
        }
      });
    };

    $scope.confirmNewBlast = function() {
      var nameExists = _.find(Blasts.getAll(), function(val) {
        return val.name.trim().toLowerCase() === $scope.dialogData.blastName.trim().toLowerCase();
      });

      if (!$scope.dialogData.blastName.trim()) {
        showErrorDialog('Blast name required!');
        return;
      }

      if (nameExists) {
        showErrorDialog('Blast name already exist in current list!');
        return;
      }

      Blasts.createGroup($scope.dialogData.blastName);
      newBlastDialog.close();
    };


    var self = this,
        unwatches = [];

    unwatches.push($rootScope.$on(constants.UI_EVENTS.blast_group_selection_requested, function(event, groupId) {
      self.selectGroup(groupId);
    }));

    $scope.$on('$destroy', function() {
      _.each(unwatches, function(deregisterListener) {
        _.isFunction(deregisterListener) && deregisterListener();
      });
    });
  }

})();


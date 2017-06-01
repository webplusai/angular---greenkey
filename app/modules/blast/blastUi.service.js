(function() {
  'use strict';

  angular.module('gkt.voiceBox.blast')
    .service('BlastUi', [
      '$rootScope',
      'commonConstants',
      'ngDialog',
      function($rootScope, constants, ngDialog) {

        this.openBlastPanel = function() {
          ngDialog.open({
            className: 'modal-window-wrapper blast-panel',
            template: '<blast-panel></blast-panel>',
            closeByEscape: false,
            closeByNavigation: false,
            closeByDocument: false,
            plain: true
          });
        };

        this.selectBlastGroup = function(groupId) {
          $rootScope.$emit(constants.UI_EVENTS.blast_group_selection_requested, groupId);
        };

        this.openQuickBlastPanel = function(blast) {
          ngDialog.open({
            className: 'modal-window-wrapper  quick-blast-panel',
            template: '<quick-blast-panel></quick-blast-panel>',
            closeByEscape: true,
            closeByNavigation: true,
            closeByDocument: true,
            plain: true,
            data: {
              blastGroup: blast
            }
          });
        };
      }
    ]);
})();
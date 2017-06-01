(function() {
  'use strict';

  angular.module('gkt.voiceBox.hotkeys')
  .factory('HotkeysService', function(ngDialog, MidiService, KeyboardService, commonConstants, GKT) {

    function _openMidiConfigDialog() {
      ngDialog.open({
        className: 'modal-window-wrapper midi-panel',
        template: '<midi-config-panel></midi-config-panel>',
        plain: true,
        closeByEscape: false,
        closeByNavigation: false,
        closeByDocument: false
      });
    }

    function _openKeyboardConfigDialog() {
      ngDialog.open({
        className: 'modal-window-wrapper midi-panel',
        template: '<keyboard-config-panel></keyboard-config-panel>',
        plain: true,
        closeByEscape: false,
        closeByNavigation: false,
        closeByDocument: false
      });
    }

    function _openHotkeysConfigDialog() {
      ngDialog.open({
        className: 'modal-window-wrapper midi-panel',
        template: '<hotkeys-config-panel></hotkeys-config-panel>',
        plain: true,
        closeByEscape: true,
        closeByNavigation: true,
        closeByDocument: true
      });
    }

    function _init() {
      GKT.addConfiguredListener(function() {
        MidiService.init();
        KeyboardService.init();
      });
    }

    function _getAssignedKey(connectionUid) {
      var midiKey = MidiService.getKey(connectionUid);
      if (midiKey) {
        return 'Midi: ' + midiKey;
      }

      var hotKey = KeyboardService.getKey(connectionUid);
      if (_.isString(hotKey)) {
        return hotKey.length > 1 ? hotKey : 'Key: ' + hotKey;
      }
      return hotKey;
    }


    return {
      openMidiConfigDialog: _openMidiConfigDialog,
      openKeyboardConfigDialog: _openKeyboardConfigDialog,
      openHotkeysConfigDialog: _openHotkeysConfigDialog,
      init: _init,
      getAssignedHotKey: _getAssignedKey
    };

  });

})();

(function() {
  'use strict';

  var appModule = angular.module('gkt.voiceBox.hotkeys', [
    'ngDialog',
    'gkt.voiceBox.hotkeys',
    'ui.bootstrap'
  ]);


  appModule.config(function($provide) {
    $provide.decorator('KeyboardService', addKeyChangeEventsSubscrubers);
    $provide.decorator('MidiService', addKeyChangeEventsSubscrubers);
  });

  function addKeyChangeEventsSubscrubers($delegate) {

    var hotKeyMediator = new Mediator(),
        hotKeysBuffer = {};

    $delegate.addKeyAssigningListener = function(listener) {
      hotKeyMediator.on('all', listener);
    };

    $delegate.addConnectionKeyChangeListener = function(connectionUid, listener) {
      hotKeyMediator.on(connectionUid, listener);
    };

    $delegate.removeConnectionKeyChangeListener = function(connectionUid, listener) {
      hotKeyMediator.off(connectionUid, listener);
    };

    var originalSetKey = $delegate.setKey;
    $delegate.setKey = function(connectionUid, hotKey) {
      originalSetKey(connectionUid, hotKey);
      hotKeysBuffer[connectionUid] = hotKey;
    };

    var originalSave = $delegate.save;
    $delegate.save = function() {
      originalSave();

      _.each(hotKeysBuffer, function(key, uid) {
        hotKeyMediator.publish(uid, key);
        hotKeyMediator.publish('all', uid, key);
      });
      hotKeysBuffer = {};
    };

    return $delegate;
  }

})();

(function() {
  'use strict';

  angular.module('gkt.voiceBox.hotkeys')
    .factory('KeyboardService', KeyboardService);

  function KeyboardService($rootScope, $window, commonConstants, Blasts, CallManager) {

    var keyboardConfig = {}; // { contactId: hotkey }
    var localConfig = {};
    var _inConfigMode = false;


    function _loadFormStorage() {
      keyboardConfig = JSON.parse(GKTConfig.getProperty(commonConstants.CONFIG_PROPS.hotkeys_keyboard, null)) || {};
      localConfig = _.clone(keyboardConfig);
    }

    function _save() {
      _clearBindings();
      keyboardConfig = _.clone(localConfig);
      GKTConfig.setProperty(commonConstants.CONFIG_PROPS.hotkeys_keyboard, JSON.stringify(keyboardConfig));
      _initKeyboardListeners();
    }

    function _setKey(id, key) {
      if (!key) {
        delete localConfig[id];
        return;
      }

      localConfig[id] = key;
    }

    function _handleKeyPressed(itemIds, event) {
      if (_inConfigMode) { return false; }

      _.each(itemIds, function(itemId) {
        $rootScope.$emit(commonConstants.UI_EVENTS.midi_push_shout_button, itemId);
      });

      return false;
    }

    function _handleKeyReleased(itemIds) {
      if (_inConfigMode) { return false; }

      _.each(itemIds, function(itemId) {
        $rootScope.$emit(commonConstants.UI_EVENTS.midi_release_shout_button, itemId);
      });

      return false;
    }

    function _initKeyboardListeners() {
      var combo;
      var configByKeys = _invertKeyList();

      _.forOwn(configByKeys, function(values, key) {
        if (!key) { return; }

        combo = key.replace(/\s/g, '').toLowerCase();

        $(document).bind('keydown.hotkeys', combo, _handleKeyPressed.bind(this, values));
        $(document).bind('keyup.hotkeys', combo, _handleKeyReleased.bind(this, values));
      });

      $rootScope.$on('$destroy', function() {
        _clearBindings();
      });
    }

    function _initAngularListeners() {
      // handle contact deletion
      CallManager.addOnRemoveConnectionListener(function(connection) {
        var id = connection.uid;
        if (localConfig[id]) {
          _setKey(id, null);
          _save();
        }
      });

      // handle blast group deletion
      Blasts.addBlastRemovalListener(function(blast) {
        _setKey(blast.id, null);
        _save();
      });
    }

    function _clearBindings() {
      $(document).unbind('keydown.hotkeys');
      $(document).unbind('keyup.hotkeys');
    }

    function _invertKeyList() {
      return _.invert(keyboardConfig, function(result, value, key) {
        if (hasOwnProperty.call(result, value)) {
          result[value].push(key);
        } else {
          result[value] = [key];
        }
      });
    }

    return {
      init: function() {
        _loadFormStorage();
        _initKeyboardListeners();
        _initAngularListeners();
      },
      getKey: function(id) {
        return localConfig[id];
      },
      unsetKey: _setKey,
      setKey: _setKey,
      setConfigMode: function(configMode) {
        _inConfigMode = configMode;
        localConfig = _.clone(keyboardConfig);
      },
      save: _save,
      reload: _loadFormStorage
    };
  }
})();
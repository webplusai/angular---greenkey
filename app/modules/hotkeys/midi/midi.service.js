(function() {
  'use strict';

  angular.module('gkt.voiceBox.midi')
    .factory('MidiService', [
      '$rootScope',
      '$window',
      'commonConstants',
      'Blasts',
      'CallManager',
      MidiService]);

  function MidiService($rootScope, $window, constants, Blasts, CallManager) {

    // [] => { key: Integer, uid: String }
    var _midiConfig = [];
    var _idsByKey = {};
    var _keysById = {};

    var _isReady = false;
    var _isConfigMode = false;
    var _configMidiHandler = null;

    function _loadFormStorage() {
      _midiConfig = JSON.parse(GKTConfig.getProperty(constants.CONFIG_PROPS.hotkeys_midi, null)) || [];
      _idsByKey = {};
      _keysById = {};

      _.each(_midiConfig, function(item) {
        _idsByKey[item.key] = item.uid;
        _keysById[item.uid] = item.key;
      });
    }

    function _saveToStorage() {
      _midiConfig = [];
      _.forOwn(_keysById, function(key, id) {
        _midiConfig.push({
          uid: id,
          key: key
        });
      });
      GKTConfig.setProperty(constants.CONFIG_PROPS.hotkeys_midi, JSON.stringify(_midiConfig));
    }

    function _setKey(id, key) {
      if(key !== null) {
        _idsByKey[key] = id;
        _keysById[id] = key;
        return;
      }

      var oldKey = _keysById[id];
      delete _keysById[id];
      if(oldKey)
        delete _idsByKey[oldKey];
    }

    function _handleKeyPressed(key) {
      if(_idsByKey[key])
        $rootScope.$emit(constants.UI_EVENTS.midi_push_shout_button, _idsByKey[key]);
    }

    function _initMidiListener() {
      if ($window.navigator.requestMIDIAccess) {
        $window.navigator.requestMIDIAccess({
          // system exclusive messages are not necessary
          sysex: false
        }).then(onMIDISuccess, onMIDIFailure);
      } else {
        console.warn("MIDI is not supported");
      }

      function noteOn(midiNote) {
        _isConfigMode ?
          _configMidiHandler(midiNote) : _handleKeyPressed(midiNote);
      }

      function noteOff(midiNote) {
        // trigger event for hoots in ptt mode
        if(_idsByKey[midiNote]) {
          $rootScope.$emit(constants.UI_EVENTS.midi_release_shout_button, _idsByKey[midiNote]);
        }
      }

      function onMIDISuccess(midiAccess) {
        var inputs = midiAccess.inputs.values();
        // loop through all inputs
        for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
          // listen for midi messages
          input.value.onmidimessage = onMIDIMessage;
          // this just lists our inputs in the console
          listInputs(input);
        }
        // listen for connect/disconnect message
        midiAccess.onstatechange = onStateChange;
        _isReady = true;
      }


      function onMIDIMessage(event) {
        var data = event.data,
          // cmd = data[0] >> 4,
          // channel = data[0] & 0xf,
          type = data[0] & 0xf0, // channel agnostic message type. Thanks, Phil Burk.
          note = data[1],
          velocity = data[2];
        // with pressure and tilt off
        // note off: 128, cmd: 8
        // note on: 144, cmd: 9
        // pressure / tilt on
        // pressure: 176, cmd 11:
        // bend: 224, cmd: 14f

        switch (type) {
          case 144: // noteOn message
            noteOn(note, velocity);
            break;
          case 128: // noteOff message
            noteOff(note, velocity);
            break;
        }
      }

      function onMIDIFailure() {
        console.warn("Failed to access MIDI");
      }

      function listInputs(inputs) {
        var input = inputs.value;
        console.info("Input port : [ type:'" + input.type + "' id: '" + input.id +
          "' manufacturer: '" + input.manufacturer + "' name: '" + input.name +
          "' version: '" + input.version + "']");
      }

      function onStateChange(event) {
        var port = event.port,
          state = port.state,
          name = port.name,
          type = port.type;
        if (type === "input") {
          // it needs to register handler for new or updated input
          if (typeof port.onmidimessage !== 'function') {
            port.onmidimessage = onMIDIMessage;
          }
          console.info("name", name, "port", port, "state", state);
        }
      }
    }

    function _initAngularListeners() {
      // handle contact deletion
      CallManager.addOnRemoveConnectionListener(function(connection) {
        var id = connection.uid;
        if(_keysById[id]) {
          _setKey(id, null);
          _saveToStorage();
        }
      });

      // handle blast group deletion
      Blasts.addBlastRemovalListener(function(blast) {
        _setKey(blast.id, null);
        _saveToStorage();
      });
    }

    return {
      isReady: function() {
        return _isReady;
      },
      init: function() {
        _loadFormStorage();
        _initMidiListener();
        _initAngularListeners();
      },
      getKey: function(id) {
        return _keysById[id];
      },
      unsetKey: function(id) {
        _setKey(id, null);
      },
      setKey: _setKey,
      setConfigMode: function(isConfigMode, configMidiHandler) {
        _isConfigMode = isConfigMode;
        _configMidiHandler = _isConfigMode && _.isFunction(configMidiHandler) ?
          configMidiHandler : null;
      },
      save: _saveToStorage,
      reload: _loadFormStorage
    };
  }
})();
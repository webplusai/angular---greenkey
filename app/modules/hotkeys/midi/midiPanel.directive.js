(function() {
  'use strict';

  angular.module('gkt.voiceBox.midi').directive('midiConfigPanel', function() {
    return {
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$document', 'MidiService', 'Blasts', 'CallManager', midiPanelController],
      templateUrl: '/partials/midi/midiPanel.html'
    };
  });

  function midiPanelController($scope, $document, MidiService, Blasts, CallManager) {

    // { id => { hoot => Object, key => String } }
    $scope.itemsById = {};
    $scope.selectedItemId = null;
    var _itemsByKey = {};

    // turn config mode on to prevent shouting during config
    MidiService.setConfigMode(true, function(key) {
      _handleMidiPressed(key);
      $scope.$apply();
    });
    // listen to Esc to exit editing a key
    $document.on('keydown', _handleKeydown);

    $scope.$on('$destroy', function() {
      MidiService.setConfigMode(false);
      $document.off('keydown', _handleKeydown);
    });

    // populate items from Hoots
    _loadItems();

    $scope.save = MidiService.save;
    $scope.discard = MidiService.reload;

    $scope.selectItem = function(id) {
      if ($scope.itemsById[id])
        $scope.selectedItemId = $scope.selectedItemId === id ? null : id;
    };

    $scope.unset = function(id) {
      _handleMidiPressed(null, id);
    };

    function _loadItems() {
      $scope.itemsById = {};
      _itemsByKey = {};

      function _addItem(hootItem, id, name) {
        var item = {
          hoot: hootItem,
          id: id,
          name: name,
          key: MidiService.getKey(id)
        };

        $scope.itemsById[item.id] = item;
        if(item.key)
          _itemsByKey[item.key] = item;
      }

      CallManager.getHootConnections().then(function(hoots) {
        _.each(_.sortBy(hoots, function(hoot) {
          return hoot.contact.display_name;
        }), function(hoot) {
          _addItem(hoot, hoot.uid, hoot.contact.display_name);
        });

        _.each(Blasts.getAll(), function(blast) {
          _addItem(blast, blast.id, '[Blast] ' + blast.name);
        });
      });
    }

    function _handleKeydown(e) {
      if(e.which === jQuery.ui.keyCode.ESCAPE) {
        _unselectItem();
        $scope.$apply();
      }
    }

    function _unselectItem() {
      $scope.selectedItemId = null;
    }

    function _handleMidiPressed(key, optionalId) {
      var itemId = optionalId || $scope.selectedItemId;
      if (!itemId) return;

      var item = $scope.itemsById[itemId];
      if (item.key === key) {
        _unselectItem();
        return;
      }

      if (item.key) {
        delete _itemsByKey[item.key];
      }

      if (_itemsByKey[key]) {
        var oldItem = _itemsByKey[key];
        oldItem.key = null;
        MidiService.unsetKey(oldItem.id);
      }

      // don't need to do it if key is null (unset key)
      if(key !== null) _itemsByKey[key] = item;
      item.key = key;
      MidiService.setKey(item.id, key);

      _unselectItem();
    }
  }
})();


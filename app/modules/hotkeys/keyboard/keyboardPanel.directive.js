(function() {
  'use strict';

  angular.module('gkt.voiceBox.hotkeys')

  .directive('keyboardConfigPanel', function() {
    return {
      restrict: 'E',
      controller: keyboardPanelController,
      templateUrl: '/partials/hotkeys/keyboard/keyboardPanel.html'
    };
  });

  function keyboardPanelController($scope, $document, KeyboardService, Blasts, CallManager, OpenFin, KeycodeService) {

    // { id => { hoot => Object, key => String } }
    $scope.itemsById = {};
    $scope.selectedItem = null;

    // Turn config mode on to prevent shouting during config
    KeyboardService.setConfigMode(true);

    var isOpenfin = OpenFin.exists();

    function _init() {
      // populate items from Hoots
      _loadItems();
      $scope.save = KeyboardService.save;
      $scope.discard = KeyboardService.reload;

      // listen to Esc to exit editing a key
      $document.on('keydown', _handleKeydown);

      $scope.$on('$destroy', function() {
        KeyboardService.setConfigMode(false);
        $document.off('keydown', _handleKeydown);
      });
    }

    function _loadItems() {
      $scope.itemsById = {};

      var allBlasts = Blasts.getAll();

      CallManager.getHootConnections()
        .then(function(hoots) {
          var sortedHoots = _.sortBy(hoots, 'contact.display_name');

          _.each(sortedHoots, function(hoot) {
            _addItem(hoot, hoot.uid, hoot.contact.display_name);
          });

        _.each(allBlasts, function(blast) {
          _addItem(blast, blast.id, '[Blast] ' + blast.name);
        });
      });
    }

    function _addItem(item, id, name) {
      var itemData = {
        hoot: item,
        id: id,
        name: name,
        key: KeyboardService.getKey(id)
      };

      $scope.itemsById[itemData.id] = itemData;
    }


    $scope.toggleSelect = function(item) {
      if ($scope.selectedItem === item) {
        $scope.selectedItem.selected = false;
        $scope.selectedItem = null;
      } else {
        if ($scope.selectedItem) {
          $scope.selectedItem.selected = false;
        }
        $scope.selectedItem = item;
        item.selected = true;
      }
    };

    $scope.unset = function(item) {
      item.key = null;
      KeyboardService.setKey(item.id, null);
      _unselectItem();
    };

    function _getMetaKey(e) {
      if (e.ctrlKey) {
        return 'Ctrl + ';
      }
      if (e.shiftKey) {
        return 'Shift + ';
      }
      if (e.altKey) {
        return 'Alt + ';
      }
      return '';
    }

    function _handleKeydown(e) {
      if (e.which === 27) { // escape.
        _unselectItem();
        return;
      }

      if ($scope.selectedItem) {

        if (!isOpenfin) {
          // Not allowing F-keys
          if (e.which >= 112 && e.which <= 123) {
            return;
          }

          // Not allowing non char keys.
          if (!String.fromCharCode(e.which).match(/\w/)) {
            return;
          }
        }

        // Do nothing when pressing: meta | ctrl | shift | alt.
        if (e.metaKey || e.ctrlKey && e.which === 17 || e.shiftKey && e.which === 16 || e.altKey && e.which === 18) {
          return;
        }

        var char = KeycodeService.getChar(e.which);
        var comb = _getMetaKey(e) + char;
        var isReservedCombination = KeycodeService.isMSCombination(comb);

        if (!char || isReservedCombination) { return; }

        $scope.selectedItem.key = comb;
        KeyboardService.setKey($scope.selectedItem.id, $scope.selectedItem.key);

        _unselectItem();
        e.stopPropagation();
        e.preventDefault();
      }

      $scope.$apply();
    }

    function _unselectItem() {
      if (!$scope.selectedItem) { return; }
      $scope.selectedItem.selected = false;
      $scope.selectedItem = null;
    }

    _init();

  }
})();


(function() {
  'use strict';

  angular.module('gkt.voiceBox.common')

  .factory('ArrangeStorage', function($localStorage) {

    var _store = function(items, key) {
      var storage = _.filter(items, function(item) { return item && item.uid; });
      storage = _.map(storage, function(item) {
        return _.pick(item, 'uid');
      });

      $localStorage[key + 'Arrange'] = storage;
    };

    var _load = function(items, key) {
      var reordererdItems = [];
      var preference = $localStorage[key + 'Arrange'];
      var item;

      if (!preference) {
        return items;
      }

      _.each(preference, function(pref) {
        if (pref.uid) {
          item = _.remove(items, { uid: pref.uid })[0];
          if (item) {
            reordererdItems.push(item);
          }
        }
      });

      return reordererdItems.concat(items);
    };

    return {
      store: _store,
      load: _load
    };
  });

})();

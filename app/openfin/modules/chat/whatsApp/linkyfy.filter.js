(function() {
  'use strict';

  angular.module("openFinIntegration")
    .filter('linkify', function($filter) {
      return function(text) {

        if (!text || typeof text !== 'string') { return ''; }
        var source = text.split('"');
        var destination = _.map(source, function(item) {
          return item.linkify();
        });
        return destination.join('&quot;').replace(/&amp;/g, '&');
      }
    });
})();
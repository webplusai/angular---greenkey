(function() {
  'use strict';

  angular.module('gkt.voiceBox.common')

  .factory('Timer', function($interval) {

    var _run = function(delay) {
      var initialMs = new Date();
      initialMs.setHours(0);
      initialMs.setMinutes(0);
      initialMs.setSeconds(0);
      var interval;
      var result = {
        elapsed: initialMs
      };

      interval = $interval(function() {
        var mills = result.elapsed.getMilliseconds();
        result.elapsed.setMilliseconds(mills + delay);
      }, delay);

      result.cancel = function() {
        $interval.cancel(interval);
      };

      return result;
    };

    return {
      run: _run
    };
  });

})();

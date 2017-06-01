(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk').service("angularUtils", ["$q", "$timeout", function ($q, $timeout) {

    this.addScopeCheckToPromiseFunc = function (baseObject, func) {
      if (func === undefined) {
        func = baseObject;
        baseObject = null;
      }
      return function () {
        var res = func.apply(baseObject, arguments);
        if (res && res instanceof Promise) {
          var deferred = $q.defer();
          res.then(function () {
              deferred.resolve.apply(deferred, arguments);
            })
            .catch(function () {
              deferred.reject.apply(deferred, arguments);
            });
          res = deferred.promise;
        }
        return res;
      };
    };

    function createListeners(updateScope) {
      var listeners = new Set();

      function add(listener) {
        listeners.add(listener);
      }

      function remove(listener) {
        listeners.delete(listener);
      }

      var trigger = function(args) {
        listeners.forEach(function (listener) {
          listener.apply(null, args);
        });
      };

      if(updateScope){
        var triggerFunc = trigger;
        trigger = function(args) {
          $timeout(function() {
            triggerFunc(args);
          });
        };
      }

      return {
        add: add,
        remove: remove,
        trigger: function() {
          if (listeners.size > 0)
            trigger(arguments);
        }
      };
    }

    this.createListenersWithScopeCheck = function () {
      return createListeners(true);
    };

    this.createListenersWithoutScopeCheck = function () {
      return createListeners(false);
    };
  }]);
})();

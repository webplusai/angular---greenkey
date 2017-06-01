(function() {
  'use strict';

    angular.module('gkt.voiceBox.services')
    .factory('QueueFactory', function () {
      var Queue = function Queue(options) {
        this.queue = [];
        this.intervalId = null;
        this.interval = 1000;
        Object.keys(options).forEach(function(key) {
          this[key] = options[key];
        }, this);
        this.tick = this.tick.bind(this);
      };
      Queue.prototype = {
        constructor: Queue,
        push: function(item) {
          this.queue.push(item);
          if (!this.intervalId) {
            this.register();
          }
        },
        register: function() {
          console.log('[QUEUE] Registering queue worker, length of queue ' + this.queue.length);
          if (!this.intervalId) {
            this.intervalId = setInterval(this.tick, this.interval);
          }
        },
        tick: function() {
          var item = this.queue.pop();

          if (this.worker) {
            this.worker(item);
          }

          if (this.queue.length === 0) {
            console.log('[QUEUE] Unregister queue worker, length of queue ' + this.queue.length);
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
        }
      };

      return {
        create: function(options) {
          return new Queue(options);
        }
      };
    });

})();
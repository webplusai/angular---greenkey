(function() {
  'use strict';
  angular.module('gkt.voiceBox.openFin')
    .service('OpenFinResizeService', [
      '$q',
      '$window',
      '$localStorage',
      'OpenFin',
      function($q, $window, $localStorage, OpenFin) {

        var self = this;

        /**
         * An instance of the current window
         * @type {fin.desktop.Window | null}
         */
        var finWindow = null;

        /**
         * Initializes resize service, adds necessary listeners
         */
        this.initialize = function() {
          if (!OpenFin.exists()) {
            return;
          }

          // The main() event is OpenFin's equivalent to something like DOMContentLoaded for the DOM
          // but for its injected script
          fin.desktop.main(function() {
            finWindow = fin.desktop.Window.getCurrent();
            turnOnResizeListener();

            if (document.readyState === "complete") {
              restoreWindowState();
            } else {
              document.addEventListener("readystatechange", function() {
                document.readyState === "complete" && restoreWindowState();
              });
            }
          });
        };

        /**
         * Switches application to compact mode
         */
        this.switchToCompactMode = function () {
          if (finWindow) {
            finWindow.restore();
            finWindow.resizeTo(400, 775, "bottom-right");
          }
        };

        /**
         * Maximizes the window
         */
        this.maximize = function () {
          finWindow && finWindow.maximize();
        };


        /**
         * Checks if the window is maximized
         * @return Promise
         */
        function isMaximized() {
          return $q(function (resolve) {
            // this method is called when OpenFin is certainly initialized so self.finWindow exists and
            // additional checks are not required
            finWindow.getState(function (state) {
              resolve(state === 'maximized');
            });
          });
        }

        /**
         * Restores window maximized state if it needs
         */
        function restoreWindowState() {
          if ($localStorage.isFinWindowMaximized) {
            isMaximized().then(function (isMaximized) {
              !isMaximized && self.maximize();
            });
          }
        }

        /**
         * Adds window resize handler to remember maximized flag in local storage
         */
        function turnOnResizeListener() {
          // Openfin doesn't remember maximized window state,
          // e.g. when user switched from compact to fullscreen mode
          $window.addEventListener('resize', function () {
            isMaximized().then(function (isMaximized) {
              $localStorage.isFinWindowMaximized = isMaximized;
            });
          }, false);
        }
      }
    ]);
})();

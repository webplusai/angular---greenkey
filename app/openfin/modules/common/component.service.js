(function () {
  'use strict';
  angular.module("openFinIntegration")
      .service('ComponentService', ['$timeout', '$q', '$window', componentService]);

  function componentService($timeout, $q, $window) {

    // TODO improve this detection
    function _isTornWindow() {
      return Boolean($window.receiveMessageFromPopup);
    }

    function _getComponent() {
      return $q(function (resolve, reject) {
        var counter = 0;
        (function tryToGetWindow() {
          var object = _isTornWindow() ? fin.desktop.Window : fin.desktop.Notification;
          object === undefined ?
              (++counter === 10 ? reject("Attempts limit exceeded") : $timeout(tryToGetWindow, 500)) :
              resolve(object.getCurrent());
        })();
      });
    }

    function _closeComponent() {
      return _getComponent()
          .then(function (component) { component.close() })
          .catch(console.warn.bind(this, "Unable to get OpenFin window to close"));
    }

    /**
     * @returns {Promise} via $q
     */
    this.getComponent = _getComponent;
    this.closeComponent = _closeComponent;
    this.isTornWindow = _isTornWindow;
    this.isNotification = function() {
      return !_isTornWindow();
    }
  }
})();
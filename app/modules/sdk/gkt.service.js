(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk').provider("GKT", function() {

    var gkt = null;

    this.init = function (gktInstance) {
      gkt = gktInstance;
    };

    this.$get = ["$localStorage", 'commonConstants', "angularUtils", function ($localStorage, commonConstants, angularUtils) {
      var forceLogoutListeners = angularUtils.createListenersWithScopeCheck();
      gkt.on(commonConstants.GKT.APP_EVENTS.force_logout, forceLogoutListeners.trigger);
      var configuredListeners = angularUtils.createListenersWithScopeCheck();
      // TODO triggering Configured event for UI moved to Dashboard controller until we have single entry point
      // gkt.on(commonConstants.GKT.APP_EVENTS.configured, configuredListeners.trigger);
      var fatalErrorListeners = angularUtils.createListenersWithScopeCheck();
      gkt.on(commonConstants.GKT.APP_EVENTS.fatal_error, fatalErrorListeners.trigger);
      var statusChangeListeners = angularUtils.createListenersWithScopeCheck();
      gkt.on(commonConstants.GKT.APP_EVENTS.status_change, statusChangeListeners.trigger);

      function login(loginData) {
        return gkt.login(loginData, $localStorage);
      }

      function restoreSession() {
        return gkt.restoreSession($localStorage);
      }

      function logout() {
        return gkt.logout($localStorage);
      }

      function getProperty(propertyName) {
        return gkt[propertyName];
      }

      return {
        getUserInfo: gkt.getUserInfo,
        login: angularUtils.addScopeCheckToPromiseFunc(login),
        restoreSession: angularUtils.addScopeCheckToPromiseFunc(restoreSession),
        logout: angularUtils.addScopeCheckToPromiseFunc(logout),
        forceLogout: gkt.forceLogout,

        addForceLogoutListener: forceLogoutListeners.add,
        removeForceLogoutListener: forceLogoutListeners.remove,
        addConfiguredListener: configuredListeners.add,
        removeConfiguredListener: configuredListeners.remove,
        // TODO temporary measure
        triggerConfiguredEvent: configuredListeners.trigger,
        addFatalErrorListener: fatalErrorListeners.add,
        removeFatalErrorListener: fatalErrorListeners.remove,
        addStatusChangeListener: statusChangeListeners.add,
        removeStatusChangeListener: statusChangeListeners.remove,

        isLoggedIn: gkt.containsSessionData.bind(gkt, $localStorage),
        getProperty: getProperty
      };

    }];

  });
})();

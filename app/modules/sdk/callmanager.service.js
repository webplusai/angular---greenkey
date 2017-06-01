(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk').provider("CallManager", function () {
    var callManager = null;

    this.init = function (callManagerInstance) {
      callManager = callManagerInstance;
    };


    this.$get = ["$rootScope", "$q", "$timeout", "angularUtils", "commonConstants", function (
      $rootScope, $q, $timeout, angularUtils, commonConstants) {

      var inboundCallListeners = angularUtils.createListenersWithScopeCheck();
      callManager.addIncomingCallListener(inboundCallListeners.trigger);
      var outboundCallListeners = angularUtils.createListenersWithScopeCheck();
      var hootsExtractionListeners = angularUtils.createListenersWithoutScopeCheck();
      var ringdownsExtractionListeners = angularUtils.createListenersWithoutScopeCheck();
      var speedDialsExtractionListeners = angularUtils.createListenersWithoutScopeCheck();
      var externalContactsExtractionListeners = angularUtils.createListenersWithoutScopeCheck();
      var newConnectionListeners = angularUtils.createListenersWithScopeCheck();
      var onRemoveConnectionListeners = angularUtils.createListenersWithScopeCheck();
      var updateConnectionListeners = angularUtils.createListenersWithScopeCheck();

      function prepareConnections(contacts) {
        return _.isArray(contacts) ? contacts : _.values(contacts);
      }

      function initAllConnections() {
       getAllConnections().then(function (connections) {
          $timeout(function () {
            hootsExtractionListeners.trigger(prepareConnections(connections.hoots));
            ringdownsExtractionListeners.trigger(prepareConnections(connections.ringdowns));
            speedDialsExtractionListeners.trigger(prepareConnections(connections.speedDials));
            externalContactsExtractionListeners.trigger(prepareConnections(connections.externals));
          });

          callManager.addNewConnectionsListener(newConnectionListeners.trigger);
          callManager.addUpdateConnectionListener(updateConnectionListeners.trigger);
          callManager.addOnRemoveConnectionListener(onRemoveConnectionListeners.trigger);
        });
      }

      function getAllConnections() {
        return $q.all({
          hoots: callManager.getHootConnections(),
          ringdowns: callManager.getRingdownConnections(),
          externals: callManager.getExternalConnections(),
          speedDials: callManager.getSpeedDialConnections()
        });
      }

      $rootScope.$on(commonConstants.UI_EVENTS.dashboard_opened, initAllConnections);

      return {
        getAllConnections: getAllConnections,
        getCurrentConnections: callManager.getCurrentConnections.bind(callManager),
        muteAllHoots: angularUtils.addScopeCheckToPromiseFunc(callManager, callManager.muteAllHoots),
        getHootConnections: angularUtils.addScopeCheckToPromiseFunc(callManager, callManager.getHootConnections),
        getCurrentHootConnections: callManager.getCurrentHootConnections.bind(callManager),
        getExternalConnections: angularUtils.addScopeCheckToPromiseFunc(callManager, callManager.getExternalConnections),
        getExternalConnectionByDisplayName: angularUtils.addScopeCheckToPromiseFunc(callManager, callManager.getExternalConnectionByDisplayName),
        getExternalConnectionsByName: angularUtils.addScopeCheckToPromiseFunc(callManager, callManager.getExternalConnectionsByName),
        getRingdownConnections: angularUtils.addScopeCheckToPromiseFunc(callManager, callManager.getRingdownConnections),
        getCurrentRingdownConnections: callManager.getCurrentRingdownConnections.bind(callManager),
        getActiveConnectionsByType: callManager.getActiveConnectionsByType.bind(callManager),
        createExternalConnection: callManager.createExternalConnection.bind(callManager),
        getConnectionByContactId: angularUtils.addScopeCheckToPromiseFunc(callManager.getConnectionByContactId),

        addInboundCallListener: inboundCallListeners.add,
        removeInboundCallListener: inboundCallListeners.remove,
        addOutboundCallListener: outboundCallListeners.add,
        removeOutboundCallListener: outboundCallListeners.remove,
        triggerOutboundCall: outboundCallListeners.trigger,

        addHootsExtractionListener: hootsExtractionListeners.add,
        removeHootsExtractionListener: hootsExtractionListeners.remove,
        addRingdownsExtractionListener: ringdownsExtractionListeners.add,
        removeRingdownsExtractionListener: ringdownsExtractionListeners.remove,
        addSpeedDialsExtractionListener: speedDialsExtractionListeners.add,
        removeSpeedDialsExtractionListener: speedDialsExtractionListeners.remove,
        addExternalContactsExtractionListener: externalContactsExtractionListeners.add,
        removeExternalContactsExtractionListener: externalContactsExtractionListeners.remove,

        addNewConnectionListener: newConnectionListeners.add,
        removeNewConnectionListener: newConnectionListeners.remove,
        addOnRemoveConnectionListener: onRemoveConnectionListeners.add,
        removeOnRemoveConnectionListener: onRemoveConnectionListeners.remove,
        addUpdateConnectionListener: updateConnectionListeners.add,
        removeUpdateConnectionListener: updateConnectionListeners.remove
      };
    }];
  });
})();

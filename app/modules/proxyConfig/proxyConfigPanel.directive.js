(function () {
  'use strict';

  angular.module('gkt.voiceBox.proxyConfig').directive('proxyConfigPanel', function () {
    return {
      restrict: 'E',
      replace: true,
      controller: ['$scope', '$document', 'ProxyConfigService', 'GKT', proxyConfigPanelController],
      templateUrl: '/partials/proxyConfig/proxyConfig.html'
    };
  });

  function proxyConfigPanelController($scope, $document, ProxyConfigService, GKT) {

    function reload() {
      ProxyConfigService.getProxyConfig().then(function (config) {
        $scope.proxyConfig = config;
      }).catch(function (e) {
        console.error("Unable to get proxy config: ", JSON.stringify(e));
      });
    }

    function save() {
      ProxyConfigService.setProxyConfig($scope.proxyConfig).then(function (e) {
        console.log("Tried to apply proxy config: " + JSON.stringify($scope.proxyConfig) + ". Result: " + JSON.stringify(e));
      }).catch(function (e) {
        console.log("Tried to apply proxy config: " + JSON.stringify($scope.proxyConfig) + ". Result: " + JSON.stringify(e));
      });
    }

    reload();

    $scope.save = save;
    $scope.discard = reload;

    function loadConfig() {
      $scope.proxyConfigWebRTCLimitEnabledInOpenFin = GKTConfig.getBoolean("tvb.PROXY_CONFIG_WEBRTC_LIMIT_ENABLED_IN_OPENFIN", false);
    }

    GKT.addConfiguredListener(loadConfig);
    loadConfig();

  }
})();


(function () {
    'use strict';

    angular.module('gkt.voiceBox.proxyConfig')
        .factory('ProxyConfigService', [
            '$rootScope',
            '$localStorage',
            '$window',
            'commonConstants',
            'ChromeExtensionAPIService',
            ProxyConfigService]);


    function ProxyConfigService($rootScope, $localStorage, $window, constants, ChromeExtensionAPIService) {

        /**
         * @typedef {Object} ProxyConfigService~ProxyConfig
         * @param {boolean} overrideSystemSettings Override system settings
         * @param {string} host Proxy host
         * @param {number} port Proxy port
         * @param {boolean} forceSendingVoiceViaProxy Force sending RTP (voice) data via proxy.
         */

        /**
         * @return {Promise<ProxyConfigService~ProxyConfig>} Current proxy configuration
         * @private
         */
        function _getProxyConfig() {
            return ChromeExtensionAPIService.call("getProxyConfig", {});
        }


        /**
         * Apply proxy configuration
         * @param {ProxyConfigService~ProxyConfig} proxyConfig
         * @return {Promise<boolean>} True if success and false if failed.
         * @private
         */
        function _setProxyConfig(proxyConfig) {
            return ChromeExtensionAPIService.call("setProxyConfig", proxyConfig);
        }

        return {
            getProxyConfig: _getProxyConfig,
            setProxyConfig: _setProxyConfig
        };
    }
})();
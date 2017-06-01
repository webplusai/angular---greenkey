(function() {
  'use strict';

  angular.module('gkt.voiceBox.services')
    .service('BrowserDetectService', [BrowserDetectService]);


  /**
   * Determines if browser is Internet Explorer
   * @returns Boolean
   * @private
   */
  function _isIe() {
    var userAgent = navigator.userAgent.toLowerCase();
    // msie = IE < 10
    // trident = IE 11
    // edge = MS Edge aka IE 12
    if (userAgent.indexOf('msie') > 0 || userAgent.indexOf('trident') > 0 || userAgent.indexOf('edge') > 0) {
      return true;
    }

    // other browser
    return false;
  }
  /**
   * Determines if browser is chromium based: allowed Chrome, Openfin chromium container;
   * @returns Boolean
   * @private
   */
  function _isSupportedBrowser() {
    var userAgent = navigator.userAgent.toLowerCase(),
        isLikeChrome = userAgent.indexOf('chrome') > -1,
        isLikeSafari = userAgent.indexOf('safari') > -1;

    if (isLikeSafari) {
      return true;
    }

    // opera is chromium based, but we don't support it
    // ms edge also looks like chrome
    if (isLikeChrome) {
      return userAgent.indexOf('opr') === -1 && userAgent.indexOf('edge') === -1;
    }

    return false;
  }

  /**
   * Determines if application is running in openfin chromium container;
   * @private
   */
  function _isOpenFin() {
    return _isSupportedBrowser() && Boolean(window.fin);
  }


  function BrowserDetectService() {

    return {
      isIe: _isIe,
      isSupportedBrowser: function() { return !_isIe(); },
      isOpenFin: _isOpenFin
    };
  }
})();

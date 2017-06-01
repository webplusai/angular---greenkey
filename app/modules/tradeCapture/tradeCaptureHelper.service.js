(function() {
  'use strict';

  angular.module('gkt.voiceBox.common')
    .service('TradeCaptureHelper', ['ngDialog', 'tvbUIState',
      function(ngDialog, tvbUIState) {

        var _preset;
        var TRADING_PATTERN =
          /^[\w\s\-]{2,}[F-Z][\d]{2}\s[B|S]\s[\d]+\s[\d]+\.?[\d]*$/i;
        var MONTHS = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V',
          'X', 'Z'];

        this.getPreset = function() {
          return _preset;
        };

        this.isTradingEntity = function(text) {
          return TRADING_PATTERN.test(text);
        };

        this.convertTextToPreset = function(text) {

          var parts = text.split(' ');
          console.warn("parts", parts);

          var partsLength = parts.length;
          if(partsLength < 4)
            return {};

          var monthAndYear = parts[partsLength - 4];
          var year = '20' + monthAndYear.substr(-2);
          var month = MONTHS.indexOf(monthAndYear.substr(-3, 1)) + 1;
          if(month > -1) {
            month = (month < 10 ? '0' : '') + month;
          }

          // compose the product
          var productArray = parts.slice();
          productArray.splice(partsLength - 3, 3);
          var product = productArray.join(' ');
          // remove month and year
          product = product.substr(0, product.length - 3);

          var result = {
            product: product,
            price: parts[partsLength - 1],
            qty: parts[partsLength - 2],
            month: month,
            year: year
          }

          console.warn("res", result);
          return result;
        };

        this.openTradeCaptureFrom = function(text) {

          _preset = text ? this.convertTextToPreset(text) : null;

          ngDialog.open({
            className: 'modal-window-wrapper',
            template: '<cme-trade-capture preset="' + (text ? 'true' : 'false')
            + '"></cme-trade-capture>',
            plain: true,
            closeByEscape: true,
            closeByNavigation: false,
            closeByDocument: false,
            overlay: !tvbUIState.compactMode
          });

        }

      }]);
})();
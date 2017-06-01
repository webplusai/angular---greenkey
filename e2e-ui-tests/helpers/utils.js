'use strict';

/**
 * Created by maheshg on 12/14/15.
 */

module.exports = function(browser) {
  var api = {};

  api.ensureVisible = function(selector, apiBrowser) {
    apiBrowser = apiBrowser || browser;
    return apiBrowser.waitForAngular().then(function() {
      return apiBrowser.wait(function() {
        return apiBrowser.element(selector).isPresent().then(function(result) {
          return result && apiBrowser.waitForAngular().then(
            function() {
              return apiBrowser.element(selector).isDisplayed();
            });
        });
      }, apiBrowser.params.apiTimeout);
    });
  };

  api.ensureElementVisible = function(element, apiBrowser) {
    apiBrowser = apiBrowser || browser;
    return apiBrowser.wait(function() {
      return element.isPresent().then(function(result) {
        return result && element.isDisplayed();
      });
    }, apiBrowser.params.apiTimeout);
  };

  api.hasClass = function (element, cls) {
    return element.getAttribute('class').then(function (classes) {
      return classes.split(' ').indexOf(cls) !== -1;
    });
  };

  api.clearWindows = function(browsers){
    browsers = browsers || browser;
    if (browsers.length>1){
      for(var i = 0;i<=browsers.length;i++){
        if(typeof browsers[i] != 'undefined') {
          (function(data){
            data.close();
          })(browsers[i]);
        }
      }
    }

    browser.getAllWindowHandles().then(function (handles) {
      for(var i = 1;i<=handles.length;i++){
        if(typeof handles[i] != 'undefined') {
          (function(data){
            browser.driver.switchTo().window(data);
            browser.driver.close();
            browser.driver.switchTo().window(handles[0]);
          })(handles[i]);
        }
      }
    });
  }

  api.getBrowserWindow = function(window){
    return browser.getAllWindowHandles().then(function (handles) {
      return browser.driver.switchTo().window(handles[window]);
    });
  }

  return api;
};
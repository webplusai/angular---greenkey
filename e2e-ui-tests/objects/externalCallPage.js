'use strict';

var createUtils = require('../helpers/utils');

module.exports = function (browser) {

    var utils = createUtils(browser);


    var api = {};

    var selectors = {
        ringPanel: by.css('.calls-wrapper'),
        callButton: by.css(".call-button"),
        poneNumberInput: by.css('.search-contact input[ng-model="dialer.number"]')
    };

    api.selectors = selectors;

    api.callToUser = function (apiBrowser) {
        apiBrowser = apiBrowser || browser;
        apiBrowser.sleep(browser.params.devTimeout+5000);
        return utils.ensureVisible(selectors.callButton).then(function () {
            var callButton = apiBrowser.element(selectors.callButton);
            apiBrowser.element(selectors.poneNumberInput).sendKeys(browser.params.users[0].phoneNumber);
            return callButton.click().then(function(){
                apiBrowser.sleep(browser.params.devTimeout);
                return apiBrowser.element(selectors.ringPanel).element(by.css('.call-title')).getText().then(function(text){
                    if (text == apiBrowser.params.users[0].phoneNumber){
                        return true
                    }else {
                        return false;
                    }
                });
            })
        })
    };

    return api;
};
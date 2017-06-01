'use strict';

var createUtils = require('../helpers/utils');

module.exports = function (browser) {

    var utils = createUtils(browser);


    var api = {};

    var selectors = {
        ringdownButton13: by.id(browser.params.users[0].uid),
        ringdownButton14: by.id(browser.params.users[1].uid),
        ringPanel: by.id("ringdowns-main-container"),
        phonePanel: by.css('.phone-main-container'),
        callPanel: by.css('.active-calls-panel'),
        acceptCallButton: by.css('.active-call-box div[ng-click="acceptCall()"]'),
        releaseCallButton: by.css('.active-calls-panel .pull-left .release-calls-btn'),
        selectButton: by.css('div[ng-click="selectCall()"]'),
        callButton: by.css(".call-button"),
        poneNumberInput: by.css('.search-contact input[ng-model="dialer.number"]')
    };

    api.selectors = selectors;

    api.ringToUser = function (user, apiBrowser) {
        apiBrowser = apiBrowser || browser;
        if (user==13){
            user = selectors.ringdownButton13;
        }
        else if (user==14){
            user = selectors.ringdownButton14;
        }
        apiBrowser.sleep(apiBrowser.params.devTimeout+3000);
        return utils.ensureVisible(user, apiBrowser).then(function () {
            var ringButton = apiBrowser.element(user);
            apiBrowser.sleep(apiBrowser.params.devTimeout);
            return ringButton.click().then(function(){
                apiBrowser.sleep(apiBrowser.params.devTimeout);
                return apiBrowser.element(selectors.ringPanel).element(user).element(by.css('.contact-name')).getText().then(function(text){
                    if (text == apiBrowser.params.users[0].ringBtnUserInfo  ||
                        text == apiBrowser.params.users[0].ringBtnUserInfo2 || text == apiBrowser.params.users[2].ringBtnUserInfo ||
                        text == apiBrowser.params.users[1].ringBtnUserInfo || text == apiBrowser.params.users[1].ringBtnUserInfo2
                    ){
                        return true
                    }else {
                        return text;
                    }
                });
            })
        })

    };

    api.acceptCall = function (apiBrowser) {
        apiBrowser = apiBrowser || browser;
        return utils.ensureVisible(selectors.callPanel, apiBrowser).then(function () {
            apiBrowser.sleep(apiBrowser.params.devTimeout+7000);
            var acceptButton = apiBrowser.element(selectors.acceptCallButton);
            return acceptButton.click().then(function(){
                return apiBrowser.element(selectors.callPanel).element(by.css('.call-title')).getText().then(function(text){
                    if (text == apiBrowser.params.users[2].ringBtnUserInfo || text == apiBrowser.params.users[2].ringBtnUserInfo2 ||
                        text == apiBrowser.params.users[1].ringBtnUserInfo || text == apiBrowser.params.users[1].ringBtnUserInfo2 ||
                        text == apiBrowser.params.users[4].phoneNumber){
                        return true
                    }else {
                        return text;
                    }
                });
            })
        })

    };

    api.callRelease = function (apiBrowser) {
        apiBrowser = apiBrowser || browser;

        return utils.ensureVisible(selectors.callPanel, apiBrowser).then(function () {
            var selectButton = apiBrowser.element(selectors.selectButton);
            var releaseButton = apiBrowser.element(selectors.releaseCallButton);
            apiBrowser.sleep(apiBrowser.params.devTimeout);
            return selectButton.click().then(function(){
                apiBrowser.sleep(apiBrowser.params.devTimeout);
                return releaseButton.click().then(function(){
                    return true;
                })
            })
        })

    };

    return api;
};
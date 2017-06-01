'use strict';

var createUtils = require('../helpers/utils');

module.exports = function (browser) {

    var utils = createUtils(browser);


    var api = {};

    var selectors = {
        hootShoutButton13: by.id(browser.params.users[0].uid),
        hootShoutButton14: by.id(browser.params.users[1].uid),
        hootShoutTeamButton: by.id(browser.params.users[0].hootTeam),
        shoutPanel: by.css('.hoot'),
        shoutText: by.css('.shout-panel .ng-binding'),
        blastGroup1Button: by.css('.blast-group-1'),
        blastGroup2Button: by.css('.blast-group-2'),
        blastGroup3Button: by.css('.blast-group-3'),

    };

    api.selectors = selectors;

    api.shoutTo13 = function (apiBrowser) {
        apiBrowser = apiBrowser || browser;
        return utils.ensureVisible(selectors.hootShoutButton13, apiBrowser).then(function () {
            var shoutElement = apiBrowser.element(selectors.hootShoutButton13);
            apiBrowser.sleep(10000);
            shoutElement.click();
            apiBrowser.sleep(apiBrowser.params.devTimeout);
            return true;
        })

    };

    api.shoutToTeam = function (apiBrowser) {
        apiBrowser = apiBrowser || browser;

        return utils.ensureVisible(selectors.hootShoutTeamButton, apiBrowser).then(function () {
            var shoutElement = apiBrowser.element(selectors.hootShoutTeamButton);
            apiBrowser.sleep(apiBrowser.params.devTimeout+8000);
            shoutElement.click();
            apiBrowser.sleep(apiBrowser.params.devTimeout);
            return true;
        })

    };

    api.expectGreenButton = function (to, apiBrowser) {
        apiBrowser.sleep(apiBrowser.params.devTimeout + 3000);
        to = to || "user";
        apiBrowser = apiBrowser || browser;
        var shout = '';
        if (to == "team")
            shout = selectors.hootShoutTeamButton;
        else if (to == "user")
            shout = selectors.hootShoutButton13;
        return utils.ensureVisible(shout, apiBrowser).then(function () {
            var shoutText = apiBrowser.element(shout).element(selectors.shoutPanel);
            return utils.hasClass(shoutText, 'shouting');
        })
    }

    api.expectYellowBackground = function (to, apiBrowser) {
        apiBrowser.sleep(apiBrowser.params.devTimeout + 3000);
        to = to || "user";
        apiBrowser = apiBrowser || browser;
        var shout = '';
        if (to == "team")
            shout = selectors.hootShoutTeamButton;
        else if (to == "user")
            shout = selectors.hootShoutButton14;
        return utils.ensureVisible(shout, apiBrowser).then(function () {
            var shoutText = apiBrowser.element(shout).element(selectors.shoutPanel);
            return utils.hasClass(shoutText, 'shout-incoming-call');
        })
    }

    api.verifyOfflineHoot = function(apiBrowser) {
        apiBrowser = apiBrowser || browser;
        browser.sleep(5000);
        var shoutButton = apiBrowser.element(selectors.hootShoutButton13).element(selectors.shoutText);
        return utils.hasClass(shoutButton, 'offline');
    };

    api.verifyOnlineHoot = function(apiBrowser) {
        apiBrowser = apiBrowser || browser;
        browser.sleep(5000);
        var shoutButton = apiBrowser.element(selectors.hootShoutButton13).element(selectors.shoutText);
        return utils.hasClass(shoutButton, 'online');
    };

    api.clickOnBlastGroup = function(){
        var response = [];
        return utils.ensureVisible(selectors.hootShoutButton14).then(function () {
            var starsElement = element(selectors.hootShoutButton14);
            browser.sleep(browser.params.devTimeout);
            starsElement.element(selectors.blastGroup1Button).click().then(function(){
                response.push(utils.hasClass(starsElement.element(selectors.blastGroup1Button), 'active'));
            });
            browser.sleep(browser.params.devTimeout);
            starsElement.element(selectors.blastGroup2Button).click().then(function(){
                response.push(utils.hasClass(starsElement.element(selectors.blastGroup1Button), 'active'));
            });
            browser.sleep(browser.params.devTimeout);
            starsElement.element(selectors.blastGroup3Button).click().then(function(){
                response.push(utils.hasClass(starsElement.element(selectors.blastGroup1Button), 'active'));
            });

            return response;
        })
    }

    api.checkManyUsersShout = function (browserA, browserB){
        var error = 0;
        api.shoutTo13(browserA).then(function (result){
            if (result!=true){
                error++
            }
        })

        api.shoutTo13(browserB).then(function (result){
            if (result!=true){
                error++
            }
        })

        if (error == 0){
            return true;
        }else {
            return false;
        }
    }

    return api;
};
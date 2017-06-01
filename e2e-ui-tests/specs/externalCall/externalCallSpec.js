'use strict';

require('jasmine2-custom-message');
var createDashboardPage = require('../../objects/dashboardPage');
var createLoginPage = require('../../objects/loginPage');
var createRingdownPage = require('../../objects/ringdownPage');
var createExternalCallPage = require('../../objects/externalCallPage');
var createUtils = require('../../helpers/utils');

describe('External Call', function () {

    var dashboardPage = createDashboardPage(browser);
    var loginPage = createLoginPage(browser);
    var ringdownPage = createRingdownPage(browser);
    var externalCallPage = createExternalCallPage(browser);
    var utils = createUtils(browser);
    var browserA;
    beforeAll(function () {
        browser.driver.get(browser.params.baseUrl);
    })

    beforeEach(function () {
        browser.ignoreSynchronization = true;
        browserA = browser.forkNewDriverInstance(true);
        loginPage.multiUserLogin([browserA],[browser.params.users[0], browser.params.users[4]]);
    });

    afterEach(function () {
        utils.clearWindows([browserA]);
        loginPage.logout();
    });

    it('userA call to userB', function () {
        dashboardPage.rebuildNotification(browser);

        externalCallPage.callToUser(browserA).then(function (result) {
            since('call button should be clickable and UI should work').
            expect(result).toEqual(true);
        })

        ringdownPage.acceptCall(browser).then(function (result) {
            since('userB should accept call').
            expect(result).toEqual(true);
        })

        dashboardPage.checkRingNotification("call").then(function(result){
            since('userB should see incoming call notification').
            expect(result).toEqual(true);
        })
    });
});
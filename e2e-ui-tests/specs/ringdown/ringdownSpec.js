'use strict';

require('jasmine2-custom-message');
var createDashboardPage = require('../../objects/dashboardPage');
var createLoginPage = require('../../objects/loginPage');
var createRingdownPage = require('../../objects/ringdownPage');
var createUtils = require('../../helpers/utils');

describe('Ringdown', function () {

    var dashboardPage = createDashboardPage(browser);
    var loginPage = createLoginPage(browser);
    var ringdownPage = createRingdownPage(browser);
    var utils = createUtils(browser);
    var browserA, browserB;

    beforeAll(function () {
        browser.driver.get(browser.params.baseUrl);
    })

    beforeEach(function () {
        browser.ignoreSynchronization = true;
        browserA = browser.forkNewDriverInstance(true);
        browserB = browser.forkNewDriverInstance(true);
        loginPage.multiUserLogin([browserA, browserB], [browser.params.users[0], browser.params.users[2], browser.params.users[1]]);
    });

    afterEach(function () {
        utils.clearWindows([browserA, browserB]);
        loginPage.logout();
    });

    it('user should hide/show ringdown panel', function () {
        since('ringdown panel should not be visible').
        expect(dashboardPage.hideRingdownPanel()).toEqual(true);

        since('ringdown panel should be visible').
        expect(dashboardPage.hideRingdownPanel()).toEqual(false);
    });

    it('userA ringdown userB', function () {
        dashboardPage.rebuildNotification(browser);

        ringdownPage.ringToUser(13, browserA).then(function (result) {
            since('ringdown button should be clickable and UI should work').
            expect(result).toEqual(true);
        })

        ringdownPage.acceptCall(browser).then(function (result) {
            since('userB should accept call').
            expect(result).toEqual(true);
        })

        dashboardPage.checkRingNotification("ring", browser).then(function(result){
            since('userB should see incoming ringdown notification').
            expect(result).toEqual(true);
        })
        ringdownPage.callRelease(browserA).then(function (result) {
            since('userA should release call').
            expect(result).toEqual(true);
        })
    });

    it('userA ringdown userB then userA ringdown userC', function () {
        ringdownPage.ringToUser(13, browserA).then(function (result) {
            since('ringdown button should be clickable and UI should work').
            expect(result).toEqual(true);
        })

        ringdownPage.ringToUser(14, browserA).then(function (result) {
            since('ringdown button should be clickable and UI should work(second user)').
            expect(result).toEqual(true);
        })

        ringdownPage.acceptCall(browser).then(function (result) {
            since('userB should accept call').
            expect(result).toEqual(true);
        })

        ringdownPage.acceptCall(browserB).then(function (result) {
            since('userC should accept call').
            expect(result).toEqual(true);
        })
    });

});
'use strict';

require('jasmine2-custom-message');
var createDashboardPage = require('../../objects/dashboardPage');
var createLoginPage = require('../../objects/loginPage');
var createHootPage = require('../../objects/hootPage');
var createUtils = require('../../helpers/utils');

describe('Hoot', function () {

    var dashboardPage = createDashboardPage(browser);
    var loginPage = createLoginPage(browser);
    var hootPage = createHootPage(browser);
    var utils = createUtils(browser);
    var browserA, browserB;

    beforeAll(function () {
        browser.driver.get(browser.params.baseUrl);
    })

    beforeEach(function () {
        browser.ignoreSynchronization = true;
        browserA = browser.forkNewDriverInstance(true);
        browserB = browser.forkNewDriverInstance(true);
        loginPage.multiUserLogin([browserA, browserB],[browser.params.users[0],browser.params.users[1], browser.params.users[3]])
    });

    afterEach(function () {
        utils.clearWindows([browserA, browserB]);
        loginPage.logout();
    });

    it('user A should shout to user B', function () {
        dashboardPage.rebuildNotification(browser);

        since('outgoing shout button should be clickable').
        expect(hootPage.shoutTo13(browserA)).toEqual(true);

        since('outgoing shout button should be green').
        expect(hootPage.expectGreenButton("user",browserA)).toEqual(true);

        since('incoming shouting button should be yellow').
        expect(hootPage.expectYellowBackground("user", browser)).toEqual(true);

        dashboardPage.checkRingNotification("shout").then(function(result){
            since('userB should see incoming shout notification').
            expect(result).toEqual(true);
        })
    });

    it('user should able to see other users  offline', function () {
        loginPage.logout();
        hootPage.verifyOfflineHoot(browserA).then(function(data) {
            since('cant find user status').
            expect(data).toEqual(true);
        });
        loginPage.login(browser.params.users[0].username, browser.params.users[0].password);
    });

    it('user should able to see other users  online', function () {
        loginPage.logout();
        loginPage.login(browser.params.users[0].username, browser.params.users[0].password);
        hootPage.verifyOnlineHoot(browserA).then(function(data) {
            since('cant find user status').
            expect(data).toEqual(true);
        });

    });

    it('user A should shout to user B via teamhoot', function () {
        since('userA cant go to second page on blast and tabs').
        expect(dashboardPage.clickHootsPage2(browserA)).toEqual(true);

        since('userA outgoing shouting button should be clickable').
        expect(hootPage.shoutToTeam(browserA)).toEqual(true);

        since('userA outgoing shouting button should be green').
        expect(hootPage.expectGreenButton('team', browserA)).toEqual(true);

        since('userB cant go to second page on blast and tabs').
        expect(dashboardPage.clickHootsPage2(browser)).toEqual(true);

        since('userB outgoing shouting button background should be yellow').
        expect(hootPage.expectYellowBackground('team', browser)).toEqual(true);

        since('userB outgoing shouting button should be clickable').
        expect(hootPage.shoutToTeam(browser)).toEqual(true);

        since('userB outgoing shouting button should be green').
        expect(hootPage.expectGreenButton('team', browser)).toEqual(true);

        since('userA outgoing shouting button background should be yellow').
        expect(hootPage.expectYellowBackground('team', browserA)).toEqual(true);
    });

    it('user A stop shout to user B', function () {
        since('outgoing shout button should be clickable').
        expect(hootPage.shoutTo13(browserA)).toEqual(true);

        since('outgoing shout button should be green').
        expect(hootPage.expectGreenButton("user",browserA)).toEqual(true);

        since('outgoing shouting button should be yellow').
        expect(hootPage.expectYellowBackground("user",browser)).toEqual(true)

        since('outgoing shout button should be clickable').
        expect(hootPage.shoutTo13(browserA)).toEqual(true);

        since('outgoing shout button should be green').
        expect(hootPage.expectGreenButton("user",browserA)).toEqual(false);

        since('outgoing shouting button should be yellow').
        expect(hootPage.expectYellowBackground("user",browser)).toEqual(false);
    });

    it('user A should have 2 shout notifications', function () {
        dashboardPage.rebuildNotification(browser);

        since('userB and userC should shout to userA').
        expect(hootPage.checkManyUsersShout(browserA, browserB)).toEqual(true);

        since('should have 2 notifications').
        expect(dashboardPage.checkManyNotification()).toBe(2);
    });

    it('user add/remove to blast group', function () {
            since('should show blast panels').
            expect(dashboardPage.blastAndTabs()).toEqual(true);
            hootPage.clickOnBlastGroup().then(function(response){
                for(var i=0;i<=response.lenght;i++){
                    since('should add user to '+(i+1)+' blast groups').
                    expect(response[i]).toEqual(true);
                }
            })

            hootPage.clickOnBlastGroup().then(function(response){
                for(var i=0;i<=response.lenght;i++){
                    since('should remove user from '+(i+1)+' blast groups').
                    expect(response[i]).toEqual(false);
                }
            })
    });


});
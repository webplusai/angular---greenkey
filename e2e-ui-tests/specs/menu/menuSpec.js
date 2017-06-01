'use strict';

require('jasmine2-custom-message');
var createLoginPage = require('../../objects/loginPage');
var createDashboardPage = require('../../objects/dashboardPage');
var createUtils = require('../../helpers/utils');

describe('Dropdown menu', function() {

    var loginPage = createLoginPage(browser);
    var dashboardPage = createDashboardPage(browser);
    var utils = createUtils(browser);

    beforeAll(function () {
        browser.driver.get(browser.params.baseUrl);
        loginPage.login(browser.params.users[0].username, browser.params.users[0].password);
    })

    beforeEach(function() {
        browser.ignoreSynchronization = true;
    });

    it('user should be able to check user information', function () {

        since('cant open user info').
        expect(dashboardPage.clickMyInfo()).toEqual(true);
        var info = dashboardPage.verifyMyInfo();

        since('cant find user info').
        expect(info[0]).toContain('My Profile');
        since('cant find user name').
        expect(info[1]).toContain('Name');

        since('cant close user info').
        expect(dashboardPage.closeMyInfo()).toEqual(true);
    });

    it('user should be able call to support', function () {

        expect(dashboardPage.callToSupport()).toEqual(true);

    });

    it('user should redirect to ticket page', function() {
        dashboardPage.ticket();
        utils.getBrowserWindow(1).then(function(){
            expect(browser.driver.getCurrentUrl()).toEqual(browser.params.ticketUrl);
        })
        utils.clearWindows();
    });


});

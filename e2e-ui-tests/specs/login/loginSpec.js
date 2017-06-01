'use strict';

/**
 * Created by maheshg on 12/14/15.
 * updated by Nadim on 12/16/15
 * updated by Eric on 5/11/2016.
 */

var createLoginPage = require('../../objects/loginPage');
var createLoginLiterals = require('../../data/loginLiterals');

describe('login page', function() {

  var loginPage = createLoginPage(browser);
  var loginLiterals = createLoginLiterals(browser);


  beforeEach(function() {
    browser.ignoreSynchronization = true;
    browser.driver.get(browser.params.baseUrl);
  });

  /*it('user should be able to login with valid credentials', function () {
    loginPage.navigate();
    expect(browser.getCurrentUrl()).toEqual(browser.params.baseUrl+'login');
    browser.getTitle().then(function (text) {
      expect(text).toEqual(loginLiterals.loginTitle);
    });

    loginPage.login(browser.params.users[0].username, browser.params.users[0].password);
    expect(browser.getTitle()).toEqual(loginLiterals.loginTitle);

  });

  it('user should not be able to login with no credentials', function() {
    loginPage.navigate();

    expect(browser.getCurrentUrl()).toEqual(browser.params.baseUrl+'login');
    browser.getTitle().then(function (text) {
      expect(text).toEqual(loginLiterals.loginTitle);
    });

    loginPage.login('', '');

    expect(browser.getCurrentUrl()).toEqual(browser.params.baseUrl+'login');
    browser.getTitle().then(function (text) {
      expect(text).toEqual(loginLiterals.loginTitle);
    });
  });

  it('user should not be able to login with invalid credentials', function () {

    var password = 'invalidpassword';

    loginPage.navigate();
    expect(browser.getCurrentUrl()).toEqual(browser.params.baseUrl+'login');
    browser.getTitle().then(function (text) {
      expect(text).toEqual(loginLiterals.loginTitle);
    });

    loginPage.login(browser.params.users[0].username, password).then(function(){
      loginPage.getInvalidPasswordText().then(function (text) {
        expect(text).toContain(loginLiterals.loginPasswordError);
      });
    })
  });


  it('user should be able to logout after login', function () {
    loginPage.navigate();

    loginPage.login(browser.params.users[0].username, browser.params.users[0].password);
    loginPage.logout();
    expect(browser.getCurrentUrl()).toEqual(browser.params.baseUrl+'login');

  });

  it('user should have message about force logout', function() {
    expect(loginPage.forceLogout()).toEqual(true);
  });*/

  it('user should redirect to forgot password page', function() {
    expect(loginPage.forgotPswd()).toEqual(browser.params.forgotPswdUrl);
  });

});
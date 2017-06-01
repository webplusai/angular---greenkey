'use strict';

/**
 * Created by maheshg on 12/14/15.
 * updated by Eric Smith on 5/12/16.
 */


var createUtils = require('../helpers/utils');

module.exports = function(browser) {

  var utils = createUtils(browser);


  var api = {};

  var selectors = {
    usernameInput: by.css('input[type="username"]'),
    passwordInput: by.css('input[type="password"]'),
    loginButton: by.css('button[type="submit"]'),
    errorText: by.css('#ngdialog1 .fail_txt'),
    dropdownMenu: by.css('.top-left-menu .dropdown-toggle'),
    logoutButton: by.css('.dropdown-menu .logout'),
    logoutElement: by.css(".top-left-menu"),
    forgotPswdElement: by.css('.form-links a[href="'+browser.params.forgotPswdUrl+'"]'),
    loginFailtureElement: by.css(".login-failure-dialog"),
    forceLoginButton: by.css('.login-failure-dialog button[ng-click="ngDialogData.chooseYes()"]'),
  loutoutConfirmYesButton: by.css('#confirm-dialog button[ng-click="confirm()"]')
  };

  api.selectors = selectors;

  api.navigate = function() {
    return browser.driver.navigate('login');
  };

  api.login = function(username, password, apibrowser) {
    if (apibrowser === undefined) apibrowser = browser;

    apibrowser.driver.manage().window().maximize();
    apibrowser.element(selectors.usernameInput).sendKeys(username);
    apibrowser.sleep(browser.params.devTimeout);
    apibrowser.element(selectors.passwordInput).sendKeys(password);
    apibrowser.sleep(browser.params.devTimeout);
    return apibrowser.element(selectors.loginButton).click();


  };
  api.logout = function() {

    utils.ensureVisible(selectors.logoutElement).then(function(){
      var logoutElement = element(selectors.logoutButton);
    var loutoutConfirmYesButtonElement = element(selectors.loutoutConfirmYesButton);
      element.all(selectors.dropdownMenu).first().click().then(function(){
        browser.sleep(browser.params.devTimeout);
        logoutElement.click().then(function() {
      loutoutConfirmYesButtonElement.click().then(function() {
        browser.sleep(browser.params.devTimeout);
      });
    });
      })
    })

  };
  api.getInvalidLoginText = function() {
    browser.sleep(browser.params.devTimeout);
    utils.ensureElementVisible(element.all(selectors.errorText).first(), browser);
    return element.all(selectors.errorText).first().getText();

  };

  api.getInvalidPasswordText = function() {
    browser.sleep(browser.params.devTimeout+2000);
    utils.ensureElementVisible(element(selectors.loginButton), browser);
    return element(selectors.loginButton).getText();
  };

  api.multiUserLogin = function(browsers,users){
    utils.getBrowserWindow(0).then(function() {
      browser.driver.get(browser.params.loginUrl);
      api.login(users[0].username, users[0].password);
    })
    if (users.length>1)
      for(var i = 1;i<=users.length;i++){
        if(typeof users[i] != 'undefined') {
          (function (data) {
              api.login(data.username, data.password, browsers[i-1]);
          })(users[i]);
        }
      }
  }

  api.loginUserTwo = function(browserUser, username, password) {
    if (username === undefined) username = browserUser.params.username;
    if (password === undefined) password = browserUser.params.password;

    browserUser.element(selectors.usernameInput).sendKeys(username);
    browserUser.sleep(browser.params.devTimeout);
    browserUser.element(selectors.passwordInput).sendKeys(password);
    browserUser.sleep(browser.params.devTimeout);
    return browserUser.element(selectors.loginButton).click();


  };

  api.forgotPswd = function(){
    return utils.ensureVisible(selectors.forgotPswdElement, browser).then(function () {
      var hrefElement = element(selectors.forgotPswdElement);
      browser.sleep(browser.params.devTimeout);
      return hrefElement.click().then(function(){
        return utils.getBrowserWindow(1).then(function(){
          return browser.driver.getCurrentUrl();
        })
      })
    })
  };

  api.forceLogout = function(){
    var secondWindow = browser.forkNewDriverInstance(true);
    return this.login(browser.params.users[0].username, browser.params.users[0].password, browser).then(function(){
      return utils.ensureVisible(selectors.logoutElement, browser).then(function () {
        return api.login(browser.params.users[0].username, browser.params.users[0].password, secondWindow).then(function(){
          return utils.ensureVisible(selectors.loginFailtureElement, secondWindow).then(function(){
            return secondWindow.element(selectors.forceLoginButton).click().then(function(){
              return utils.ensureVisible(selectors.logoutElement, secondWindow);
            })
          })
        })
      })
    })


  }

  return api;
};
'use strict';

/**
 * Created by maheshg on 12/14/15.
 */


var createUtils = require('../helpers/utils');
var createDashBoardLiterals = require('../data/dashBoardLiterals');

module.exports = function(browser) {

  var utils = createUtils(browser);
  var dashBoardLiterals = createDashBoardLiterals();


  var api = {};

  var selectors = {
    dropdownMenu: by.css('.top-left-menu li[title="Open menu"]'),
    blastAndTabsButton: by.css('.top-right-menu li[ng-click="toggleHootsPanel()"]'),
    blastAndTabsElement: by.css('.blast-panel'),
    hootsTabBar: by.css('.hoots-tabbar-wrapper'),
    hootsTabs: by.css('.hoots-tabbar-wrapper .tabs-panel-wrapper li'),
    faqsButton: by.css('.dropdown-menu a span[translate="header.navbar.new.SupportCenter"]'),    
    ticketButton: by.css('#navbar .dropdown-menu li[ng-show="supportURL"] a'),
    guideButton: by.css('.dropdown-menu a span[translate="header.navbar.new.UserGuide"]'),
    chatHideButton: by.css('.top-right-menu li[ng-click="toggleChatPanel()"]'),
    chatElement: by.css('.chat-panel'),
    myInfoButton: by.css('.navbar-header a[ng-click="openMyInfoModal()"]'),
    infoDialog: by.css('.user-profile-wrapper'),
    modalTitle: by.css('.modal-window-title:nth-child(2)'),
    myInfoName: by.css('.form-group:first-child label'),
    closeButton: by.css('.modal-window-close-button'),
    ringdownButton: by.css('.top-right-menu li[ng-click="toggleRingdownsPanel()"]'),
    ringdownElement: by.css('#right-panel #ringdowns-main-container'),
    notifyRingMessage: 'Incoming Call from: "'+browser.params.users[2].ringBtnUserInfo2+'"',
    notifyShoutMessage: browser.params.users[1].ringBtnUserInfo2+' is shouting !',
    notifyElement: by.css('.notification-test'),
    helpButton: by.css('.top-right-menu .help-menu-item'),
    calltoSupportButton: by.css('.top-right-menu a[ng-click="onHelpClicked()"]'),
    releaseCallButton: by.css('.release-calls-wrapper div[ng-click="releaseSelectedCalls()"]'),
    ringPanel: by.css('.calls-wrapper'),
    ringPanelSelectButton: by.css('.calls-wrapper div[ng-click="selectCall()"]'),
    notifyCallMessage: 'Incoming Call from: "'+browser.params.users[4].notiPhoneNumber+'"',
  };

  api.selectors = selectors;

  api.faqs = function() {

    utils.ensureVisible(selectors.dropdownMenu).then(function(){
      var faqsElement = element(selectors.faqsButton);
      element(selectors.dropdownMenu).click().then(function(){
        browser.sleep(browser.params.devTimeout);
        utils.ensureVisible(selectors.faqsButton).then(function(){
          faqsElement.click();
        })
      })
    })

  };

  api.ticket = function() {

    utils.ensureVisible(selectors.helpButton).then(function () {
      element(selectors.helpButton).click();
      browser.sleep(browser.params.devTimeout*10);
      var ticketElement = element(selectors.ticketButton);
      utils.ensureVisible(selectors.ticketButton).then(function(){
         ticketElement.click();
      });
    });

  };

  api.guide = function() {

    utils.ensureVisible(selectors.dropdownMenu).then(function(){
      var guideElement = element(selectors.guideButton);
      element(selectors.dropdownMenu).click().then(function(){
        browser.sleep(browser.params.devTimeout);
        utils.ensureVisible(selectors.guideButton).then(function(){
          guideElement.click();
        })
      })
    })

  };

  api.blastAndTabs = function() {

    return utils.ensureVisible(selectors.dropdownMenu).then(function () {
      var blastAndTabsElement = element(selectors.blastAndTabsButton);
      return element(selectors.dropdownMenu).click().then(function () {
        browser.sleep(browser.params.devTimeout);
        blastAndTabsElement.click();
        return utils.ensureElementVisible(element(selectors.blastAndTabsElement));
      })
    })

  };

  api.clickHootsPage2 = function(apiBrowser) {
    apiBrowser = apiBrowser || browser;

    return utils.ensureVisible(selectors.hootsTabBar, apiBrowser).then(function () {
      apiBrowser.sleep(apiBrowser.params.devTimeout);
      apiBrowser.element.all(selectors.hootsTabs).then(function (el){ return el[1].click();});
      return true;
    })

  };

  api.hideChat = function() {

    browser.sleep(browser.params.devTimeout);
    return utils.ensureVisible(selectors.chatHideButton).then(function () {
      var chatButton = element(selectors.chatHideButton);
      return chatButton.click().then(function(){
        return utils.hasClass(element(selectors.chatElement),'ng-hide');
      })

    })

  };

  api.clickMyInfo = function() {

    return utils.ensureVisible(selectors.dropdownMenu).then(function () {
      element(selectors.dropdownMenu).click();
      browser.sleep(browser.params.devTimeout);
      element(selectors.myInfoButton).click();
      return true;
    })

  };

  api.verifyMyInfo = function(){
    var response = [];
    browser.sleep(browser.params.devTimeout);
    var pElement = element(selectors.infoDialog);
    var text = pElement.element(selectors.modalTitle).getText();
    response.push(text);
    var text = pElement.element(selectors.myInfoName).getText();
    response.push(text);
    return response;

  };

  api.closeMyInfo = function(){
    return utils.ensureVisible(selectors.closeButton).then(function () {
      browser.sleep(browser.params.devTimeout);
      element(selectors.closeButton).click();
      return true;

    })

  };

  api.hideRingdownPanel = function() {

    return utils.ensureVisible(selectors.ringdownButton).then(function () {
      var ringdownButton = element(selectors.ringdownButton);
      browser.sleep(browser.params.devTimeout);
      return ringdownButton.click().then(function(){
        browser.sleep(browser.params.devTimeout);
        return utils.hasClass(element(selectors.ringdownElement),'ng-hide');
      })
    })
  };

  api.rebuildNotification = function(apiBrowser) {
    apiBrowser = apiBrowser || browser;
    apiBrowser.executeScript(rebuildNotification);
  };

  api.checkRingNotification = function(type, apiBrowser) {
    apiBrowser = apiBrowser || browser;
    type = type || "ring";
    var message;
    if (type == "ring"){
      message = selectors.notifyRingMessage;
    }else if(type == "shout"){
      message = selectors.notifyShoutMessage;
    }else if(type == "call"){
      message = selectors.notifyCallMessage;
    }
    apiBrowser.sleep(browser.params.devTimeout+3000);
    return apiBrowser.element(selectors.notifyElement).getText().then(function(text){
      if (text == message){
        return true
      }else {
        return text+"!="+message;
      }
    });

  };

  api.checkManyNotification = function() {
    browser.sleep(browser.params.devTimeout+5000);
    var counter = browser.element.all(selectors.notifyElement).count();
    return counter;
  };

  api.callToSupport = function () {
    return utils.ensureVisible(selectors.helpButton).then(function () {
      element(selectors.helpButton).click();
      browser.sleep(browser.params.devTimeout*10);
      element(selectors.calltoSupportButton).click();
      browser.sleep(browser.params.devTimeout);
      return utils.ensureVisible(selectors.ringPanel).then(function () {
        element(selectors.ringPanelSelectButton).click();
            browser.sleep(browser.params.devTimeout);
            element(selectors.releaseCallButton).click();
            browser.sleep(browser.params.devTimeout);
            return true;
      });
    });
  };

  return api;
};

function rebuildNotification() {
  $('body').append('<script>' +
      'Notification = function(string,object)' +
      '{' +
      '$("body").append(\'<div class="notification-test">\'+object.body+\'</div>\');' +
      '}</script>')
  Notification.permission = 'granted';
}

'use strict';

var HtmlReporter = require('protractor-jasmine2-html-reporter');
var SpecReporter = require('jasmine-spec-reporter');

exports.config = {

  multiCapabilities: [
    {
      browserName: 'chrome',
      chromeOptions:{
        prefs: {
          'profile.managed_default_content_settings.geolocation': 1,
          'media.default_audio_capture_device': 1,
          'profile.managed_default_content_settings.notifications': 1,
          'profile.managed_default_content_settings.media_stream':1
        }
      },
      shardTestFiles: true,
      maxInstances: 1
    },
  ],

  allScriptsTimeout: 40000,
  getPageTimeout: 40000,

  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 80000,
    includeStackTrace: true,
    isVerbose: true
  },

  seleniumAddress: 'http://localhost:4444/wd/hub',

  framework: 'jasmine2',

  specs: ['specs/menu/menuSpec.js'],

  onPrepare: function() {

    var today = new Date(),
        timeStamp = today.getMonth() + 1 + '_' + today.getDate() + '_' +
            today.getFullYear() + '_' + today.getHours() + 'h_' + today.getMinutes() +'m';
    jasmine.getEnv().addReporter(new SpecReporter({displayStacktrace: true}));
    browser.driver.manage().window().maximize();
    jasmine.getEnv().addReporter(new HtmlReporter({
      savePath: './reports/automation_' + timeStamp,
      takeScreenshots: false,
      takeScreenshotsOnlyOnFailures: true,
      consolidateAll: true,
      filePrefix: 'e2e_Results_' + timeStamp + '.html'
    }));
  },

  params: {
    baseUrl: 'https://test.web.tradervoicebox.com/',
    loginUrl: 'https://test.web.tradervoicebox.com/login',
    forgotPswdUrl: "https://test.tradervoicebox.com/#/login/forgot/",
    faqUrl: 'https://greenkey.desk.com/',
    ticketUrl: 'http://greenkeytech.com/vb-support/',
    guideUrl: 'http://pdf.greenkeytech.com/GKT_Trader_Voice_Box_User_Guide.pdf',
    users: [
      {
        username: 'AmsLite21',
        password: 'N3wGKTp@$$',
        uid: "6115ab3a-97c3-4861-8d8e-0e7140ce8570",
        shoutBtnUserInfo : 'GKT: fed lite13',
        ringBtnUserInfo: 'GKT: fed lite13',
        ringBtnUserInfo2: 'fed lite13',
        hootTeam: "autotestteamhoot_none_fake_uid",
        phoneNumber: "1 (225) 800-1140"
      },
      {
        username: 'FedLite14',
        password: 'N3wGKTp@$$',
        uid: "4148bb45-a0d2-4323-ab83-56602c94ba57",
        ringBtnUserInfo: 'GKT: fed lite14',
        ringBtnUserInfo2: 'fed lite14',
        hootTeam: "autotestteamhoot_none_fake_uid"
      },
      {
        username: 'FedLite15',
        password: 'N3wGKTp@$$',
        uid: '',
        ringBtnUserInfo: 'GKT: fed lite15',
        ringBtnUserInfo2: 'fed lite15'
      },
      {
        username: 'FedLite12',
        password: 'N3wGKTp@$$',
        uid: "8c0326b4-96f3-4e3c-9eb7-ed198435ff7f",
        ringBtnUserInfo: 'GKT: fed lite12',
        ringBtnUserInfo2: 'fed lite12',
      },
      {
        username: 'FedLite16',
        password: 'N3wGKTp@$$',
        uid: '',
        ringBtnUserInfo: 'GKT: fed lite16',
        ringBtnUserInfo2: 'fed lite16',
        phoneNumber: "1 (225) 800-1149",
        notiPhoneNumber: "+12258001149"
      }
    ],
    apiTimeout: 200000,
    /*Timeout variable for pausing tests*/
    devTimeout: 1500
  },
};


(function() {
  'use strict';

  var _spinnerTemplate =
    '<span us-spinner="{radius:30, width:8, length: 16}" spinner-key="spinner-1" spinner-start-active="true"></span>';

  // Declare app level module which depends on views, and components
  angular.module('gkt.voiceBox', [
      'ngRoute',
      'ngDialog',
      'ngCookies',
      'ui.bootstrap',
      'gkt.voiceBox.templates',
      'ngStorage',
      'btford.socket-io',
      'pascalprecht.translate',
      'uiSwitch',
      'gkt.voiceBox.connection',
      'gkt.voiceBox.login',
      'gkt.voiceBox.register',
      'gkt.voiceBox.header',
      'gkt.voiceBox.dashboard',
      'gkt.voiceBox.services',
      'gkt.voiceBox.common',
      'gkt.voiceBox.hotkeys',
      'gkt.voiceBox.base',
      'gkt.voiceBox.sdk',
      'gkt.voiceBox.checkUpdate',
      'gkt.voiceBox.chatLog'
    ])
    .config(['$routeProvider', function($routeProvider) {
      $routeProvider
        .when('/', {
          template: _spinnerTemplate,
          controller: ['$location', 'authService', function($location, authService) {
            $location.path(authService.isLoggedIn() ? '/dashboard' : '/login');
          }]
        })
        .when('/login', {
          template: '<login></login>'
        })
        .when('/register', {
          template: '<register></register>'
        })
        .when('/linkedin-login', {
          template: _spinnerTemplate,
          controller: ['OAuthLoginService', function(OAuthLoginService) {
              OAuthLoginService.forLinkedIn().handleAuthorized();
          }]
        })
        .when('/tt-login', {
          template: _spinnerTemplate,
          controller: ['OAuthLoginService', function(OAuthLoginService) {
            OAuthLoginService.forTT().handleAuthorized();
          }]
        })
        .when('/dashboard', {
          templateUrl: '/partials/dashboard.html',
          controller: 'DashboardController'
        })
        .when('/voice-confirmation', {
          templateUrl: '/partials/voiceAuth.html',
          controller: 'VoiceAuthController'
        })
        .when('/unsupported', {
          templateUrl: '/partials/unsupportedBrowser.html',
          controller: ['$scope', 'commonConstants', function($scope, commonConstants) {
            $scope.openFinConfigURL = commonConstants.APP.openFinConfigURL;
          }]
        })
        .when('/unavailable', {
          templateUrl: '/partials/networkUnavailable.html',
          controller: ['$scope', '$http', 'commonConstants', function($scope, $http) {
            $scope.tryToReloadPage = function() {
              $http({
                method: 'HEAD',
                url: '/'
              }).then(function() {
                // load login page if network is available again
                window.location.href = '/login';
              });
            };
          }]
        });
          /*
        .otherwise({
          template: _spinnerTemplate
        }); */
    }])


    .config(function($localStorageProvider, $locationProvider) {
      $localStorageProvider.setKeyPrefix('vbw');
      $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
      });
    })


    // Configs for translate plugin:
    .config(['$translateProvider', function ($translateProvider) {
      $translateProvider.useStaticFilesLoader({
        prefix: 'assets/translations/',
        suffix: '.json'
      });

      $translateProvider.preferredLanguage('en-US');
      $translateProvider.useCookieStorage();
      $translateProvider.useSanitizeValueStrategy('escaped');
    }])

    .run(function($rootScope, authService, $location, $window, tvbUIState, commonConstants, SymphonyService,
                  HotkeysService, VolumeMeterService, BrowserDetectService, VersionMonitorService,
                  Notifications, JsMediaQueryService, OpenFinResizeService) {


      if (!BrowserDetectService.isSupportedBrowser()) {
        $location.path('/unsupported');
        return;
      }

      if(!VersionMonitorService.checkVersion())
        return;

      OpenFinResizeService.initialize();

      $rootScope.$on('$routeChangeStart', function(event) {
        var path = $location.path();

        // disable redirect from page for network issues
        if (path === '/unavailable') {
          return;
        }

        // routes which require user to be authorized
        var AUTH_REQUIRED = ['/dashboard',
          // TODO just for demo
          '/voice-confirmation'];

        // if user requests restricted page without being authorized, redirect him to login
        if(_.includes(AUTH_REQUIRED, path) && !authService.isLoggedIn()) {
          $location.path('/login');
          return;
        }

        // in the opposite, if authorized user requests not-restricted page,
        // redirect him to dashboard
        if (!_.includes(AUTH_REQUIRED, path) && authService.isLoggedIn()) {
          event.preventDefault();
          $location.path('/dashboard');
        }
      });

      HotkeysService.init();
      VolumeMeterService.init();
      Notifications.init();

      // JS media query is used instead of CSS, because Media Query is not
      // the best solution for responsiveness and mobile devices.
      // We can later use some lib like Modernizer to detect an environment.
      JsMediaQueryService.watchCompactMode();

      JsMediaQueryService.watchWideMode();

      SymphonyService.init();
    })

    .value('tvbUIState', {
      leftPanelVisible: true,
      rightPanelVisible: true,
      ringdownsPanelVisible: true,
      hootsPanelVisible: true,
      settingsVisible: false,
      wideScreenMode: true,
      phonePanelVisible: true,
      page: {
        hootsOnPage: 8,
        ringdownsOnPage: 8
      },
      idle: false,
      compactMode: false,
      symphonyMode: false,
      darkTheme: false,
      helpEnabled: false
    })

    .controller('applicationController', function ($scope, tvbUIState, commonConstants, GKT) {
      $scope.uiState = tvbUIState;

      // Update properties when /provision is fetched.
      GKT.addConfiguredListener(function() {
        $scope.uiState.phonePanelVisible = GKTConfig.getBoolean(commonConstants.CONFIG_PROPS.phone_panel_visible, true);
      });
    })

    .run(['$rootScope', 'BrowserDetectService', 'CallManager', function($rootScope, BrowserDetectService, CallManager) {
      window.addEventListener('beforeunload', function tearDown() {
      // Updating the hoots shout status before leaving.
        CallManager.muteAllHoots();

        // destroy root scope to emit corresponding event
        $rootScope.$destroy();

        // "return null" causes leave page message in IE without text
        if (!BrowserDetectService.isIe()) {
          return null;
        }
      }, false);
    }])

;

})();

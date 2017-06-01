(function() {
  'use strict';
  angular.module('openFinIntegration',
    [
      'ngSanitize',
      'ngRoute',
      'angularSpinner',
      'ui.bootstrap',
      'gkt.voiceBox.common.constants',
      'gkt.voiceBox.common.paging',
      'gkt.voiceBox.openFin.intercom',
      'gkt.voiceBox.openFinTemplates'
    ],
    function($provide) {
      $provide.decorator('$sniffer', function($delegate) {
        $delegate.history = false;
        return $delegate;
      });
    })

    .config(['$routeProvider', function($routeProvider) {
      $routeProvider
        .when('/hoots-panel', {
          template: '<torn-panel title="SHOUTS" is-hoots="true"></torn-panel>'
        })
        .when('/ringdowns-panel', {
          template: '<torn-panel title="RINGDOWNS" is-hoots="false"></torn-panel>'
        })
        .when('/torn-hoot', {
          template: '<torn-hoot></torn-hoot>'
        })
        .when('/torn-call', {
          template: '<torn-call></torn-call>'
        })
        .when('/torn-ringdown', {
          template: '<torn-ringdown></torn-ringdown>'
        })
        .when('/torn-chat', {
          template: '<torn-chat></torn-chat>'
        }).when('/tabbed-chat', {
          template: '<tabbed-chat></tabbed-chat>'
        })
        .when('/preloader', {
          template: '<preloader></preloader>'
        })
        .when('/chat-log', {
          template: '<chat-log-panel></chat-log-panel>'
        })
        .otherwise({
          template: 'Not found'
        });
    }]);
})();
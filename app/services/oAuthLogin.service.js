(function() {
  'use strict';
  angular.module('gkt.voiceBox.services')
    .service('OAuthLoginService',
      ['$location', '$localStorage', 'authService', OAuthLoginService]);

  function OAuthLoginService($location, $localStorage, authService) {

    // private fields
    var OAUTH_SOURCES = {
      LinkedIn: {
        stateKey: 'linkedinState',
        authorizationUrl: 'https://www.linkedin.com/uas/oauth2/authorization',
        callbackRoute: '/linkedin-login',
        loginDataClass: LinkedInLoginData,
        addAuthorizationParams: function(params) {
          _.assign(params, {
            client_id: GKTAppConfig.linkedInClientId
          });
          return params;
        }
      },
      TT: {
        stateKey: 'ttState',
        authorizationUrl: 'https://id-uat.tradingtechnologies.com/oauth/authorize',
        callbackRoute: '/tt-login',
        loginDataClass: TTLoginData,
        addAuthorizationParams: function(params) {
          _.assign(params, {
            client_id: GKTAppConfig.ttClientId,
            scope: 'profile'
          });
          return params;
        }
      }
    };

    // public fields
    this.source = null;
    this.SOURCES = {
      LinkedIn: 'LinkedIn',
      TT: 'TT'
    };

    // public methods
    this.useFor = function(source) {
      if(source in OAUTH_SOURCES) {
        this.source = OAUTH_SOURCES[source];
        return this;
      }

      throw new Error("Unknown OAuth source");
    };

    this.forLinkedIn = function() {
      return this.useFor(this.SOURCES.LinkedIn);
    };

    this.forTT = function() {
      return this.useFor(this.SOURCES.TT);
    };

    this._terminateIfNoSource = function() {
      if (this.source === null)
        throw new Error("No OAuth source is set");
    };

    this.getAuthorizationUrl = function() {
      this._terminateIfNoSource();

      $localStorage[this.source.stateKey] = this.source.stateKey + Math.random() * 1000000 + 1000000;

      return this.source.authorizationUrl + '?' + $.param(this.source.addAuthorizationParams({
          response_type: 'code',
          redirect_uri: _getRedirectUri(this.source.callbackRoute),
          state: $localStorage[this.source.stateKey]
        }));
    };

    this.handleAuthorized = function() {
      this._terminateIfNoSource();

      var stateKey = this.source.stateKey;

      function _cleanupAndGoTo(path) {
        if ($localStorage[stateKey])
          delete $localStorage[stateKey];
        $location.search({});
        $location.path(path);
      }

      if (!$localStorage[stateKey]) {
        _cleanupAndGoTo('/login');
        return;
      }

      var params = $location.search();
      // if user is not logged in and it is oauth happening
      if (!authService.isLoggedIn() && params.code && params.state &&
          $localStorage[stateKey] && $localStorage[stateKey] === params.state) {

        var loginData = new this.source.loginDataClass(
          params.code, _getRedirectUri(this.source.callbackRoute), true);

        authService.oAuthLogin(loginData).then(function() {
          _cleanupAndGoTo('/dashboard');
        }).catch(function() {
          _cleanupAndGoTo('/login');
          $location.search('reason', 'oauthFailed');
        });
      }
      // otherwise it's just an obsolete linkedInState
      else {
        _cleanupAndGoTo('/login');
      }
    };

    // private methods
    function _getRedirectUri(callbackRoute) {
      return $location.protocol() + '://' + $location.host() +
        ($location.port() ? ':' + $location.port() : '') + callbackRoute;
    }
  }
})();
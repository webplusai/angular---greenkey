(function() {
  'use strict';
  angular.module('gkt.voiceBox.login')
      .factory('authService', authFactory);

  function authFactory(GKT) {

    function _login(loginData) {
      return GKT.login(loginData);
    }

    return {
      login : function(user, pwd, boolKickOthers) {
        return _login(new SimpleLoginData(user, pwd, boolKickOthers));
      },

      oAuthLogin: function(loginData) {
        return _login(loginData);
      },

      restoreAuthData: GKT.restoreSession,
      logout : GKT.logout,
      isLoggedIn: GKT.isLoggedIn
    };
  }
})();

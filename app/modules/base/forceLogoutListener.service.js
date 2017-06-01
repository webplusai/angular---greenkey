(function() {
	'use strict';

	function addForceLogoutListeners(authService, $location, commonConstants, GKT) {

		// sometimes these listeners could be registered too late - i.e. when the signal for logging out 
		// was already sent; it could happen e.g. when user has expired session
		if (GKT.getProperty('isForcedToLogout')) {
			return forceUserToLogout(commonConstants.GKT.FORCE_LOGOUT_REASONS.session_expired);
		}

		GKT.addForceLogoutListener(function (reason) {
			authService.logout().then(function () {
				forceUserToLogout(reason);
			});
		});

		function forceUserToLogout(reason) {
			$location.path('/login');
			$location.search('reason', reason || commonConstants.GKT.FORCE_LOGOUT_REASONS.unexpected_error);
		}
	}

	angular.module('gkt.voiceBox.base').run(['authService', '$location', 'commonConstants', 'GKT', addForceLogoutListeners]);
})();
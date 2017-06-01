(function () {
    'use strict';

    angular.module('gkt.voiceBox.login')
        .directive('login', ['$location', '$localStorage', 'commonConstants', loginDirective]);

    function loginDirective($location, $localStorage, constants) {
        return {
            restrict: 'E',
            replace: true,
            scope: {},
            templateUrl: '/partials/login.html',
            controller: loginCtrl,
            controllerAs: 'loginCtrl',
            link: function ($scope) {
                var params = $location.search(),
                    reason = params.reason || $localStorage[constants.APP.last_logout_reason];

                reason && $scope.openDialog(reason);
                delete $localStorage[constants.APP.last_logout_reason];
            }
        };
    }

    function loginCtrl($scope, authService, $location, ngDialog, $window, tvbUIState, usSpinnerService, $localStorage,
                       commonConstants, BrowserDetectService, $http, OAuthLoginService, $sessionStorage) {
        'ngInject';
        $scope.user = {};
        $scope.loginText = 'LOGIN.LOGIN';
        $scope.disabled = false;
        $scope.tvcUrl = GKTAppConfig.tvcUrl;
        $scope.openFinConfigURL = commonConstants.APP.openFinConfigURL;
        $scope.isOpenFin = BrowserDetectService.isOpenFin();

        function oAuthLogin(getRedirectUrl) {
            if ($scope.disabled)
                return;

            // it needs to store current symphony mode state now because after a couple redirects
            // it wouldn't be available to determine if application was running in symphony mode or not
            $localStorage[commonConstants.APP.symphonyModeVarName] = tvbUIState.symphonyMode;

            var url = getRedirectUrl();
            $window.location.href = url;
        }

        $scope.linkedinLogin = oAuthLogin.bind(this, function() {
            return OAuthLoginService.forLinkedIn().getAuthorizationUrl();
        });

        $scope.ttLogin = oAuthLogin.bind(this, function() {
            return OAuthLoginService.forTT().getAuthorizationUrl();
        });

        $scope.login = function () {
            if (!$scope.disabled) {
                $scope.loginImpl($scope.user.username, $scope.user.password, false);
            }
        };

        $scope.loginImpl = function (username, password, boolKickOthers) {
            // username and password are required
            if (!username || !password) {
                $scope.disabled = false;
                $scope.user.usernameWrong = !username;
                $scope.user.passwordWrong = !password;
                $scope.user.error = true;
                $scope.loginText = 'Username and password are required.';
                return;
            }
            $scope.disabled = true;

            usSpinnerService.spin('spinner-1');
            authService.login(username, password, boolKickOthers)
                .then(function (config) {
                    delete $sessionStorage[commonConstants.APP.disable_overlay_flag];
                    $scope.disabled = false;
                    usSpinnerService.stop('spinner-1');
                    var needVoiceAuth =
                      GKTConfig.getBoolean('tvb.web.VOICE_AUTHORIZATION', false);
                    $location.path(needVoiceAuth ?
                      '/voice-confirmation' :
                      '/dashboard');
                    
                })
                .catch(function (error) {
                        console.error("Auth failed");
                        console.error(error);
                        usSpinnerService.stop('spinner-1');
                        $scope.disabled = false;

                        $scope.user.password = '';
                        if (error instanceof TVCDuplicateLoginError) {
                            $scope.storedUser = username;
                            $scope.storedPassword = password;
                            $scope.openDialog('activeUser');
                        } else if (error instanceof TVCWrongUserName) {
                            $scope.user.usernameWrong = true;
                            $scope.user.passwordWrong = false;
                            $scope.user.error = true;
                            $scope.loginText = 'Username is wrong. Please try again';
                        } else if (error instanceof TVCWrongPassword) {
                            $scope.user.usernameWrong = false;
                            $scope.user.passwordWrong = true;
                            $scope.user.error = true;
                            $scope.loginText = 'Password is wrong. Please try again';
                            //$scope.openWrongPasswordDialog();
                        } else if (error instanceof TVCLoginDisabledOnCluster) {
                            $scope.user.usernameWrong = false;
                            $scope.user.passwordWrong = false;
                            $scope.user.error = true;
                            $scope.loginText = 'User is not on supported cluster.';
                            //$scope.openWrongPasswordDialog();
                        } else if (error instanceof TVCIPBlocked) {
                            $scope.user.usernameWrong = false;
                            $scope.user.passwordWrong = false;
                            $scope.user.error = true;
                            $scope.loginText = 'Your IP address is blocked';
                        } else {
                            console.error("Login failed: ", error);
                            $scope.user.usernameWrong = false;
                            $scope.user.passwordWrong = false;
                            $scope.user.error = true;
                            $scope.loginText = 'Login failed';
                            $scope.openDialog(error);
                        }
                    });
        };

        $scope.resetErrors = function() {
            if ($scope.user.error) {
                $scope.user.usernameWrong = $scope.user.passwordWrong = $scope.user.error = false;
                $scope.loginText = 'LOGIN.LOGIN';
            }
        };

        // Dialogs
        var dialogHolder;
        var closeDialog = function() {
            if(dialogHolder) {
                dialogHolder.close();
                dialogHolder = undefined;
            }
            $location.search({});
        };

        function closeForceLogoutDialog() {
            closeDialog();
            $localStorage[commonConstants.APP.symphonyModeVarName] = tvbUIState.symphonyMode;
            $window.location.reload();
        }

        /* TODO: MOVE ALL THIS DIALOG TEXTS TO THE TRANSLATION FILES */

        var INFO_DIALOGS = {
            /*jshint multistr: true */
            'activeUser': {
                title: 'Login Failure',
                text: 'Your username is currently online at another location.\
                Your username may only login from one PC at a time.\
                Click Yes to force the other location offline. Click No to set this location offline.',
                yesNoDialog: true,
                closeDialog: closeDialog,
                chooseYes: function() {
                    closeDialog();
                    $scope.loginImpl($scope.storedUser, $scope.storedPassword, true);
                },
                chooseNo: closeDialog
            },
            'oauthFailed': {
                title: 'OAuth login failed',
                text: 'Sorry, something went wrong during the login process.',
                closeDialog: closeDialog
            }
        };
        // audio record permissions denied
        INFO_DIALOGS[commonConstants.GKT.APP_EVENTS.webrtc_logout] = {
            title: 'No audio device detected',
            text: [
                'Sorry, Green Key cannot access your microphone. Please, make sure that device is plugged in and microphone access is allowed for this page.',
                'Please, read this guide if you are not sure how to allow microphone access: <a target="_blank" href="https://support.google.com/chrome/answer/2693767?hl=en">https://support.google.com/chrome/answer/2693767?hl=en</a>',
                'You can also watch this video guide: <a target="_blank" href="https://www.youtube.com/watch?v=oj7bTQhOD_4">https://www.youtube.com/watch?v=oj7bTQhOD_4</a>'
            ].join('<br>'),
            reasonToContact: 'if you require assistance',
            closeDialog: closeDialog
        };
        // TVC session is expired
        INFO_DIALOGS[commonConstants.GKT.FORCE_LOGOUT_REASONS.session_expired] = {
            title: 'Forced Logout',
            text: 'Your session is expired. Please log in again.',
            closeDialog: closeForceLogoutDialog
        };
        // account is in use on another device
        INFO_DIALOGS[commonConstants.GKT.FORCE_LOGOUT_REASONS.duplicate_login] = {
            title: 'Forced Logout',
            text: 'You have been forced to logout because your account is in use on another device.',
            closeDialog: closeForceLogoutDialog
        };
        // user was kicked by administrator
        INFO_DIALOGS[commonConstants.GKT.FORCE_LOGOUT_REASONS.kicked_by_admin] = {
            title: 'Forced Logout',
            text: 'You have been forced to logout by administrator.',
            closeDialog: closeForceLogoutDialog
        };
        // connection is lost
        INFO_DIALOGS[commonConstants.GKT.FORCE_LOGOUT_REASONS.network_error] = {
            title: 'Forced Logout',
            text: 'Sorry, Green Key is not available now.',
            closeDialog:   function() {
                closeDialog();
                $localStorage[commonConstants.APP.symphonyModeVarName] = tvbUIState.symphonyMode;
                // to prevent showing browser's (or openfin's) internal error page
                // we need to check if the network is available before page reload
                $http({
                    method: 'HEAD',
                    url: '/',
                    // By default browser returns response for such requests from cache.
                    // It's not suitable for checking network availability.
                    params: {
                        no_cache: Date.now()
                    }
                }).then(
                    function successCallback() {
                        $window.location.reload();
                    },
                    function errorCallback() {
                        console.log('network is unavailable');
                        $location.path('/unavailable');
                    }
                );
            }
        };
        // Some unexpected application error
        INFO_DIALOGS[commonConstants.GKT.FORCE_LOGOUT_REASONS.unexpected_error] = {
            title: 'Forced Logout',
            text: 'An unexpected error occured. Please try to log in again.',
            closeDialog: closeForceLogoutDialog
        };


        $scope.openDialog = function(code) {
            var dialogData = INFO_DIALOGS[code];

            if (dialogData) {
                // add default reason to contact support
                if (!dialogData.reasonToContact) {
                    dialogData.reasonToContact = 'for help resolving this issue';
                }

                dialogHolder = ngDialog.open({
                    template: 'loginFailedDialog',
                    closeByEscape: false,
                    closeByDocument: false,
                    data: dialogData
                });
            }
        };


        $scope.goToRegisterPage = function() {
            $location.path('/register');
        };
    }

})();

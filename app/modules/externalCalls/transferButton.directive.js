(function () {
    'use strict';

    angular.module('gkt.voiceBox.activeCalls')
            .directive('transferButton', function () {
                return {
                    restrict: 'E',
                    scope: {},
                    controller: [
                        '$scope',
                        '$rootScope',
                        'ngDialog',
                        'commonConstants',
                        transferButtonController
                    ],
                    templateUrl: '/partials/ringdowns/transferButton.html',
                    replace: true
                };
            });

    function transferButtonController($scope, $rootScope, ngDialog, commonConstants) {

        $scope.selectedCalls = {};

        $rootScope.$on(commonConstants.UI_EVENTS.active_call_selected, function (event, call) {
            $scope.selectedCalls[call.uid] = call;
        });

        $rootScope.$on(commonConstants.UI_EVENTS.active_call_unselected, function (event, call) {
            $scope.selectedCalls = _.omit($scope.selectedCalls, call.uid);
        });

        $scope.getSingleSelectedSession = function () {
            if (Object.keys($scope.selectedCalls).length !== 1)
                return undefined;
            // only one selected call
            for (var c in $scope.selectedCalls) {
                if ($scope.selectedCalls.hasOwnProperty(c))
                    return $scope.selectedCalls[c].session;
            }
        }

        $scope.disabled = function () {
            var session = $scope.getSingleSelectedSession();
            if (session === undefined)
                return true;
            return false;
        }

        $scope.transfer = function () {

            var dialog = ngDialog.open({
                className: 'modal-window-wrapper',
                template: '<active-call-transfer></active-call-transfer>',
                plain: true,
                closeByEscape: false,
                closeByNavigation: true,
                closeByDocument: true
            });

            dialog.closePromise.then(
                    function (data) {
                        if (data.value === 'cancel')
                            return;
                        var session = $scope.getSingleSelectedSession();
                        if (session === undefined)
                            return;
                        SipManager.transfer(session, data.value);
                    }
            );
        };
    }

})();

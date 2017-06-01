(function () {
    'use strict';

    angular.module('gkt.voiceBox.common')
            .directive('activeCallTransfer', function () {
                return {
                    restrict: 'E',
                    replace: true,
                    controller: [
                        '$scope',
                        'ngDialog',
                        '$element',
                        'CallManager',
                        activeCallTransferCtrl
                    ],
                    scope: {
                        preset: '='
                    },
                    templateUrl: '/partials/activeCalls/activeCallTransfer.html'
                };
            });


    function activeCallTransferCtrl($scope, ngDialog, $element, CallManager) {

        $scope.contacts = [];

        $scope.closeThisDialog = function () {
            ngDialog.close("", "cancel");
        }

        $scope.submitForm = function (contact) {
            ngDialog.close("", contact.sip);
        }

        $scope.getSIPTarget = function (connection) {
            try {
                var phone = connection.contact.phone_numbers.international;
                var realm = connection.SIP.getSessionInfo().sipWsUrl;
                // cannot proceed without these
                if (phone === null || realm === null)
                    return undefined;

                var company = connection.contact.company;
                var name = connection.contact.display_name;
                var bPos = realm.indexOf('/') + 2;
                var ePos = realm.indexOf(':', bPos);
                var sip = 'sip:' + phone + '@' + realm.substring(bPos, ePos);

                return {
                    company: company,
                    name: name,
                    sip: sip
                };
            } catch (e) {
                return undefined;
            }
        }

        $scope.init = function () {
            CallManager.getRingdownConnections().then(function (ringdowns)
            {
                _.find(ringdowns, function (item) {
                    var target = $scope.getSIPTarget(item);
                    if (target !== undefined)
                        $scope.contacts.push($scope.getSIPTarget(item));
                    return false;
                })
            })
        }

        $scope.init();
    }

})();

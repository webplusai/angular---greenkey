(function () {
    'use strict';

    angular.module('gkt.voiceBox.common')
            .directive('cmeTradeCapture', function () {
                return {
                    restrict: 'E',
                    replace: true,
                    controller: [
                        '$scope',
                        'ngDialog',
                        '$element',
                        'TradeCaptureHelper',
                        cmeTradeCaptureCtrl
                    ],
                    scope: {
                        preset: '='
                    },
                    templateUrl: '/partials/demo/cmeTradeCapture.html'
                };
            });


    function cmeTradeCaptureCtrl($scope, ngDialog, $element, TradeCaptureHelper) {

        $scope.formData = {};

        $scope.tradeTypes = [
            {name: "Block Trade"},
            {name: "EFP"},
            {name: "EFR"},
            {name: "OPNT"},
            {name: "OTC"},
            {name: "Block Swap"}
        ];

       $scope.clearing = [
            {id: "666", name: "Demo Clearing LLC"},
            {id: "072", name: "Goldman, Sachs & Co"}
        ];

        $scope.exch = [
            {exch: "NYMEX"},
            {exch: "COMEX"},
            {exch: "CBT"},
            {exch: "CME"}
        ];

        $scope.prod = [
            {prod: "CL"},
            {prod: "GC"},
            {prod: "ES"}
        ];

        $scope.multiplier = {
            "CL": {multiplier: 1000},
            "GC": {multiplier: 100},
            "ES": {multiplier: 50}
        };

        $scope.month = [
            {month: "01"},
            {month: "02"},
            {month: "03"},
            {month: "04"},
            {month: "05"},
            {month: "06"},
            {month: "07"},
            {month: "08"},
            {month: "09"},
            {month: "10"},
            {month: "11"},
            {month: "12"}
        ];

        $scope.year = [
            {year: "2016"},
            {year: "2017"},
            {year: "2018"},
            {year: "2019"},
            {year: "2020"}
        ];

        $scope.currentTime = function () {
            return moment().subtract(1, "minute").format();
        }

        $scope.currentMonth = function () {
            var m = new Date().getMonth() + 1;
            if (m > 9)
                return m.toString();
            return "0" + m.toString();
        }

        $scope.currentYear = function () {
            var y = new Date().getYear() + 1900;
            return y.toString();
        }

        $scope.qtyInMultiplier = function (product, numContracts) {
            return numContracts * $scope.multiplier[product].multiplier;
        }

        $scope.qtyWithoutMultiplier = function (product, qty) {
            return qty / $scope.multiplier[product].multiplier;
        }

        $scope.closeThisDialog = ngDialog.close;

        $scope.submitForm = function () {

            // FORMAT: SENDER_ID|SENDER_SUB_ID|PASSWORD_IN_BASE64
            var cred = GKTConfig.getProperty("net.java.sip.communicator.cleaport.credentials");
            if (cred == undefined)
            {
                ngDialog.open({
                    template: '/partials/common/promptError.html',
                    data: {
                        error: "No CME Clearport API credentials found for user"
                    }
                });
                return;
            }

            var auth = cred.split("|");
            if (auth.length < 3)
            {
                ngDialog.open({
                    template: '/partials/common/promptError.html',
                    data: {
                        error: "Incomplete CME Clearport API credentials!"
                    }
                });
                return;
            }

            var clearport = new Clearport();

            var sampleJson = clearport.tradeCaptureReport.jsonTemplate();
            var rpt = sampleJson['FIXML']['TrdCaptRpt'];

            // TODO what's that? we should use ng-model for that
            rpt['@RptID'] = document.getElementById("RptID").value;
            rpt['@ExecID2'] = document.getElementById("ExecID").value;
            rpt['Hdr']['@SID'] = auth[0];
            rpt['Hdr']['@SSub'] = auth[1];
            rpt['RptSide'][0]['@InptSrc'] = auth[0];
            rpt['RptSide'][0]['Pty'][0]['@ID'] = $scope.formData.BuyerClearing;
            rpt['RptSide'][0]['Pty'][1]['@ID'] = document.getElementById("BuyerAccount").value;
            rpt['RptSide'][0]['Pty'][2]['@ID'] = document.getElementById("BrokerFirm").value;
            rpt['RptSide'][0]['Pty'][3]['@ID'] = document.getElementById("BuyerTrader").value;
            rpt['RptSide'][0]['Pty'][4]['@ID'] = document.getElementById("BrokerName").value;
            rpt['RptSide'][1]['@InptSrc'] = auth[0];
            rpt['RptSide'][1]['Pty'][0]['@ID'] = $scope.formData.SellerClearing;
            rpt['RptSide'][1]['Pty'][1]['@ID'] = document.getElementById("SellerAccount").value;
            rpt['RptSide'][1]['Pty'][2]['@ID'] = document.getElementById("BrokerFirm").value;
            rpt['RptSide'][1]['Pty'][3]['@ID'] = document.getElementById("SellerTrader").value;
            rpt['RptSide'][1]['Pty'][4]['@ID'] = document.getElementById("BrokerName").value;
            rpt['TrdRegTS']['@TS'] = document.getElementById("ExecutionTime").value;
            rpt['Instrmt']['@Exch'] = $scope.formData.Exchange;
            rpt['Instrmt']['@ID'] = $scope.formData.Product;
            rpt['Instrmt']['@MMY'] = $scope.formData.ExpYear + $scope.formData.ExpMonth;
            rpt['@LastPx'] = document.getElementById("Price").value;
            rpt['@LastQty'] = $scope.qtyInMultiplier($scope.formData.Product, document.getElementById("Quantity").value);
            rpt['@TxnTm'] = moment().format();

            var fixmlMessage = clearport.jsonToFixml(sampleJson);

            function onResponse(response)
            {
                var parsed = clearport.fixmlToJson(response);
                var ack = parsed['FIXML']['TrdCaptRptAck'];

                var exch = ack['Instrmt']['@Exch'];
                var prod = ack['Instrmt']['@ID'];
                var exp = ack['Instrmt']['@MMY'];
                var qty = $scope.qtyWithoutMultiplier(prod, ack['@LastQty']);
                var px = ack['@LastPx'];

                var tradeInfo = exch + " " + prod + " " + exp + " " + qty + "@" + px;

                if (response.indexOf("RejRsn") == -1 && response.indexOf("RejTxt") == -1)
                {
                    ngDialog.open({
                        template: '/partials/common/infoDialog.html',
                        data: {
                            title: 'CME Clearport Success',
                            phrase: "Confirmation received for " + tradeInfo
                        }
                    });
                    return;
                }

                ngDialog.open({
                    template: '/partials/common/promptError.html',
                    data: {
                        error: ack['@RejTxt']
                    }
                });
            }

            clearport.sendToCme(fixmlMessage, auth[2], onResponse);
            ngDialog.close();
        }

        $scope.reset = function () {
            $element.find('form')[0].reset();
        };

        $scope.init = function () {
            if($scope.preset) {
                var presetData = TradeCaptureHelper.getPreset();

                $scope.formData.Product = presetData.product;
                $scope.formData.price = presetData.price;
                $scope.formData.qty = presetData.qty;
                $scope.formData.ExpMonth = presetData.month;
                $scope.formData.ExpYear = presetData.year;
            }
            else {
                $scope.formData.Product = $scope.prod[0].prod;
                $scope.formData.price = "45.21";
                $scope.formData.qty = "50";
                $scope.formData.ExpMonth = $scope.currentMonth();
                $scope.formData.ExpYear = $scope.currentYear();
            }

            $scope.formData.TradeType = "Block Trade";
            $scope.formData.Exchange = "NYMEX";
            $scope.formData.BuyerClearing = $scope.clearing[0].id;
            $scope.formData.SellerClearing = $scope.clearing[1].id;
        }

        // Init form defaults
        $scope.init();
    }

})();

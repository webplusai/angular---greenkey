'use strict';

function Clearport() {

    //--------------------------------------------
    // One sample msg helper for each CME message
    //--------------------------------------------

    this.tradeCaptureReport = new TradeCaptureReport();

    //---------------------------------------
    // Convert CME TrdCaptRpt: JSON to FIXML
    //---------------------------------------

    this.jsonToFixml = function (inputJson) {
        var xotree = new window.UTIL.XML.ObjTree();
        xotree.attr_prefix = '@';
        var result = xotree.writeXML(inputJson);
        return result;
    }

    //---------------------------------------
    // Convert CME Response: FIXML to JSON
    //---------------------------------------

    this.fixmlToJson = function (inputFixml) {
        var xotree = new window.UTIL.XML.ObjTree();
        xotree.attr_prefix = '@';
        var result = xotree.parseXML(inputFixml);
        return result;
    }

    //--------------------------------------------------------------
    // Send data to CME Clearport API using HTTPS session-less post
    //--------------------------------------------------------------

    this.sendToCme = function (data, auth, responseCallback) {
        var request = new XMLHttpRequest();
        request.onload = function () {
            responseCallback(request.responseText);
        };
        request.open("POST", "https://ClearPortCERT.cmegroup.com/cpc/unoapi/UnoApiHandler.api", true);
        request.setRequestHeader("Content-Type", "text/xml");
        request.setRequestHeader("Authorization", "Basic " + auth);
        request.send(data);
    }
}

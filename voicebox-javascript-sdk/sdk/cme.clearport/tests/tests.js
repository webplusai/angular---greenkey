//------------------------
// To run this test:
//------------------------
// (1) node install
// (2) node tests.js
//------------------------

//-----------------------------------------------------
// Unit-test 1: Convert given JSON to FIXML and verify
//-----------------------------------------------------

var test = require('tape');
var clearport = require('../clearport');

test('xotree-basic-test', function(t)
{
    t.plan(1);

    // client can start with template and modify
    var inputJson = clearport.tradeCaptureReport.jsonTemplate();

    // Trade Report for CME GCZ6 1000 @ 55.21
    inputJson['FIXML']['TrdCaptRpt']['Instrmt']['@Exch'] = 'COMEX';
    inputJson['FIXML']['TrdCaptRpt']['Instrmt']['@ID'] = 'GC';
    inputJson['FIXML']['TrdCaptRpt']['Instrmt']['@MMY'] = '201612';
    inputJson['FIXML']['TrdCaptRpt']['@LastPx'] = '55.21';
    inputJson['FIXML']['TrdCaptRpt']['@LastQty'] = '1000';

    var expectedXml = '\
    <?xml version="1.0" encoding="UTF-8" ?>\
    <FIXML v="5.0 SP2" s="20090815" xv="109" cv="CME.0001">\
    <TrdCaptRpt RptID="0000345" ExecID2="12345620003924" TransTyp="0" TrdTyp="1" TxnTm="2016-04-08T15:48:00.000-04:00" QtyTyp="0" LastPx="55.21" LastQty="1000">\
    <Hdr SID="GKMC" SSub="API_RBEDARKAR" TID="CME" TSub="CPAPI"/>\
    <Instrmt SecTyp="FUT" Exch="COMEX" ID="GC" Src="H" MMY="201612" TmUnit="Mo"/>\
    <TrdRegTS TS="2016-04-08T15:48:00.000-04:00" Typ="1"/>\
    <RptSide InptSrc="GKMC" Side="1">\
    <Pty ID="666" R="1"/>\
    <Pty ID="JMCDEM01" R="24"/>\
    <Pty ID="green_key" R="30"/>\
    <Pty ID="jmcbtest1" R="36"/>\
    <Pty ID="arivera1" R="62"/>\
    </RptSide>\
    <RptSide InptSrc="GKMC" Side="2">\
    <Pty ID="072" R="1"/>\
    <Pty ID="072ACETEST" R="24"/>\
    <Pty ID="green_key" R="30"/>\
    <Pty ID="jmcace1" R="36"/>\
    <Pty ID="arivera1" R="62"/>\
    </RptSide>\
    </TrdCaptRpt>\
    </FIXML>';

    var fixmlMessage = clearport.jsonToFixml(inputJson);

    console.log("\nRESULT FIXML:\n\n" + fixmlMessage + "\n");

    // unit-test: normalized result_xml matches expectedXml
    t.equal(expectedXml.replace(/[ ]*/g, ""), fixmlMessage.replace(/[ \n]/g, ""));
});

//--------------------------------------------------
// Unit-test 2: Send FIXML message to CME Clearport
//--------------------------------------------------

test('xotree-send-to_cme', function(t)
{
    t.plan(7);

    var inputJson = clearport.tradeCaptureReport.jsonTemplate();

    // Trade Report for CME GCZ6 100000 @ 1256.3
    inputJson['FIXML']['TrdCaptRpt']['Instrmt']['@Exch'] = 'COMEX';
    inputJson['FIXML']['TrdCaptRpt']['Instrmt']['@ID'] = 'GC';
    inputJson['FIXML']['TrdCaptRpt']['Instrmt']['@MMY'] = '201612';
    inputJson['FIXML']['TrdCaptRpt']['@LastPx'] = '1256.3';
    inputJson['FIXML']['TrdCaptRpt']['@LastQty'] = '1000';

    /*
    //-------------------------------------------------------------------------
    // Sample CME FIXML Response: We convert it to JSON and assert unit-tests
    //-------------------------------------------------------------------------

    <FIXML v="5.0 SP2" xv="109" s="20090815" cv="CME.0001">
    <TrdCaptRptAck RptID="1460555502760" TransTyp="0" ExecID2="12345620003924" TrdTyp="1" LastQty="500000" QtyTyp="0" LastPx="45.21" TxnTm="2016-04-11T10:44:39.646-05:00" ExecID="845168" TrdRptStat="4" RptRefID="0000345" RptTyp="0" TrdAckStat="0" TrdDt="2016-04-11" BizDt="2016-04-11"><Hdr SID="CME" SSub="CPAPI" TID="GKMC" TSub="API_RBEDARKAR"/>
        <Instrmt SecTyp="FUT" Exch="NYMEX" ID="CL" Src="H" MMY="201712" TmUnit="Mo"/><TrdRegTS TS="2016-04-08T15:48:00.000-04:00" Typ="1"/>
        <RptSide InptSrc="GKMC" Side="1">
            <Pty ID="666" R="1"/>
            <Pty ID="JMCDEM01" R="24"/>
            <Pty ID="green_key" R="30"/>
            <Pty ID="jmcbtest1" R="36"/>
            <Pty ID="arivera1" R="62"/>
        </RptSide>
        <RptSide InptSrc="GKMC" Side="2">
            <Pty ID="072" R="1"/>
            <Pty ID="072ACETEST" R="24"/>
            <Pty ID="green_key" R="30"/>
            <Pty ID="jmcace1" R="36"/>
            <Pty ID="arivera1" R="62"/>
        </RptSide>
    </TrdCaptRptAck>
    </FIXML>';
    */

    // convert input JSON to FIXML
    var fixmlMessage = clearport.jsonToFixml(inputJson);

    function onResponse(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            console.log('\nCME Response:\n\n' + chunk);
            var cmeResponseJson = clearport.fixmlToJson(chunk);

            // (1) verify correct values sent to CME
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck']['Instrmt']['@Exch'], 'COMEX');
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck']['Instrmt']['@ID'], 'GC');
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck']['Instrmt']['@MMY'], '201612');
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck']['@LastQty'], '1000');
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck']['@LastPx'], '1256.3');

            // (2) verify no reject from CME
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck'].hasOwnProperty('@RejRsn'), false);
            t.equal(cmeResponseJson['FIXML']['TrdCaptRptAck'].hasOwnProperty('@RejTxt'), false);
        });
    }

    // send FIXML to CME over HTTPS post
    clearport.sendToCme(fixmlMessage, onResponse);
});

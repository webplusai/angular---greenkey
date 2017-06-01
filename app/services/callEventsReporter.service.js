(function () {
  'use strict';

  function renderAppEvent(newStatus, call) {
    var obj = {
      "calls.new_status": newStatus,
      "calls.contact_uid": !$.isEmptyObject(call.contact) ? call.contact.uid : null,
      "calls.contact_display_name": !$.isEmptyObject(call.contact) ? call.contact.display_name
        : null,
      "calls.call_muted": call.muted,
      "calls.call_type": call.type,
      "sip.contact": !$.isEmptyObject(call.session) ? call.session.contact : null,
      "sip.call_id": !$.isEmptyObject(call.session) && !$.isEmptyObject(call.session.dialog) &&
        !$.isEmptyObject(call.session.dialog.id) ? call.session.dialog.id.toString()
        : null
    };
    return {
      message: EncodingUtil.stringifyJSONIgnoringCircularRefs(obj)
    };
  }

  function runBlock(commonConstants, CallManager) {

    CallManager.addInboundCallListener(function (call) {
      if(call.sipTDMStatus === commonConstants.GKT.SIP_EVENTS.sipTDMIncomingConnectionRequest){
        return;
      }
      GKTLog.sendAppEvent("events.calls.inbound_call", renderAppEvent(call.status, call));
      call.on(commonConstants.GKT.CALL_EVENTS.call_status_change, function (event) {
        GKTLog.sendAppEvent("events.calls.call_status_change", renderAppEvent(event.newStatus, call));
      });
    });


    CallManager.addOutboundCallListener(function (call) {
      GKTLog.sendAppEvent("events.calls.outbound_call", renderAppEvent(call.status, call));
      call.on(commonConstants.GKT.CALL_EVENTS.call_status_change, function (event) {
        GKTLog.sendAppEvent("events.calls.call_status_change", renderAppEvent(event.newStatus, call));
      });
    });
  }

  angular.module('gkt.voiceBox.services').run(['commonConstants', 'CallManager', runBlock]);

})();

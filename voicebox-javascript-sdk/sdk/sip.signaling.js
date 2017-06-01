function SipSignaling(config) {
  'use strict';

  /* For testing*/
  var TDMProperties = {
    "net.java.sip.communicator.impl.protocol.sip.TDM_MRD_PHONES": {
      gateway: SipSignaling.GATEWAY_TYPES.sangoma,
      connectionType: SipSignaling.CONNECTION_TYPES.MRD
    },
    "net.java.sip.communicator.impl.protocol.sip.TDM_ARD_PHONES": {
      gateway: SipSignaling.GATEWAY_TYPES.sangoma,
      connectionType: SipSignaling.CONNECTION_TYPES.ARD
    },
    "net.java.sip.communicator.impl.protocol.sip.PANOPTIC_PHONES": {
      gateway: SipSignaling.GATEWAY_TYPES.panoptic,
      connectionType: SipSignaling.CONNECTION_TYPES.MRD
    }
  };

  function initSipSignaling(session, tdmContext) {
    new SipSignalingSessionController(session, tdmContext);
  }

  function prepareExpr(expr) {
    expr = expr.trim().replace(/\\\\/g, "\\") || "";
    if (!expr)
      return null;

    if (!expr.startsWith("^"))
      expr = "^" + expr;

    if (!expr.endsWith("$"))
      expr = expr + "$";

    return expr;
  }

  function getSipTDMConfig(contact) {
    var phoneNumber = contact ? contact.phone_numbers.internal : null;
    if (phoneNumber) {
      for (var property in TDMProperties) {
        var expr = prepareExpr(config[property]);
        if (expr && (phoneNumber === expr || phoneNumber.match(expr)))
          return TDMProperties[property];
      }
    }
    return null;
  }

  function getSignal(signals, gateway, connectionType) {
    var filtered = gateway && connectionType ? _.filter(signals, {gateway: gateway, connectionType: connectionType}) : null;
    return filtered && filtered.length > 0 ? filtered[0] : null;
  }

  function getTDMContext(contact) {
    var res = null;
    var gateway = contact.tdm_contact_gateway_type;
    var connectionType = contact.tdm_contact_type;
    if (!gateway || !connectionType) {
      var tdmConfig = getSipTDMConfig(contact);
      if (tdmConfig) {
        gateway = tdmConfig.gateway;
        connectionType = tdmConfig.connectionType;
      }
    }

    var enableSignal = getSignal(SipSignaling.SIP_TDM_ENABLE_SIGNALS, gateway, connectionType);
    if (enableSignal) {
      var disableSignal = getSignal(SipSignaling.SIP_TDM_DISABLE_SIGNALS, gateway, connectionType);
      res = {
        enabled: !!enableSignal,
        enableSignal: enableSignal,
        disableSignal: disableSignal,
        connectionType: contact.isRingdown() ?
          GKTConstants.CONTACT_TYPE.sipTDMRingdown : GKTConstants.CONTACT_TYPE.hoot
      }
    }
    return res;
  }

  return {
    getTDMContext: getTDMContext,
    initSipSignaling: initSipSignaling
  }
}

SipSignaling.GATEWAY_TYPES = {
  sangoma: "Sangoma",
  panoptic: "Panoptic"
};

SipSignaling.CONNECTION_TYPES = {
  ARD: 'ARD',
  MRD: 'MRD'
};

SipSignaling.SIP_TDM_ENABLE_SIGNALS = [
  {gateway: SipSignaling.GATEWAY_TYPES.sangoma, connectionType: SipSignaling.CONNECTION_TYPES.ARD, dtmfSignals: ["4"], extraHeaders: null},
  {gateway: SipSignaling.GATEWAY_TYPES.sangoma, connectionType: SipSignaling.CONNECTION_TYPES.MRD, dtmfSignals: ["9"], extraHeaders: null},
  {gateway: SipSignaling.GATEWAY_TYPES.panoptic, connectionType: SipSignaling.CONNECTION_TYPES.ARD, dtmfSignals: ["16", "F"], extraHeaders: ["Subject: Call Refresh"]},
  {gateway: SipSignaling.GATEWAY_TYPES.panoptic, connectionType: SipSignaling.CONNECTION_TYPES.MRD, dtmfSignals: ["16", "F"], extraHeaders: ["Subject: Call Refresh"]}
];

SipSignaling.SIP_TDM_DISABLE_SIGNALS = [
  {gateway: SipSignaling.GATEWAY_TYPES.sangoma, connectionType: SipSignaling.CONNECTION_TYPES.ARD, dtmfSignals: ["5"], extraHeaders: null}
];

SipSignaling.SIGNAL_TYPES = {
  disable: 'disable',
  enable: 'enable'
};

function SipSignalingSessionController(session, tdmContext) {
  'use strict';

  var ZERO_SOUND_LEVEL_EVENTS_NUMBER_BEFORE_UNSHOUT = 20;

  var remoteShouted = false;
  var zeroSoundLevelEventsNumber = 0;
  var remoteVolumeLevelListener = null;

  var signalsQueue = [];
  var sendSignalTaskId = null;
  var enabled = false;

  function sendEnableTDMSignal(enable) {
    var signal = enable ? tdmContext.enableSignal : tdmContext.disableSignal;
    if (signal) {
      if (!sendSignalTaskId) {
        sendSignal(signal, enable);
        sendSignalTaskId = setInterval(function () {
          var signal = signalsQueue.shift();
          if (signal) {
            sendSignal(signal.tdmSignal, signal.enable);
          } else {
            clearInterval(sendSignalTaskId);
            sendSignalTaskId = null;
          }
        }, 1000);
      } else {
        signalsQueue.push({tdmSignal: signal, enable: enable});
      }
    }
  }

  function sendSignal(signal, enable) {
    var dtmf = signal.dtmfSignals && signal.dtmfSignals.length > 0 ? signal.dtmfSignals[0] : null;
    if (dtmf) {
      session.dtmf(dtmf, signal.extraHeaders, true);
      startListenRemoteSoundLevel();
    }
    enabled = enable;
  }

  function getIncomingSignalType(dtmf) {
    var res = null;
    var body = dtmf ? dtmf.body : null;

    if (body) {
      var args = body.split(/\r?\n/);
      if (args && args.length > 0) {
        var dtmfValue = args[0];
        args = dtmfValue.split('=');
        if (args && args.length > 1 && args[0] && "Signal" === args[0].trim() && args[1]) {
          dtmf = args[1].trim();
          if (dtmf) {
            var correctDtmf = tdmContext.enableSignal ? tdmContext.enableSignal.dtmfSignals : null;
            if (correctDtmf && _.indexOf(correctDtmf, dtmf) >= 0)
              res = SipSignaling.SIGNAL_TYPES.enable;
            else {
              correctDtmf = tdmContext.disableSignal ? tdmContext.disableSignal.dtmfSignals : null;
              if (correctDtmf && _.indexOf(correctDtmf, dtmf) >= 0)
                res = SipSignaling.SIGNAL_TYPES.disable;
            }
          }
        }
      }
    }
    return res;
  }

  function startListenRemoteSoundLevel() {
    if (remoteVolumeLevelListener) {
      return;
    }

    remoteVolumeLevelListener = function (volumeLevel) {
      remoteSideShouted(enabled && volumeLevel > 10);
    };
    session.audioController.addRemoteVolumeLevelListener(remoteVolumeLevelListener);
  }

  function handleDTMF(dtmf) {
    var signalType = getIncomingSignalType(dtmf);
    var isEnableSignal = signalType === SipSignaling.SIGNAL_TYPES.enable;
    if (!signalType || (isEnableSignal === enabled)) {
      return;
    }
    enabled = isEnableSignal;
    if (tdmContext.connectionType === GKTConstants.CONTACT_TYPE.hoot) {
      if (!isEnableSignal) {
        zeroSoundLevelEventsNumber = ZERO_SOUND_LEVEL_EVENTS_NUMBER_BEFORE_UNSHOUT;
        remoteSideShouted(false);
      } else {
        startListenRemoteSoundLevel();
      }
    } else if (tdmContext.connectionType === GKTConstants.CONTACT_TYPE.sipTDMRingdown) {
      if (isEnableSignal) {
        session.emit(GKTConstants.SIP_EVENTS.sipTDMIncomingConnectionRequest);
      } else {
        session.emit(GKTConstants.SIP_EVENTS.sipTDMDisconnected);
      }
    }
  }

  function remoteSideShouted(shout) {
    if (shout) {
      zeroSoundLevelEventsNumber = 0;
    } else {
      zeroSoundLevelEventsNumber++;
    }
    if (remoteShouted !== shout && (shout || zeroSoundLevelEventsNumber >= ZERO_SOUND_LEVEL_EVENTS_NUMBER_BEFORE_UNSHOUT)) {
      remoteShouted = shout;

      var msg = {
        type: GKTConstants.SIP_EVENTS.shoutChange,
        data: {
          shout: shout ? 1 : 0
        }
      };
      session.emit(GKTConstants.SIP_EVENTS.shoutChange, msg);
    }
  }

  function addFakeFuncIfFuncIsNotSet(session, field) {
    if (!session[field]) {
      session[field] = function () {
      };
    }
  }

  if(tdmContext && tdmContext.enabled) {
    if (tdmContext.connectionType === GKTConstants.CONTACT_TYPE.hoot) {
      session.sendMuteTDMSignal = function (mute) {
        sendEnableTDMSignal(!mute);
      };
    } else if (tdmContext.connectionType === GKTConstants.CONTACT_TYPE.sipTDMRingdown) {
      session.sendSipTDMConnectSignal = function () {
        sendEnableTDMSignal(true);
        session.emit(GKTConstants.SIP_EVENTS.sipTDMConnected);
      };
      session.sendSipTDMDisconnectSignal = function () {
        sendEnableTDMSignal(false);
        session.emit(GKTConstants.SIP_EVENTS.sipTDMDisconnected);
      };

      session.acceptSipTDMConnectionRequest = function () {
        session.emit(GKTConstants.SIP_EVENTS.sipTDMConnected);
      }
    }
  }

  addFakeFuncIfFuncIsNotSet(session, 'sendMuteTDMSignal');
  addFakeFuncIfFuncIsNotSet(session, 'sendSipTDMConnectSignal');
  addFakeFuncIfFuncIsNotSet(session, 'sendSipTDMDisconnectSignal');
  addFakeFuncIfFuncIsNotSet(session, 'acceptSipTDMConnectionRequest');

  session.on(GKTConstants.SIP_EVENTS.dtmf, handleDTMF);
}

// Begin RingdownConnection Connection Classes
/**
 * @namespace Connection#RingdownConnection
 * @description Root namespace.
 */
var RingdownConnection = function(contact, callManager, SIP, tvc, audioDevices, interactionStatus) {
  this.type = GKTConstants.CONTACT_TYPE.ringdown;
  this.sipTDMStatus = GKTConstants.SIP_EVENTS.sipTDMDisconnected;
  contact.last_status = contact.last_status || (contact.type === GKTConstants.CONTACT_TYPE.external && contact.favorite);
  Connection.call(this, contact, callManager, SIP, tvc, interactionStatus);
  this.setAudioDeviceProfile(audioDevices.getAudioDeviceProfile(this,
    RingdownConnection.getDefaultAudioDeviceProfileId()));
  this.constructor = RingdownConnection;
};

RingdownConnection.getDefaultAudioDeviceProfileId = function(){
  return GKTConstants.AUDIO_DEVICE_PROFILE_IDS.audio1;
};

extend(Connection, RingdownConnection);

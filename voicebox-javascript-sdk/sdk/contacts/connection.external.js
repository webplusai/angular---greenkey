
//Begin ExternalConnection Connection Classes
/**
 * @namespace Connection#ExternalConnection
 * @description Root namespace.
 */
var ExternalConnection = function(contact, callManager, SIP, tvc, audioDevices, interactionStatus) {
  this.type = GKTConstants.CONTACT_TYPE.external;
  this.sipTDMStatus = GKTConstants.SIP_EVENTS.sipTDMDisconnected;
  Connection.call(this, contact, callManager, SIP, tvc, interactionStatus);
  this.setAudioDeviceProfile(audioDevices.getAudioDeviceProfile(this,
    ExternalConnection.getDefaultAudioDeviceProfileId()));
  this.constructor = ExternalConnection;
};

ExternalConnection.getDefaultAudioDeviceProfileId = function(){
  return GKTConstants.AUDIO_DEVICE_PROFILE_IDS.audio1;
};

extend(Connection, ExternalConnection);

_.assign(ExternalConnection.prototype, {

  update: function(newContact) {
    Connection.prototype.update.call(this, newContact);
      var possibleProperties = ['first_name', 'last_name', 'company', 'email', 'phone_numbers', 'favorite'],
          connection = this;

    _.each(possibleProperties, function(propertyName) {
      if (typeof newContact[propertyName] !== 'undefined'
            && connection.contact[propertyName] !== newContact[propertyName]) {
        connection.contact[propertyName] = newContact[propertyName];
      }
    });
  }

});

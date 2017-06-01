(function () {
  'use strict';
  angular.module('gkt.voiceBox.notifications')
    .service('HootNotificationHelper', function () {

      this.resolveIncomingShoutName = function (shoutMsg, hootsByUid) {
        var displayName;
        var shoutName;

        if (!shoutMsg.data.speaking_contact_uid || shoutMsg.source_contact === shoutMsg.data.speaking_contact_uid) {
          if (hootsByUid[shoutMsg.source_contact])
            shoutName = displayName = hootsByUid[shoutMsg.source_contact].contact.display_name;
        } else {
          var teamHoot = hootsByUid[shoutMsg.source_contact];
          shoutName = teamHoot.contact.display_name;

          var speakingHoot = hootsByUid[shoutMsg.data.speaking_contact_uid];
          var speakingHootName = speakingHoot ?
            speakingHoot.contact.display_name :
            shoutMsg.data.speaking_contact_display_name;
          displayName = speakingHootName + ' (' + teamHoot.contact.display_name + ')';
        }

        return {
          shoutName: shoutName,
          displayName: displayName
        };
      };

    });
})();
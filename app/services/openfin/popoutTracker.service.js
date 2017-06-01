(function() {
  'use strict';

  // This service tracks down any changes, that are interesting to OpenFin's popup windows
  angular.module('gkt.voiceBox.openFin')
    .run([
      '$rootScope', 'commonConstants', 'Notifications', 'OpenFin', 'CallManager', 'OpenfinMessage',
      'Blasts', 'KeyboardService', 'MidiService', 'HotkeysService', OpenFinPopoutTracker
    ]);

  function OpenFinPopoutTracker($rootScope, constants, Notifications, OpenFin,
                                CallManager, OpenfinMessage, Blasts, KeyboardService, MidiService, HotkeysService) {

    // subscribe on action events for OpenFin only
    if(!OpenFin.exists())
      return;

    function getPanelId(connection) {
      var panel = null;
      var connType = connection.type;
      var hootTypes = [constants.GKT.CONTACT_TYPE.hoot ,constants.GKT.CONTACT_TYPE.blastGroup];
      var ringdownTypes = [constants.GKT.CONTACT_TYPE.ringdown, constants.GKT.CONTACT_TYPE.external,
        constants.GKT.CONTACT_TYPE.sipTDMRingdown];

      if (_.includes(hootTypes, connType)) {
        panel = OpenFin.TYPES.panelUids.hoots;
      }

      if (_.includes(ringdownTypes, connType)) {
        panel = OpenFin.TYPES.panelUids.ringdowns;
      }

      return panel;
    }

    function update(type, option, value,  event, connection) {
      Notifications.update(connection.uid, option, value);
      OpenFin.updateTornWindow(connection.uid, type, option, value);

      var panelId = getPanelId(connection);
      if(panelId) {
        updatePanel(panelId, option, value, connection.uid);
      }
    }

    function updatePanel(id, option, value, connectionUid) {
      OpenFin.updateTornPanel(id, connectionUid, option, value);
    }

    function updateOnline(value, event, connection) {
      var type = null;
      if(connection.type === constants.GKT.CONTACT_TYPE.hoot ||
        connection.type === constants.GKT.CONTACT_TYPE.blastGroup)
        type = OpenFin.TYPES.hoots;
      if(connection.type === constants.GKT.CONTACT_TYPE.ringdown
        || connection.type === constants.GKT.CONTACT_TYPE.sipTDMRingdown)
        type = OpenFin.TYPES.ringdowns;

      if(type) {
        update(type, 'isOnline', value, event, connection);
      }
    }

    function updatePanelContacts(action, connection) {
      var panelId = getPanelId(connection);
      if(panelId) {
        OpenFin.updateTornPanelContacts(panelId, action, connection);
      }
    }

    function updatePanelContactsOrder(connectionsIds, isHoots) {
      var action = OpenfinMessage.ACTIONS.TO_FIN.contactsReordered;
      var panelId = isHoots ? OpenFin.TYPES.panelUids.hoots : OpenFin.TYPES.panelUids.ringdowns;
      OpenFin.updateTornPanelContactsSorting(panelId, action, connectionsIds);
    }

    // subscribe for common events
    $rootScope.$on(constants.UI_EVENTS.connection_came_online, updateOnline.bind(this, true));
    $rootScope.$on(constants.UI_EVENTS.connection_came_offline, updateOnline.bind(this, false));

    CallManager.addUpdateConnectionListener(function(connection) {
      if(connection.contact.isHoot() || connection.contact.isRingdown()) {
        var type = connection.contact.isHoot() ?
          OpenFin.TYPES.hoots : OpenFin.TYPES.ringdowns;

        update(
          type, 'isAway', connection.contact.last_idle_status, null, connection);
      }
    });

    // -- contact added / removed
    CallManager.addNewConnectionListener(function (connection) {
      updatePanelContacts(OpenfinMessage.ACTIONS.TO_FIN.contactAdded, connection);
    });

    CallManager.addOnRemoveConnectionListener(function (connection) {
      updatePanelContacts(OpenfinMessage.ACTIONS.TO_FIN.contactRemoved, connection);
    });

    // the same for blasts
    Blasts.addBlastCreationListener(updatePanelContacts.bind(this, OpenfinMessage.ACTIONS.TO_FIN.contactAdded));
    Blasts.addBlastRemovalListener(updatePanelContacts.bind(this, OpenfinMessage.ACTIONS.TO_FIN.contactRemoved));

    // subscribe for ringdown events
    CallManager.addInboundCallListener(function(connection) {
      if(connection.contact.isHoot() || connection.sipTDMConnectionNeeded()) return;
      update(OpenFin.TYPES.ringdowns, 'inCall', true, null, connection);
    });

    CallManager.addOutboundCallListener(function(connection) {
      if(connection.contact.isHoot() || connection.sipTDMConnectionNeeded()) return;
      update(OpenFin.TYPES.ringdowns, 'inCall', true, null, connection);
    });

    $rootScope.$on(constants.GKT.CALL_EVENTS.hangup_call, function(event, connection) {
      if(connection.contact.isHoot()) return;
      update(OpenFin.TYPES.ringdowns, 'inCall', false, event, connection);
    });

    // subscribe for active call events
    $rootScope.$on(constants.UI_EVENTS.active_call_selected,
      update.bind(this, OpenFin.TYPES.calls, 'selected', true));
    $rootScope.$on(constants.UI_EVENTS.active_call_unselected,
      update.bind(this, OpenFin.TYPES.calls, 'selected', false));
    $rootScope.$on(constants.UI_EVENTS.active_call_accepted, function(event, from, connection) {
      update(OpenFin.TYPES.calls, 'ringing', false, event, connection);
    });
    $rootScope.$on(constants.UI_EVENTS.active_call_toggled_mute, function(event, call, isMuted) {
      update(OpenFin.TYPES.calls, 'muted', isMuted, event, call);
    });
    $rootScope.$on(constants.UI_EVENTS.active_call_toggled_silence, function(event, call, isSilenced) {
      update(OpenFin.TYPES.calls, 'silenced', isSilenced, event, call);
    });

    // subscribe for hoot events
    $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout,
      update.bind(this, OpenFin.TYPES.hoots, 'inboundShout', true));
    $rootScope.$on(constants.GKT.CALL_EVENTS.inbound_shout_end,
      update.bind(this, OpenFin.TYPES.hoots, 'inboundShout', false));
    $rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout,
      update.bind(this, OpenFin.TYPES.hoots, 'shouting', true));
    $rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout_end,
      update.bind(this, OpenFin.TYPES.hoots, 'shouting', false));
    $rootScope.$on(constants.UI_EVENTS.hootSilenced,
      update.bind(this, OpenFin.TYPES.hoots, 'silenced', true));
    $rootScope.$on(constants.UI_EVENTS.hootUnsilenced,
      update.bind(this, OpenFin.TYPES.hoots, 'silenced', false));
    $rootScope.$on(constants.UI_EVENTS.hoot_connecting_state_changed,
      function(event, connection, isConnecting) {
        update(OpenFin.TYPES.hoots, 'connecting', isConnecting, event, connection);
      });


    // subscribe for blast events
    $rootScope.$on(constants.UI_EVENTS.blast_button_pressed,
      update.bind(this, OpenFin.TYPES.hoots, 'shouting', true));
    $rootScope.$on(constants.UI_EVENTS.blast_button_released,
      update.bind(this, OpenFin.TYPES.hoots, 'shouting', false));


    // subscribe for reordering events
    $rootScope.$on(constants.UI_EVENTS.hoots_reordered, function (event, hootsIds) {
      updatePanelContactsOrder(hootsIds, true);
    });
    $rootScope.$on(constants.UI_EVENTS.ringdowns_reordered, function (event, ringdownsIds) {
      updatePanelContactsOrder(ringdownsIds, false);
    });


    MidiService.addKeyAssigningListener(handleHotKeyAssignation);
    KeyboardService.addKeyAssigningListener(handleHotKeyAssignation);

    function handleHotKeyAssignation(connectionUid) {
      update(OpenFin.TYPES.hoots, 'hotKey', HotkeysService.getAssignedHotKey(connectionUid), null, {
        uid: connectionUid,
        type: 'hoot'
      });
    }

  }
})();

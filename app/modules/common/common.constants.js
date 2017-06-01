(function() {
  'use strict';

  angular
    .module('gkt.voiceBox.common.constants')
    .constant('commonConstants', {
      APP: {
        voiceBoxWebUrl: "$TVB_WEB_URL",
        openFinConfigURL: "$TVB_WEB_URL/openfin-config.json",
        symphonyModeVarName: 'tvb.symphonyMode',
        last_logout_reason: 'last_logout_reason',
        disable_overlay_flag: 'disable_overlay_flag'
      },
      GKT: GKTConstants,
      UI_EVENTS: {
        active_call_selected: 'active_call_selected',
        active_call_unselected: 'active_call_unselected',
        active_call_accepted: 'active_call_accepted',
        active_call_toggled_mute: 'active_call_toggled_mute',
        active_call_toggled_silence: 'active_call_toggled_silence',
        selected_calls_released: 'selected_calls_released',
        meter_volume_changed: 'meter_volume_changed',
        compact_mode_toggled: 'compact_mode_toggled',
        midi_push_shout_button: 'midi:push_shout_button',
        midi_release_shout_button: 'midi:release_shout_button',
        outbound_streams_count_updated: 'outbound_streams_count_updated',
        blasts_list_updated: 'blasts:list_updated',
        blasts_saved: 'blasts:saved',
        blast_button_pressed: 'blasts:button_pressed',
        blast_button_released: 'blasts:button_released',
        hootSilenced: 'silenceService:hootSilenced',
        hootUnsilenced: 'silenceService:hootUnsilenced',
        openfin_message: 'openfin_message',
        openfin_push_shout_button: 'openfin_push_shout_button',
        openfin_release_shout_button: 'openfin_release_shout_button',
        shout_changed_from_event_log: 'shout_changed_from_event_log',
        missed_events_changed: 'missed_events_changed',
        ringdowns_fetched: 'ringdowns_fetched',
        connection_control_signal: 'got_connection_control_signal',
        connection_came_online: 'connection_came_online',
        connection_came_offline: 'connection_came_offline',
        blast_group_selection_requested: 'blast_group_selection_requested',
        blast_group_selected: 'blast_group_selected',
        wide_screen_mode_toggled: 'wide_screen_mode_toggled',
        tear_out_hoots_panel: 'openfin:tearHootsPanel',
        tear_out_ringdowns_panel: 'openfin:tearRingdownsPanel',
        hoot_connecting_state_changed: 'hoot_connecting_state_changed',
        dashboard_opened: 'dashboard_opened',
        hoots_reordered: 'hoots_reordered',
        ringdowns_reordered: 'ringdowns_reordered'
      },
      CONFIG_PROPS: {
        GKTSupportNumber: 'net.java.sip.communicator.tvb.SUPPORT_PHONE',
        GKTHelpEnabled: 'tvb.helpEnabled',
        hotkeys_midi: 'tvb.SHARED.HOTKEYS_MIDI',
        hotkeys_keyboard: 'tvb.SHARED.HOTKEYS_KEYBOARD',
        phone_panel_visible: 'tvb.PHONE_PANEL_VISIBLE',
        msgAlertDisabled: 'msgAlertDisabled'
      },
      UI: {
        hootPagesQty: 3,
        ringdownsPagesQty: 3,
        volumeEventTimeoutMs: 200,
        defaultHootColumn: 2
      },
      HOOTS: {
        silencedHoots: 'silencedHoots'
      },
      CONNECTION_SIGNALS: {
        MUTE: 'mute',
        UNMUTE: 'unmute'
      },
      UI_SIGNALS: {
        PRESS: 'press',
        RELEASE: 'release'
      },
      CONNECTION_CONTAINER_TYPE: {
        hootContainer: 'hootContainer',
        ringdownContainer: 'ringdownContainer',
        activeCallContainer: 'activeCallContainer'
      }
    });

})();

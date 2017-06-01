var GKTConstants = {

  PRESENCE: {
    online: 'online',
    offline: 'offline'
  },
  CALL_EVENTS: {
    inbound_call: 'inbound_call',
    outbound_call: 'outbound_call',
    inbound_shout: 'inbound_shout',
    inbound_shout_end: 'inbound_shout_end',
    outbound_shout: 'outbound_shout',
    outbound_shout_end: 'outbound_shout_end',
    call_status_change: 'call_status_change',
    hangup_call: 'hangup_call',
    sipTDMStatusChanged: 'sipTDMStatusChanged'
  },
  CALL_STATUS: {
    active: 'active',
    muted: 'muted',
    unmuted: 'unmuted',
    rejected: 'rejected',
    disconnected: 'disconnected',
    canceled: 'canceled',
    connecting: 'connecting',
    connection_paused: 'connection_paused'
  },
  SIP_EVENTS: {
    accepted: 'accepted',
    bye: 'bye',
    canceled: 'cancel',
    rejected: 'rejected',
    failed: 'failed',
    connecting: 'connecting',
    connected: 'connected',
    terminated: 'terminated',
    dtmf: 'dtmf',
    forceTerminate: 'force_terminate',
    addStream: 'addStream',
    shoutChange: 'shout-change',
    sipTDMIncomingConnectionRequest: 'sipTDMIncomingConnectionRequest',
    sipTDMConnected: 'sipTDMConnected',
    sipTDMDisconnected: 'sipTDMDisconnected'
  },
  CONTACT_TYPE: {
    hoot: 'hoot',
    ringdown: 'ringdown',
    external: 'external',
    ransquawk: 'ransquawk',
    conference: 'conference_room',
    blastGroup: 'blast_group',
    sipTDMRingdown: 'sipTDMRingdown'
  },
  APP_EVENTS: {
    status_change: "status_change",
    configured: "configured",
    force_logout: 'force_logout',
    contact_added: 'contact_added',
    contact_deleted: 'contact_deleted',
    contact_updated: 'contact_updated',
    contact_request_add: 'contact_request_add',
    contact_request_delete: 'contact_request_delete',
    contact_request_update: 'contact_request_update',
    fatal_error: 'fatal_error',
    webrtc_logout: 'webrtc_logout',
    config_property_updated: 'config_property_updated'
  },
  FORCE_LOGOUT_REASONS: {
    // TVC session is expired
    session_expired: 'session_expired',
    // account is in use on another device
    duplicate_login: 'duplicate_login',
    // user was kicked from admin panel
    kicked_by_admin: 'kicked_by_admin',
    // connection is lost
    network_error: 'network_error',
    // in other cases
    unexpected_error: 'unexpected_error'
  },
  UI_STRINGS: {
    output_muted_toggle_text: 'Mute Output',
    output_unmuted_toggle_text: 'Unmute Output'
  },
  CHAT_NETWORKS: {
    whatsapp: 'whatsapp',
    wechat: 'wechat',
    aim: 'aim',
    yahoo: 'yahoo'
  },
  AUDIO_DEVICE_PROFILE_IDS: {
    audio1: "audio1",
    audio2: "audio2"
  }
};
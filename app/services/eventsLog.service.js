(function () {
  'use strict';
  angular.module('gkt.voiceBox.services')
    .service('EventsLog', function ($rootScope, $timeout, commonConstants, CallService, tvbUIState, HootNotificationHelper, GKT, CallManager, TVC) {

      var events = [];
      var currentPage = 1;
      var totalPages = 0;
      var pageSize = 25;

      function _parseLogEntry(event) {
        var record = new EventsLogRecord();

        record.id = event.id;
        record.type = {
          source: event.type,
          inbound: event.inbound
        };
        record.time = event.datetime;
        record.contact = event.contactName;
        record.note = event.note;
        record._connectionUid = event.connectionUid;
        record.idle = event.idle;
        record.inboud = event.inboud;

        events.push(record);
      }

      function _loadEvents() {
        // Load last week log events:
        return TVC.getEventLog(0, 7, currentPage, pageSize)
          .then(function(weekLog) {
            _.each(weekLog.rows, _parseLogEntry);

            totalPages = weekLog.pages;
          });
      }

      function _loadNextPage() {
        if (_hasMorePages()) {
          currentPage += 1;
          return _loadEvents();
        }
      }

      function _hasMorePages() {
        return currentPage < totalPages;
      }

      function _createEventLog(log) {
        return TVC.createEventLogRecord({
          type: log.type.source,
          inbound: log.type.inbound,
          datetime: new Date(log.time),
          contactName: log.contact,
          note: log.note,
          connectionUid: log._connectionUid,
          idle: log.idle
        }).then(_parseLogEntry);
      }

      function _updateEventNote(log) {
        return TVC.updateEventLogRecord(log.id, { note: log.note });
      }

      function _handleCall(isInbound) {
        return function (call) {
          if (call.type !== commonConstants.GKT.CONTACT_TYPE.ringdown &&
            call.type !== commonConstants.GKT.CONTACT_TYPE.external &&
            (call.type !== commonConstants.GKT.CONTACT_TYPE.sipTDMRingdown ||
            call.sipTDMConnectionNeeded())) {
            return;
          }

          var newLog = new EventsLogRecord(events.length + 1, call.type, call.contact.display_name, isInbound, call.uid);
          _createEventLog(newLog);
        };
      }

      function _handleShout(isInbound, call, displayName) {
        var newLog = new EventsLogRecord(events.length + 1, commonConstants.GKT.CONTACT_TYPE.hoot, displayName || call.contact.display_name, isInbound, call.uid);
        _createEventLog(newLog);
      }

      CallManager.addInboundCallListener(_handleCall(true));
      CallManager.addOutboundCallListener(_handleCall(false));
      $rootScope.$on(commonConstants.GKT.CALL_EVENTS.inbound_shout, function(event, hootConnection, shoutMsg) {
        CallManager.getHootConnections().then(function(hoots) {
          $timeout(function(){
            var shoutNames = HootNotificationHelper.resolveIncomingShoutName(shoutMsg, hoots);
            _handleShout(true, hootConnection, shoutNames.displayName);
          });
        });

      });
      $rootScope.$on(commonConstants.GKT.CALL_EVENTS.outbound_shout, function(event, hootConnection) {
        _handleShout(false, hootConnection);
      });

      function EventsLogRecord(id, type, name, isInbound, connectionUid) {
        if (id === undefined) { return; }

        this.id = id;
        this.type = {
          source: type,
          inbound: isInbound
        };
        this.time = new Date().getTime();
        this.contact = name;
        this.note = "";
        this._connectionUid = connectionUid;
        this.idle = tvbUIState.idle;
      }

      EventsLogRecord.prototype.makeCallBack = function () {
        switch (this.type.source) {
          case commonConstants.GKT.CONTACT_TYPE.ringdown:
            var ringdown = CallService.getConnection(this._connectionUid);
            if (!ringdown)
              return;
            CallService.makeRingdownCall(ringdown.uid, true);
            break;
          case commonConstants.GKT.CONTACT_TYPE.external:
            CallService.makeExternalCall(this.contact);
            break;
          case commonConstants.GKT.CONTACT_TYPE.hoot:
            $rootScope.$emit(commonConstants.UI_EVENTS.shout_changed_from_event_log, this._connectionUid);
            break;
        }
      };

      // for simple sorting
      var sortOrderByType = {};
      sortOrderByType[commonConstants.GKT.CONTACT_TYPE.external] = 10;
      sortOrderByType[commonConstants.GKT.CONTACT_TYPE.ringdown] = 20;
      sortOrderByType[commonConstants.GKT.CONTACT_TYPE.hoot] = 30;

      Object.defineProperty(EventsLogRecord.prototype, "typeOrder", {
        get: function() { return sortOrderByType[this.type.source] + (this.type.inbound ? 1 : 0); }
      });


      _loadEvents();


      return {
        getEvents: function () {
          return events;
        },
        updateEventNote: _updateEventNote,
        loadNextPage: _loadNextPage,
        hasMorePages: _hasMorePages
      };
    });
})();

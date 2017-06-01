(function () {
  'use strict';

  angular.module('gkt.voiceBox.services')
    .service('VideoConferenceService', ['ngDialog', 'TVC', 'OpenFin',
      'CallManager', 'GKT', function (ngDialog, TVC, OpenFin, CallManager, GKT) {

      var windowWith = 800;
      var windowHeight = 600;
      var videoConferenceEnabled = false;
      var IS_VIDEO_ENABLED_PROP = 'tvb.web.VIDEO_CONFERENCE_ENABLED';

      var DEFAULT_WINDOW_OPTIONS = {
        alwaysOnTop: false,
        autoShow: true,
        frame: true,
        resizable: true,
        maximizable: true,
        showTaskbarIcon: true
      };

      GKT.addConfiguredListener(function () {
        videoConferenceEnabled = GKTConfig.getBoolean(IS_VIDEO_ENABLED_PROP, false);
      });

      function showVideoConferenceInOpenFinWindow(url, uid) {
        var pos = getWindowPosition(windowWith, windowHeight);
        var options = {
          name: "videoConference-" + uid,
          defaultWidth: windowWith,
          defaultHeight: windowHeight,
          minWidth: windowWith,
          minHeight: windowHeight,
          url: url
        };
        _.assign(options, DEFAULT_WINDOW_OPTIONS);
        var openFinWindow = new fin.desktop.Window(options, function(){
          openFinWindow.moveTo(pos.x, pos.y);
        });
      }

      function getWindowPosition(width, height){
        var x = screen.width/2 - width/2;
        var y = screen.height/2 - height/2;
        return {x: x > 0 ? x : 0, y: y > 0 ? y : 0};
      }

      function showVideoConferenceInBrowserWindow(url) {
        var pos = getWindowPosition(windowWith, windowHeight);
        window.open(url, '_blank', 'location=yes,width=' + windowWith + ', height=' + windowHeight + ' , scrollbars=yes,status=yes left=' + pos.x + ',top=' + pos.y);
      }

      function showVideoConferenceWindow(conferenceData) {
        var url = conferenceData.url;
        var uid = conferenceData.uid;
        if (OpenFin.exists())
          showVideoConferenceInOpenFinWindow(url, uid);
        else {
          showVideoConferenceInBrowserWindow(url);
        }
      }

      function sendResponseToParticipants(connections) {
        var contactIds = [];
        connections.forEach(function (connection) {
          var contact = connection.contact;
          if (contact)
            contactIds.push(contact.uid);
        });
        return TVC.inviteVideoConference(contactIds);
      }

      TVC.addVideoConferenceListener(function (message, contactUid, data) {
        if(!videoConferenceEnabled)
          return;

        CallManager.getConnectionByContactId(contactUid).then(function(connection){
          var contact = connection ? connection.contact : null;
          var user = contact ? contact.display_name : "Unknown user";
          ngDialog.openConfirm({
            template: '/partials/common/confirmDialog.html',
            data: {
              title: 'You have been invited to a video conference',
              phrase: user + ' invited you to a video conference. Do you want to join the conference?'
            }
          }).then(function(){
            showVideoConferenceWindow(data);
          });
        })
      });

      function _selectParticipantsAndStartVideoConference() {
        if(!videoConferenceEnabled)
          return;

        ngDialog.open({
          template: '<contact-selection-dialog-content></contact-selection-dialog-content>',
          plain: true,
          closeByEscape: true,
          closeByNavigation: true,
          closeByDocument: true,
          data: {
            title: "Select conference participants",
            filter: connectionsFilter,
            onSelected: onSelected
          }
        });
      }

      function connectionsFilter(connection) {
        var contact = connection.contact;
        return contact && (contact.isHoot() || contact.isRingdown());
      }

      function onSelected(connections) {
        ngDialog.openConfirm({
          template: '/partials/common/confirmDialog.html',
          data: {
            title: 'Confirm start video conference',
            phrase: 'Are you sure you want to start the video conference and send invitation to all participants?'
          }
        }).then(function(){
          var conferenceData = sendResponseToParticipants(connections);
          showVideoConferenceWindow(conferenceData);
        });
      }

      return {
        selectParticipantsAndStartVideoConference: _selectParticipantsAndStartVideoConference,
        isVideoConferenceEnabled: function() {
          return videoConferenceEnabled;
        }
      }
    }]);
})();
(function () {
  'use strict';

  angular.module('gkt.voiceBox.sdk').provider("TVC", function() {
    var tvc = null;

    this.init = function (tvcInstance) {
      tvc = tvcInstance;
    };

    this.$get = ["angularUtils", function (angularUtils) {
      var requestManager = tvc.getContactRequestManager();

      var newContactRequestListeners = angularUtils.createListenersWithScopeCheck();
      requestManager.addNewRequestListener(newContactRequestListeners.trigger);
      var updateContactRequestListeners = angularUtils.createListenersWithScopeCheck();
      requestManager.addUpdateListener(updateContactRequestListeners.trigger);
      var deleteContactRequestListeners = angularUtils.createListenersWithScopeCheck();
      requestManager.addDeleteListener(deleteContactRequestListeners.trigger);
      var videoConferenceListeners  = angularUtils.createListenersWithScopeCheck();
      tvc.addMessageListener("invite_video_conference", videoConferenceListeners.trigger);

      function getVideoConferenceData(){
        var conferenceUID = UUID.generate();
        var url = "https://video.tradervoicebox.com/" + conferenceUID.replace(/[-]/g, "");
        return  {
          url: url,
          uid: conferenceUID
        }
      }

      function inviteVideoConference(contactIds){
        var data = getVideoConferenceData();
        tvc.sendMessageToContact(contactIds, "invite_video_conference", data);
        return data;
      }

      return {
        getContactRequests: angularUtils.addScopeCheckToPromiseFunc(tvc.getDirectConnectionRequests),
        acceptPendingConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.acceptDirectConnectionRequest),
        rejectPendingConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.rejectDirectConnectionRequest),
        cancelOutgoingPendingConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.cancelOutgoingConnectionRequest),
        resendPendingConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.resendPendingConnection),
        removeRejectedRequest: angularUtils.addScopeCheckToPromiseFunc(tvc.removeRejectedRequest),
        getCompanies: angularUtils.addScopeCheckToPromiseFunc(tvc.getCompanies),
        getProducts: angularUtils.addScopeCheckToPromiseFunc(tvc.getProducts),
        requestDirectCompanyConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.requestDirectCompanyConnection),
        updateExternalContact: angularUtils.addScopeCheckToPromiseFunc(tvc.updateExternalContact),
        importExternalContacts: angularUtils.addScopeCheckToPromiseFunc(tvc.importExternalContacts),
        uploadFileToS3: angularUtils.addScopeCheckToPromiseFunc(tvc.uploadFileToS3),
        getReferralLink: angularUtils.addScopeCheckToPromiseFunc(tvc.getReferralLink),
        invitePersonsToGKTNetwork: angularUtils.addScopeCheckToPromiseFunc(tvc.invitePersonsToGKTNetwork),
        deleteConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.deleteConnection),
        sendIdleStatusToTVC: tvc.sendIdleStatusToTVC,
        registration: angularUtils.addScopeCheckToPromiseFunc(tvc.registration),
        getContacts: angularUtils.addScopeCheckToPromiseFunc(tvc.getContacts),
        logChatMessage: angularUtils.addScopeCheckToPromiseFunc(tvc.logChatMessage),
        getDirectUrlForUploadedFile: angularUtils.addScopeCheckToPromiseFunc(tvc.getDirectUrlForUploadedFile),
        getChatMessages: angularUtils.addScopeCheckToPromiseFunc(tvc.getChatMessages),
        searchUserByName: angularUtils.addScopeCheckToPromiseFunc(tvc.searchUserByName),
        getExternalTeamHoots: angularUtils.addScopeCheckToPromiseFunc(tvc.getExternalTeamHoots),
        createDirectConnection: angularUtils.addScopeCheckToPromiseFunc(tvc.createDirectConnection),

        getEventLog: angularUtils.addScopeCheckToPromiseFunc(tvc.getEventLog),
        createEventLogRecord: angularUtils.addScopeCheckToPromiseFunc(tvc.createEventLogRecord),
        updateEventLogRecord: angularUtils.addScopeCheckToPromiseFunc(tvc.updateEventLogRecord),
        getProfile: angularUtils.addScopeCheckToPromiseFunc(tvc.getProfile),
        uploadNewAvatar: angularUtils.addScopeCheckToPromiseFunc(tvc.uploadNewAvatar),
        getPublicProfile: angularUtils.addScopeCheckToPromiseFunc(tvc.getPublicProfile),

        addNewContactRequestListener: newContactRequestListeners.add,
        removeNewContactRequestListener: newContactRequestListeners.remove,
        addUpdateContactRequestListener: updateContactRequestListeners.add,
        removeUpdateContactRequestListener: updateContactRequestListeners.remove,
        addDeleteContactRequestListener: deleteContactRequestListeners.add,
        removeDeleteContactRequestListener: deleteContactRequestListeners.remove,

        inviteVideoConference: inviteVideoConference,
        addVideoConferenceListener: videoConferenceListeners.add,
        removeVideoConferenceListener: videoConferenceListeners.remove
      };
    }];
  });

})();
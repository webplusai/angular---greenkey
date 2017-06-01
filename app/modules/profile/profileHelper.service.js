(function() {
  'use strict';
  angular.module('gkt.voiceBox.dashboard')
    .service('ProfileHelper', ['ngDialog', 'TVC', ProfileHelper]);

  function ProfileHelper(ngDialog, TVC) {

    var currentDialog = null;

    function getData(uid) {
      return TVC.getPublicProfile(uid).then(function (data) {
        return {
          uid: uid,
          fullName: data.full_name,
          companyName: data.company,
          // TODO check why nothing is coming from TVC in 'not connected' case
          connectionStatus: data.connection_status.status || 'Connect',
          connectionRequestId: data.connection_status.id,
          photo: data.logo,
          products: _.map(data.products, "name"),
          connections: _.map(data.user_connections,
            function (contact) {
              return {
                uid: contact.uid,
                name: contact.display_name,
                isInternal: contact.type === "internal",
                photo: contact.full_photo_link
              };

            })
        };
      });
    }


    this.openProfile = function(connectionUid) {
      var oldDialog = currentDialog;
      currentDialog = ngDialog.open({
        template: '/partials/profile/profileWindow.html',
        controller: 'ProfileWindowController',
        className: 'modal-window-wrapper',
        closeByEscape: true,
        closeByNavigation: true,
        closeByDocument: true,
        data: {
          userInfoPromise: getData(connectionUid)
        }
      });

      if (oldDialog) {
        oldDialog.close();
      }
    };

  }
})();
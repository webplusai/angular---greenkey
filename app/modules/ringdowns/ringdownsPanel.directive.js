(function () {
  'use strict';
  var MAX_PAGES = 3;
  var MAX_COLUMNS = 3;
  var MIN_COLUMNS = 2;

  angular.module('gkt.voiceBox.ringdowns')
    .directive('ringdownsPanel', function () {
      return {
        restrict: 'EA',
        scope: {},
        replace: true,
        templateUrl: '/partials/ringdowns/ringdownsPanel.html',
        controller: [
          '$scope',
          '$rootScope',
          '$timeout',
          '$q',
          'commonConstants',
          'tvbUIState',
          'ArrangeStorage',
          'OpenFin',
          'CallManager',
          'AudioDevices',
          ringdownsPanelController
        ]
      };
    });

  function ringdownsPanelController($scope, $rootScope, $timeout, $q, constants, tvbUIState, ArrangeStorage, OpenFin,
                                    CallManager) {
    $scope.activePageIndex = 0;
    $scope.uiState = tvbUIState;
    $scope.contacts = [];
    $scope.emptySlots = [];
    $scope.draggingData = {
      isDragging: false
    };

    var contactsQty = 0,
        contacts = {},
      slots = [],
      initState = {
        ringdownsLoaded: false,
        externalsLoaded: false
      };

    function fillEmptySlots() {
      var pageSize = tvbUIState.page.ringdownsOnPage || 1,
          currentPageContacts = _.filter($scope.contacts, { pageRIndex: $scope.activePageIndex }),
          emptySlotsCount = pageSize - currentPageContacts.length;

      if (currentPageContacts.length > pageSize) {
        var columns = isWideScreen() ? MIN_COLUMNS : MAX_COLUMNS;
        var extraConns = (currentPageContacts.length % columns);
        emptySlotsCount = extraConns ? columns - extraConns : 0;
      }

      $scope.emptySlots = [];
      for (var i = 0; i < emptySlotsCount; ++i) {
        $scope.emptySlots.push({ emptySlot: true });
      }
    }

    function _getPageIndex(itemPosition) {
      var page = Math.floor(itemPosition / tvbUIState.page.ringdownsOnPage);
      return page < MAX_PAGES ? page : MAX_PAGES-1;
    }

    function combineContactsList() {
      return [].concat(_.values(contacts.ringdowns), _.values(contacts.externalContacts));
    }

    function _updateContactsList(contactsList) {
      contactsList = contactsList || combineContactsList();
      var sortedContactsList = ArrangeStorage.load(contactsList, 'ringdowns');

      if (_.isFunction(sortedContactsList.slice)) {
        _.each(sortedContactsList, function (contact, i) {
          contact.pageRIndex = _getPageIndex(i);
        });

        slots = sortedContactsList.slice();
        contactsQty = sortedContactsList.length;
        $scope.contacts = sortedContactsList.slice();

        $rootScope.$emit(constants.UI_EVENTS.ringdowns_fetched, sortedContactsList.slice());
      }

      fillEmptySlots();

      return _.isFunction(sortedContactsList.slice) ?
        sortedContactsList.slice() :
        [];
    }

    contacts.externalContacts = {};
    contacts.ringdowns = {};

    function processExtractedConnections(connections) {
      var buffer = {};
      _.each(connections, function(connection) {
        buffer[connection.uid] = connection;
      });

      return buffer;
    }

    function resotreTornWindow(sortedContacts) {
      if(!OpenFin.exists()) return;
      if(initState.externalsLoaded && initState.ringdownsLoaded &&
        OpenFin.isConnectionTornOutPermanently(OpenFin.TYPES.panelUids.ringdowns)) {
        OpenFin.tearOutPanel(OpenFin.TYPES.panelUids.ringdowns, sortedContacts);
      }
    }

    CallManager.addRingdownsExtractionListener(function(ringdowns) {
      contacts.ringdowns = processExtractedConnections(ringdowns);
      initState.ringdownsLoaded = true;
      var sortedContacts = _updateContactsList();
      resotreTornWindow(sortedContacts);
    });

    CallManager.addSpeedDialsExtractionListener(function(speedDials) {
      contacts.externalContacts = processExtractedConnections(speedDials);
      initState.externalsLoaded = true;
      var sortedContacts = _updateContactsList();
      resotreTornWindow(sortedContacts);
    });

    // User change active tab on ringdowns panel
    $rootScope.$on('ringdowns_page_changed', function(ev, activeIndex) {
      $scope.activePageIndex = activeIndex;
      fillEmptySlots();
    });

    $rootScope.$on(constants.UI_EVENTS.tear_out_ringdowns_panel, function() {
      OpenFin.tearOutPanel(OpenFin.TYPES.panelUids.ringdowns, $scope.contacts);
    });

    function addConnection(connection) {
      if (connection.type === constants.GKT.CONTACT_TYPE.ringdown || connection.type === constants.GKT.CONTACT_TYPE.sipTDMRingdown) {
        contacts.ringdowns[connection.uid] = connection;
      } else if (connection.type === constants.GKT.CONTACT_TYPE.external) {
        if (connection.contact.favorite) {
          contacts.externalContacts[connection.uid] = connection;
        }
      } else if (constants.GKT.CONTACT_TYPE.hoot) {
        if (contacts.ringdowns[connection.uid]) {
          delete contacts.ringdowns[connection.uid];
        }
      }
      _updateContactsList();
    }

    // New contact was added on TVC
    CallManager.addNewConnectionListener(addConnection);

    // Contact was updated, e.g. some external connection could get speed dial mark
    CallManager.addUpdateConnectionListener(function(connection) {
      if ( !(connection instanceof ExternalConnection) ) {
        return;
      }

      var connectionUid = connection.uid,
        isSpeedDial = connection.contact.favorite;

      // contact is not speed dial more
      if (contacts.externalContacts[connectionUid] && !isSpeedDial) {
        delete contacts.externalContacts[connectionUid];
        _updateContactsList();
        // user create new speed dial contact
      } else if (isSpeedDial && !contacts.externalContacts[connectionUid]) {
        contacts.externalContacts[connectionUid] = connection;
        _updateContactsList();
      }
    });

    // Contact was removed on TVC
    CallManager.addOnRemoveConnectionListener(function(connection) {
      var contactToDelete, currentTypeContacts;

      switch (connection.type) {
        case constants.GKT.CONTACT_TYPE.ringdown:
          currentTypeContacts = contacts.ringdowns;
          break;
        case constants.GKT.CONTACT_TYPE.sipTDMRingdown:
          currentTypeContacts = contacts.ringdowns;
          break;
        case constants.GKT.CONTACT_TYPE.external:
          currentTypeContacts = contacts.externalContacts;
          break;

        default:
          return;
      }

      contactToDelete = currentTypeContacts[connection.uid];

      if (contactToDelete instanceof Connection) {
        // hang up call
        if (contactToDelete.status === constants.GKT.PRESENCE.online && contactToDelete.session) {
          contactToDelete.hangup();
          $rootScope.$emit('hangup_call', contactToDelete);
        }
        // remove from list
        delete currentTypeContacts[connection.uid];
        // and update panel content
        _updateContactsList();
      }
    });

    function _emitReorderedEvent() {
      $rootScope.$emit(constants.UI_EVENTS.ringdowns_reordered, _.map($scope.contacts, function (contacts) {
        return contacts.uid;
      }));
    }

    $rootScope.$on('ringdowns:move_to_page', function(event, fromPage, toPage, ringdonwIndex) {
      var ringdownTo, ringdownFrom;

      if (toPage * tvbUIState.page.ringdownsOnPage >= $scope.contacts.length || fromPage === toPage) {
        return;
      }

      if (fromPage < toPage) {
        ringdownTo = $scope.contacts[toPage * tvbUIState.page.ringdownsOnPage];
        ringdownFrom = $scope.contacts.splice(ringdonwIndex, 1)[0];

        $scope.contacts.splice(fromPage * tvbUIState.page.ringdownsOnPage + tvbUIState.page.ringdownsOnPage - 1, 0, ringdownTo);
        $scope.contacts[toPage * tvbUIState.page.ringdownsOnPage] = ringdownFrom;
      } else {
        ringdownFrom = $scope.contacts.splice(ringdonwIndex, 1)[0];
        ringdownTo = $scope.contacts[toPage * tvbUIState.page.ringdownsOnPage + tvbUIState.page.ringdownsOnPage - 1];

        $scope.contacts[toPage * tvbUIState.page.ringdownsOnPage + tvbUIState.page.ringdownsOnPage - 1] = ringdownFrom;
        $scope.contacts.splice(fromPage * tvbUIState.page.ringdownsOnPage, 0, ringdownTo);
      }

      ArrangeStorage.store($scope.contacts, 'ringdowns');
      _updateContactsList($scope.contacts);
      _emitReorderedEvent();
    });

    $scope.dragDropOptions = {

      beforeDropOnRingdownPanel: function(event, ui){
        return $q(function(resolve, reject) {
          var uid = ui.draggable.attr('data-dragdrop-uid');
          CallManager.getConnectionByContactId(uid).then(function (connection) {
            if(connection && connection.type === constants.GKT.CONTACT_TYPE.hoot && !connection.isSipTDMConnection()) {
              connection.moveConnection();
            }
          });
          reject();
        });
      },

      onDrop: function(event, ui) {
        var indexFrom = ui.helper.data('dragdrop-index');
        var indexTo = $(event.target).data('dragdrop-index');
        var ringdown, index, indexToUpdate, aux;
        if (indexFrom > indexTo) {
          aux = indexTo;
          indexTo = indexFrom;
          indexFrom = aux;
        }

        // This swap in the indexes is needed to preserve the prototype inheritance of the objects.
        //  - the drag & drop makes an internal copy -
        for (index = indexFrom; index <= indexTo; index++) {
          ringdown = slots[index];
          indexToUpdate = _.findIndex($scope.contacts, { uid: ringdown.uid });
          $scope.contacts[indexToUpdate] = ringdown;
        }

        slots = $scope.contacts.slice();
        ArrangeStorage.store($scope.contacts, 'ringdowns');
        _emitReorderedEvent();
      },

      onStart: function(event, ui) {
        if (!tvbUIState.settingsVisible) {
          event.preventDefault();
          return;
        }
        $scope.draggingData.isDragging = true;
        ui.helper.outerWidth($(event.target).outerWidth()); // fix the width when loosing the parent.
        ui.helper.outerHeight($(event.target).outerHeight());
      },

      onStop: function(event) {
        $timeout(function() {
          $scope.draggingData.isDragging = false;
          event.stopPropagation();
          event.preventDefault();
        }, 500);
      },

      beforeDrop: function(event, ui) {
        return $q(function(resolve, reject) {
          var uid = ui.draggable.attr('data-dragdrop-uid');
          return !_.find($scope.contacts, { uid: uid }) ? reject() : resolve();
        });
      }
    };

    function checkRingownsPerPage() {
      var oldValue = tvbUIState.page.ringdownsOnPage;
      tvbUIState.page.ringdownsOnPage = isWideScreen() ? 8 : 9;

      if (tvbUIState.page.ringdownsOnPage !== oldValue) {
        _updateContactsList();
      }
    }

    function isWideScreen() {
      return $scope.uiState.wideScreenMode;
    }

    _updateContactsList();

    $rootScope.$on(constants.UI_EVENTS.wide_screen_mode_toggled, checkRingownsPerPage);
  }

})();

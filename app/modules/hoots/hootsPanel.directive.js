(function () {
  'use strict';

  var WRAPPER_ELEMENT_SELECTOR = '.hoots-wrapper';
  var HOOTS_CONTAINER_SELECTOR = '#hoots';
  var DEFAULT_HOOTS_QTY = 4;
  var MIN_HOOTS_QTY = 0;
  var MAX_HOOT_HEIGHT = 105;
  var MEDIUM_HOOT_HEIGHT = 95;
  var MIN_HOOT_HEIGHT = 85;
  var MAX_PAGES = 3;

  angular.module('gkt.voiceBox.hoots')
    .directive('hootsPanel', function () {
      return {
        restrict: 'AE',
        replace: true,
        controller: ['$scope', '$rootScope', '$timeout', '$q', 'commonConstants', 'LayoutColumnsConfig', 'ArrangeStorage',
          'tvbUIState', 'ngDialog', '$window', 'Blasts', 'OpenFin', 'CallManager',
          hootsPanelCtrl],
        link : function(scope) {

          scope._getHootsInColumnQty = function() {
            var containerHeight = angular.element(HOOTS_CONTAINER_SELECTOR).height();

            //adjust constants to fit in compact mode
            if (scope.uiState.compactMode) {
              MIN_HOOTS_QTY = 4;
              DEFAULT_HOOTS_QTY = 5;
            }

            var hootsInColumnQty = 0;
            if (containerHeight > MAX_HOOT_HEIGHT * DEFAULT_HOOTS_QTY) {
              hootsInColumnQty = Math.floor(containerHeight / MAX_HOOT_HEIGHT);
            }
            else if (containerHeight > MEDIUM_HOOT_HEIGHT * DEFAULT_HOOTS_QTY) {
              hootsInColumnQty = Math.floor(containerHeight / MEDIUM_HOOT_HEIGHT);
            }
            else {
              hootsInColumnQty = Math.floor(containerHeight / MIN_HOOT_HEIGHT);
            }

            return hootsInColumnQty === 0 ? 0 : Math.max(MIN_HOOTS_QTY, hootsInColumnQty);
          };
        },
        templateUrl: '/partials/hootsPanel.html'
      };
    });

  function hootsPanelCtrl($scope, $rootScope, $timeout, $q, constants, LayoutColumnsConfig, ArrangeStorage, tvbUIState,
                          ngDialog, $window, Blasts, OpenFin, CallManager) {
    $scope.uiState = tvbUIState;

    $scope.items = [];
    $scope.emptySlots = [];

    $scope.activePageIndex = 0;
    $scope.draggingData = {
      isDragging: false
    };

    var contactsQty = 0;
    var itemsRef = []; // local reference to the old hoots.


    fillEmptySlots();

    function _getPageIndex(itemPosition) {
      var page = Math.floor(itemPosition / tvbUIState.page.hootsOnPage);
      return page < MAX_PAGES ? page : MAX_PAGES-1;
    }

    function _updateHoots(unsortedHoots) {
      var unsortedHootsAndBlasts, items, blasts;

      blasts = _getBlasts();
      unsortedHootsAndBlasts = unsortedHoots.concat(blasts);
      items = ArrangeStorage.load(unsortedHootsAndBlasts, 'hoots');

      if (angular.isFunction(items.slice)) {
        itemsRef = items.slice();

        _.each(items, function (item, i) {
          item.pageIndex = _getPageIndex(i);
        });

        $rootScope.$emit('hoots_fetched', unsortedHoots.slice());

        contactsQty = items.length;

        $scope.items = items.slice();
        fillEmptySlots();
      }

      return angular.isFunction(items.slice) ? items.slice() : [];
    }

    function fillEmptySlots() {
      var currentItems = _.filter($scope.items, { pageIndex: $scope.activePageIndex });

      var size = tvbUIState.page.hootsOnPage - currentItems.length;
      var i;

      if (size < 0 && $scope.columns) {
        size = currentItems.length % $scope.columns.val;
      }

      $scope.emptySlots = [];

      for (i = 0; i < size; i++) {
        $scope.emptySlots.push({
          emptySlot: true,
          type: constants.GKT.CONTACT_TYPE.hoot
        });
      }

      _fixContainerHeight(currentItems);
    }

    function _fixContainerHeight(currentItems) {
      if (!$scope.columns) { return; }

      var percentageHeight = currentItems.length * 100 / tvbUIState.page.hootsOnPage;

      if (percentageHeight > 0 && percentageHeight >= 100) {
        angular.element(WRAPPER_ELEMENT_SELECTOR).height(percentageHeight + '%');
      }
    }

    /* Listener to page changes */
    $rootScope.$on('hoots_page_changed', function(ev, activeIndex) {
      $scope.activePageIndex = activeIndex;
      fillEmptySlots();
    });

    CallManager.addNewConnectionListener(function(connection) {
      if (connection.type !== constants.GKT.CONTACT_TYPE.hoot &&
        connection.type !== constants.GKT.CONTACT_TYPE.ransquawk) {
        return;
      }

      var hoots = _filterHoots();

      hoots.push(connection);
      _updateHoots(hoots);
    });

    CallManager.addOnRemoveConnectionListener(function(connection) {
      if (connection.type !== constants.GKT.CONTACT_TYPE.hoot &&
        connection.type !== constants.GKT.CONTACT_TYPE.ransquawk) {
        return;
      }

      var items = $scope.items.slice(0, contactsQty);
      var index = _.findIndex(items, 'uid', connection.uid);
      if (index === -1) { return; }

      var hoot = items.splice(index, 1)[0];
      if (hoot.callStatus === constants.GKT.CALL_STATUS.active ||
        hoot.callStatus === constants.GKT.CALL_STATUS.muted) {
        hoot.hangup && hoot.hangup();
      }

      $scope.items = [];
      var hoots = _.filter(items, function(item) {
        return item.type === constants.GKT.CONTACT_TYPE.hoot || item.type === constants.GKT.CONTACT_TYPE.ransquawk;
      });
      _updateHoots(hoots);
    });

    CallManager.addHootsExtractionListener(function(hoots) {
      var sortedConnections = _updateHoots(hoots);
      if(!OpenFin.exists()) return;
      if(OpenFin.isConnectionTornOutPermanently(OpenFin.TYPES.panelUids.hoots))
        OpenFin.tearOutPanel(OpenFin.TYPES.panelUids.hoots, sortedConnections);
    });

    $rootScope.$on(constants.UI_EVENTS.tear_out_hoots_panel, function() {
      OpenFin.tearOutPanel(OpenFin.TYPES.panelUids.hoots, $scope.items);
    });

    $rootScope.$on('hoots:move_to_page', function(event, fromPage, toPage, hootIndex) {
      var hootTo, hootFrom;

      if (toPage * tvbUIState.page.hootsOnPage >= $scope.items.length || fromPage === toPage) {
        return;
      }
      if (fromPage < toPage) {
        hootTo = $scope.items[toPage * tvbUIState.page.hootsOnPage];
        hootFrom = $scope.items.splice(hootIndex, 1)[0];

        $scope.items.splice(fromPage * tvbUIState.page.hootsOnPage + tvbUIState.page.hootsOnPage - 1, 0, hootTo);
        $scope.items[toPage * tvbUIState.page.hootsOnPage] = hootFrom;
      } else {
        hootFrom = $scope.items.splice(hootIndex, 1)[0];
        hootTo = $scope.items[toPage * tvbUIState.page.hootsOnPage + tvbUIState.page.hootsOnPage - 1];

        $scope.items[toPage * tvbUIState.page.hootsOnPage + tvbUIState.page.hootsOnPage - 1] = hootFrom;
        $scope.items.splice(fromPage * tvbUIState.page.hootsOnPage, 0, hootTo);
      }

      ArrangeStorage.store($scope.items, 'hoots');
      _updateHoots(_filterHoots());
      _emitReorderedEvent();
    });

    /* Toggle column with respect to compact mode */
    function _checkHootColVal(compactMode) {
      $scope.columns.val = LayoutColumnsConfig.getHootColsConfig(compactMode) || constants.UI.defaultHootColumn;
    }

    $scope.columns = {};

    _checkHootColVal($scope.uiState.compactMode);

    /* Watch screen toggles compact mode */
    $rootScope.$on(constants.UI_EVENTS.compact_mode_toggled, function(event, compactMode) {
      _checkHootColVal(compactMode);
      updateHootPageSize();
    });

    $scope.$watch('columns.val', function (newVal, oldVal) {
      if (newVal !== oldVal) {
        LayoutColumnsConfig.setHootColsConfig(newVal, $scope.uiState.compactMode);
        updateHootPageSize();
      }
    });

    function removeConnection(uid){
      var index = _.findIndex($scope.items, 'uid', uid);

      if (index === -1) { return; }

      $timeout(function() {
        $scope.items.splice(index, 1);
        _updateHoots(_filterHoots());
      });
    }

    $rootScope.$on(constants.GKT.CALL_EVENTS.hangup_call,function(options, connection) {
      $timeout(function() {
        if(connection && connection.type !== constants.GKT.CONTACT_TYPE.hoot){
          removeConnection(connection.uid);
        }
      });
    });

    function _emitReorderedEvent() {
      $rootScope.$emit(constants.UI_EVENTS.hoots_reordered, _.map($scope.items, function (item) {
        return item.uid;
      }));
    }

    $scope.dragDropOptions = {

      beforeDropOnHootsPanel: function (event, ui) {
        return $q(function(resolve, reject){
          $(event.target).removeClass('dragging-hover');
          var uid = ui.draggable.attr('data-dragdrop-uid');
          var connection = _.find(CallManager.getCurrentConnections(), {uid: uid});
          if (connection && (connection.type === constants.GKT.CONTACT_TYPE.ringdown && !connection.isSipTDMConnection())) {
            showDropRingdownConfirmation();
            connection.moveConnection();
          }
          reject();
        })
      },

      beforeDrop: function(event, ui) {
        return $q(function(resolve, reject) {
          var uid = ui.draggable.attr('data-dragdrop-uid');
          return  !_.find($scope.items, {uid: uid}) ? reject() : resolve();
        });
      },

      onDrop: function (event, ui) {
        var indexFrom = ui.helper.data('dragdrop-index');
        var indexTo = $(event.target).data('dragdrop-index');
        var hoot, index, indexToUpdate, aux;

        if (indexFrom > indexTo) {
          aux = indexTo;
          indexTo = indexFrom;
          indexFrom = aux;
        }

        // This swap in the indexes is needed to preserve the prototype inheritance of the objects.
        //  - the drag & drop makes an internal copy -
        for (index = indexFrom; index <= indexTo; index++) {
          hoot = itemsRef[index];
          if (hoot) {
            indexToUpdate = _.findIndex($scope.items, {uid: hoot.uid});
            $scope.items[indexToUpdate] = hoot;
          }
        }

        itemsRef = $scope.items.slice();
        ArrangeStorage.store($scope.items, 'hoots');
        _emitReorderedEvent();
      },

      onStart: function(event, ui) {
        var index = ui.helper.data('dragdrop-index'),
            item = $scope.items[index],
            isInConnectingState = function() {
              // offline hoot couldn't be in connecting state
              if (item.status === constants.GKT.PRESENCE.offline) {
                return false;
              }
              if (item.type === constants.GKT.CONTACT_TYPE.blastGroup) {
                return false; // no connecting state for blasts.
              }
              // when page just loaded hoots don't have callStatus, seems to be a bug of the state machine
              // and ofc hoot is in connecting state if it's "written" so
              if (!item.callStatus || item.callStatus === constants.GKT.CALL_STATUS.connecting) {
                return true;
              }
              // when hoot appears online again it still have "disconnected" status and not "connecting"
              // seems to be another bug of then state machine
              return item.status === constants.GKT.PRESENCE.online &&
                      item.callStatus === constants.GKT.CALL_STATUS.disconnected;
            };

        if (isInConnectingState()) {
          event.preventDefault();
          return;
        }

        $scope.draggingData.isDragging = true;
        ui.helper.outerWidth($(event.target).outerWidth()); // fix the width when loosing the parent.
        ui.helper.outerHeight($(event.target).outerHeight()); // fix variable height when loosing the parent.

        event.stopPropagation();
      },

      onStop: function() {
        $timeout(function() {
          $scope.draggingData.isDragging = false;
        }, 500);
      },

      onOver: function(event) {
        $(event.target).addClass('dragging-hover');
      },

      onOut: function(event) {
        $(event.target).removeClass('dragging-hover');
      }
    };

    function showDropRingdownConfirmation() {
      ngDialog.open({
        template: '/partials/hoots/dropConfirmationModal.html'
      });
    }

    function updateHootPageSize() {
      // no need to spend time on calculation if panel is not visible
      if(!tvbUIState.hootsPanelVisible)
        return;

      var newHootsOnPage = $scope._getHootsInColumnQty() * $scope.columns.val;

      if (newHootsOnPage !== tvbUIState.page.hootsOnPage) {
        tvbUIState.page.hootsOnPage = newHootsOnPage;
        _updateHoots(_filterHoots());
      }
    }

    angular.element($window).on('resize', function() {
      $scope.$apply(updateHootPageSize);
    });

    $scope.$watchGroup([
        'uiState.hootsPanelVisible',
        'uiState.settingsVisible',
        'uiState.phonePanelVisible'
      ],
      // it needs to let panels' DOM objects become visible
      $timeout.bind(this, updateHootPageSize, 50)
    );

    var _getBlasts = function() {
      var blasts = Blasts.getAll();
      if(_.isEmpty(blasts)) {
        return [];
      }

      blasts = _.values(blasts);
      _.each(blasts, function (blast) {
        blast.uid = blast.id; // hoot compatibility.
      });

      return blasts;
    };

    var _filterHoots = function() {
      var validTypes = [
        constants.GKT.CONTACT_TYPE.hoot,
        constants.GKT.CONTACT_TYPE.ringdown,
        constants.GKT.CONTACT_TYPE.ransquawk,
        constants.GKT.CONTACT_TYPE.external,
        constants.GKT.CONTACT_TYPE.sipTDMRingdown
      ];

      return _.filter($scope.items, function(item) {
        return _.includes(validTypes, item.type);
      });
    };

    $rootScope.$on(constants.UI_EVENTS.blasts_list_updated, function() {
      _updateHoots(_filterHoots());
    });

    var _onCallStatusChange = function(call, status) {
      var offlineStates = [
        constants.GKT.CALL_STATUS.rejected,
        constants.GKT.CALL_STATUS.disconnected,
        constants.GKT.CALL_STATUS.canceled
      ];

      if (!_.includes(offlineStates, status.newStatus)) {
        return;
      }

      var index = _.findIndex($scope.items, 'uid', call.uid);
      if (index === -1) { return; }

      $timeout(function() {
        $scope.items.splice(index, 1);
        _updateHoots(_filterHoots());
      });

      call.off('call_status_change', _onCallStatusChange);
    };

    $rootScope.$on(constants.UI_EVENTS.blasts_list_updated, function() {
      _updateHoots(_filterHoots());
    });

  }

})();

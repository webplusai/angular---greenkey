(function() {
  'use strict';

  angular.module('gkt.voiceBox.header').
      directive('header', header);

  function header() {
    return {
      restrict: 'A',
      replace: true,
      scope: {},
      templateUrl: '/partials/header.html',
      controller: [
        '$scope',
        '$rootScope',
        'ngDialog',
        '$window',
        '$localStorage',
        '$sessionStorage',
        'authService',
        'tvbUIState',
        'CallService',
        'commonConstants',
        'AudioDeviceModalService',
        'UserAwayTrackingService',
        'BrowserDetectService',
        'CompanyDirectoryService',
        'OpenFinResizeService',
        'BlastUi',
        'WhatsAppService',
        'WeChatService',
        'HotkeysService',
        'GKT',
        'MissedEventsService',
        'TVC',
        'AimChatService',
        'UiStateStorage',
        'YahooChatService',
        'VideoConferenceService',
        'TradeCaptureHelper',
        'ChatLogModalService',
        headerController],
        link: headerLinkFn
    };
  }

  function headerController($scope, $rootScope, ngDialog, $window, $localStorage, $sessionStorage,
                            authService, tvbUIState, CallService, constants, AudioDeviceModalService, UserAwayTrackingService, BrowserDetectService, CompanyDirectoryService,
                            OpenFinResizeService, BlastUi, WhatsAppService, WeChatService, HotkeysService, GKT,
                            MissedEventsService, TVC, AimChatService, UiStateStorage,
                            YahooChatService, VideoConferenceService, TradeCaptureHelper, ChatLogModalService) {

    $scope.pendingCons = 0;
    $scope.missedCons = 0;
    $scope.uiState = tvbUIState;
    $scope.isOpenFin = BrowserDetectService.isOpenFin();
    $scope.isTestEnv = GKTAppConfig.env === 'test' || GKTAppConfig.env === 'staging';
    $scope.isLocalEnv = $window.location.hostname === 'localhost';
    $scope.buildVersion = GKT_APP_VERSION;

    $scope.showTranscriptionsLink = false;

    $scope.showMissedEvents = false;
    $scope.showPendingConnections = false;

    UiStateStorage.restore('leftPanelVisible');
    UiStateStorage.restore('rightPanelVisible');

    GKT.addConfiguredListener(function() {
      tvbUIState.helpEnabled =
        GKTConfig.getBoolean(constants.CONFIG_PROPS.GKTHelpEnabled, false);
      $scope.supportURL = GKTConfig.getProperty(
        "net.java.sip.communicator.tvb.support.impl.SUPPORT_CENTER_FAQS_URL", null);
      $scope.proxyConfigEnabledInOpenFin = GKTConfig.getBoolean("tvb.PROXY_CONFIG_ENABLED_IN_OPENFIN", false);
      $scope.isTradeCaptureMenuEnabled = GKTConfig.getBoolean("tvb.TRADE_CAPTURE_MENU_ENABLED", false);
      $scope.isChatLogEnabled = GKTConfig.getBoolean("tvb.CHAT_LOG_ENABLED", false);
    });

    $scope.displayAudioConfig = navigator.mediaDevices && navigator.mediaDevices.enumerateDevices;

    $scope.openMyInfoModal = function () {
      ngDialog.open({
        className: 'modal-window-wrapper',
        template: '<user-profile></user-profile>',
        plain: true
      });
    };

    $rootScope.$on('ngDialog.opened', function (e, $dialog) {
      $scope.openedDialog = $dialog.attr('id');
    });

    $rootScope.$on(constants.UI_EVENTS.missed_events_changed, function() {
      $scope.missedCons = MissedEventsService.getMissedEvents().length;
    });

    //for compact mode
    function setViewState(hootsVisible, ringdownsVisible, eventsVisible) {
      tvbUIState.hootsPanelVisible = hootsVisible;
      tvbUIState.ringdownsPanelVisible = ringdownsVisible;
      tvbUIState.leftPanelVisible = eventsVisible;
    }

    function handleModeChange(isCompactMode) {
      if(isCompactMode) {
        setViewState(true, false, false);
        tvbUIState.rightPanelVisible = true;
      } else {
        setViewState(true, true, true);
        UiStateStorage.restore('leftPanelVisible');
        UiStateStorage.restore('rightPanelVisible');
      }
    }

    handleModeChange(tvbUIState.compactMode);

    $rootScope.$on(constants.UI_EVENTS.compact_mode_toggled, function (event, isCompactMode) {
      handleModeChange(isCompactMode);
    });

    $scope.toggleCompactShoutPanel = function () {
      if(tvbUIState.compactMode)
        setViewState(true, false, false);
    };

    $scope.toggleCompactRingdownPanel = function () {
      if(tvbUIState.compactMode){
        setViewState(false, true, false);
      }
    };

    $scope.toggleCompactEventPanel = function () {
      if(tvbUIState.compactMode){
        setViewState(false, false, true);
      }
    };

    $scope.toggleLeftPanel = function() {
      if(!tvbUIState.compactMode) {
        tvbUIState.leftPanelVisible = !tvbUIState.leftPanelVisible;
        UiStateStorage.save('leftPanelVisible');
      }
    };

    $scope.toggleRightPanel = function() {
      if(!tvbUIState.compactMode) {
        tvbUIState.rightPanelVisible = !tvbUIState.rightPanelVisible;
        UiStateStorage.save('rightPanelVisible');
      }
    };

    // Settings Panel
    $scope.toggleSettings = function() {
      tvbUIState.settingsVisible = !tvbUIState.settingsVisible;
    };

    function doLogout() {
      // disable connecting overlay
      // it could appear when connection with server is closed already but page isn't reloaded yet
      $sessionStorage[constants.APP.disable_overlay_flag] = true;

      authService.logout().then(
            function() {
              // after logout we shouldn't manually change page,
              // it will be better to let the system redirect user to start page (now it's /login)
              // and the simplest way to do it is just call reload method
              $localStorage[constants.APP.symphonyModeVarName] = tvbUIState.symphonyMode;
              $window.location.reload();
            },
            function(reason){
                //TODO: add error control
                console.error(reason);
            }
        );
    }

    $scope.doLogoutWithConfirmation = function() {
      ngDialog.openConfirm({
        template: '/partials/common/confirmDialog.html',
        data: {
          title: 'Confirm log out',
          phrase: 'Are you sure you want to log out?'
        }
      }).then(doLogout);
    };

    $scope.onPendingConnectionsChange = function(pendingCons) {
      $scope.pendingCons = pendingCons.length;
    };

    $scope.onHelpClicked = function() {
      var phoneNumber = GKTConfig.getProperty(constants.CONFIG_PROPS.GKTSupportNumber);
      var contact = CallService.makeExternalCall(phoneNumber);
      if (contact) {
        contact.contact.display_name = 'Green Key Support';
      }
    };

    $scope.onSetRingdownOutputDevice = function() {
      AudioDeviceModalService.open();
    };

    $scope.openSetInactivityTimeDialog = function() {
      UserAwayTrackingService.openSetInactivityTimeDialog();
    };

    $scope.openCompanyDirectoryList = function() {
      CompanyDirectoryService.open();
    };

    $scope.openBlastConfigDialog = function() {
      BlastUi.openBlastPanel();
    };

    $scope.openMidiConfigDialog = function() {
      HotkeysService.openHotkeysConfigDialog();
    };

    // TODO use directive from ngDialog instead of polluting $scope with functions
    $scope.openProxyConfigDialog = function() {
      ngDialog.open({
        className: 'modal-window-wrapper',
        template: '<proxy-config-panel></proxy-config-panel>',
        plain: true,
        closeByEscape: false,
        closeByNavigation: false,
        closeByDocument: false
      });
    };

    $scope.openExternalContactsList = function() {
      ngDialog.open({
        className: 'modal-window-wrapper external-contacts-panel-wrapper',
        template: '<external-contacts-panel></external-contacts-panel>',
        plain: true,
        closeByEscape: true,
        closeByNavigation: false,
        closeByDocument: false,
        overlay: !tvbUIState.compactMode
      });
    };

    $scope.isVideoConferenceEnabled = VideoConferenceService.isVideoConferenceEnabled;
    $scope.selectParticipantsAndStartVideoConference =
      VideoConferenceService.selectParticipantsAndStartVideoConference;

    $scope.openTradeCapture = TradeCaptureHelper.openTradeCaptureFrom;



    $scope.openErrorCorrectionPanel = function() {
      ngDialog.open({
        className: 'modal-window-wrapper',
        template: '<error-correction-panel></error-correction-panel>',
        plain: true,
        closeByEscape: true,
        closeByNavigation: false,
        closeByDocument: false,
        overlay: !tvbUIState.compactMode
      });
    };

    $scope.openTranscriptionTrainingPanel = function() {
      ngDialog.open({
        className: 'modal-window-wrapper',
        template: '<transcription-training-panel></transcription-training-panel>',
        plain: true,
        closeByEscape: true,
        closeByNavigation: false,
        closeByDocument: false,
        overlay: !tvbUIState.compactMode
      });
    };

    $scope.openWhatsAppWindow = WhatsAppService.openChatWindow;
    $scope.openWeChatAppWindow = WeChatService.openChatWindow;
    $scope.openAimChatAppWindow = AimChatService.openChatWindow;
    $scope.openYahooChatWindow = YahooChatService.openChatWindow;

    $scope.goToCompactMode = function() {
      OpenFinResizeService.switchToCompactMode();
    };

    $scope.goToFullscreenMode = function() {
      OpenFinResizeService.maximize();
    };

    $scope.onMissedEventsClick = function() {
      $scope.showMissedEvents = true;
    };

    $scope.onPendingConnectionsClick = function() {
      $scope.showPendingConnections = true;
    };

    $scope.onBackClick = function(event) {
      $scope.showMissedEvents = false;
      $scope.showPendingConnections = false;
      event.preventDefault();
      event.stopPropagation();

      // Open the menu when back.
      $("#compact-navbar-header-menu").dropdown('toggle');
    };

    $scope.reloadPage = function() {
      $window.location.reload();
    };

    $scope.showChatLog = function() {
      ChatLogModalService.open();
    };


    $scope.openGKTWhiteboard = function() {
      if ($scope.isOpenFin) {
        var supportURLWindow;
        var windowOptions = {
          url: "/vector/",
          name: "GKT Whiteboard",
          defaultLeft: 100,
          defaultTop: 15,
          defaultWidth: 1000,
          defaultHeight: 1060,
          autoShow: true,
          frame: true,
          waitForPageLoad: false
        };
        supportURLWindow = new fin.desktop.Window(windowOptions, function () {
          supportURLWindow.show();
        });
      }
    };

    $scope.openSupportURL = function() {
      if ($scope.isOpenFin) {
        var supportURLWindow;
        var windowOptions = {
          url: $scope.supportURL,
          name: "GKTSupportForm",
          defaultLeft: 100,
          defaultTop: 15,
          defaultWidth: 1000,
          defaultHeight: 1060,
          autoShow: true,
          frame: true,
          waitForPageLoad: false
        };
        supportURLWindow = new fin.desktop.Window(windowOptions, function () {
          supportURLWindow.show();
        });
      } else {
        window.open($scope.supportURL);
      }
    };

    TVC.getProfile()
      .then(function(profile) {
        if (profile.voice_recognition) {
          $scope.showTranscriptionsLink = true;
        }
      });
  }

  function headerLinkFn(scope) {
    var page = $(window);
    var menu = $('.navbar-header .dropdown-menu.main-menu');
    var compactMenu = $('.compact-navbar-header .dropdown-menu.main-menu');
    var navHeader = $('.navbar.navbar-default');
    var pageHeight;

    function fixMenuHeight(menu) {
      var menuHeight = menu.scrollHeight;
      var finalHeight = menuHeight > pageHeight ? pageHeight : menuHeight;

      if (finalHeight > 0) {
        $(menu).outerHeight(finalHeight);
      }

      // Fix for bad browser scrollHeight calcs.
      if (menuHeight < pageHeight) {
        $(menu).css({'overflow-y': 'hidden'});
      } else {
        $(menu).css({'overflow-y': 'auto'});
      }
    }

    function checkMenuHeight() {
      var navHeaderHeight = navHeader.height();
      pageHeight = page.height() - navHeaderHeight;

      fixMenuHeight(menu[0]);
      fixMenuHeight(compactMenu[0]);
    }

    $(window).on('resize', function() {
      checkMenuHeight();
    });

    scope.onMenuClick = function(event) {
      setTimeout(function() {
        var elem = $(event.currentTarget);
        if (elem.attr('aria-expanded') === 'true' || elem.is('.open')) {
          checkMenuHeight();
        }
      }, 50);
    };
  }

})();

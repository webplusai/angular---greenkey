(function() {
  'use strict';

  angular.module('gkt.voiceBox.common')
    .directive('volumeMeter', function() {
      return {
        restrict: 'EA',
        controller: ['$scope', '$rootScope', '$element', '$timeout', 'commonConstants', meterCtrl],
        templateUrl: '/partials/common/volumeMeter.html',
        replace: true
      };
    });


  function meterCtrl($scope, $rootScope, $element, $timeout, constants) {

    /**
     * Offset in px which represents volume level
     */
    $scope.volumeOffest = 0;

    // _isVolumeMuted() function should be defined in a parent scope
    if (!angular.isFunction($scope._isVolumeMuted))
      return;

    /**
     * Interval in ms between element width checks.
     * Volume meter's accuracy is not a critical deal, so we can do it relatively seldom
     */
    var WIDTH_CHECK_TIMEOUT = 5000;

    /**
     * Quantity of steps volume level reach new value with.
     * Provides some visual smoothness.
     */
    var ANIMATION_DIVIDER = 4;
    var ANIMATION_TIMEOUT = Math.round(constants.UI.volumeEventTimeoutMs / ANIMATION_DIVIDER);

    var targetOffset = 0;
    var currentOffset = 0;
    var currentStep;
    /** New offset calculation timeout */
    var procTimeout;
    /** Checking volume bar width timeout */
    var widthTimeout;
    /** Listeners call status changes events */
    var unwatches = [];
    /** Listener to the volume change event */
    var offMeterListenerFn;

    function _clearProcTimeoutSafe() {
      if (procTimeout)
        $timeout.cancel(procTimeout);
    }

    function _clearWidthTimeoutSafe() {
      if (widthTimeout)
        $timeout.cancel(widthTimeout);
    }

    function _cleanUpWatches() {
      _.each(unwatches, function (deregisterFunction) {
        angular.isFunction(deregisterFunction) && deregisterFunction();
      });

      unwatches = [];
    }

    function _shouldMeterBeActive() {
      return _.isFunction($scope._isVolumeMuted) && !$scope._isVolumeMuted();
    }

    function _updateValue() {
      if (_shouldMeterBeActive()) {
        $scope.volumeOffest = Math.round($scope.barWidth * currentOffset / 100);
      }
    }

    function _proc() {
      if (Math.abs(targetOffset - currentOffset) < Math.abs(currentStep)) {
        currentOffset = targetOffset;
        _updateValue();
        return;
      }

      currentOffset += currentStep;
      _updateValue();
      procTimeout = $timeout(_proc, ANIMATION_TIMEOUT);
    }

    function _checkWidth() {
      if (_shouldMeterBeActive()) {
        var width = $element.width();
        if ($scope.barWidth !== width)
          $scope.barWidth = width;
      }

      widthTimeout = $timeout(_checkWidth, WIDTH_CHECK_TIMEOUT);
    }

    function _handleVolumeChange(event, volumeLevel, sinkId) {
      // TODO: Refactor this directive to use an isolated scope and avoid things like this in the whole directive.
      var connection = $scope.hoot || $scope.ringdown || $scope.call;
      var currentInput = connection.getAudioInputDeviceId();
      currentInput = currentInput ? currentInput : ''; // correction of 'null' values.

      if (currentInput !== sinkId) {
        return;
      }

      $timeout(function() {
        if (!_shouldMeterBeActive()) {
          $scope.volumeOffest = 0;
          return;
        }
        else if (!$scope.barWidth) {
          var width = $element.width();
          if (width <= 0) {
            $scope.volumeOffest = 0;
            return;
          } else {
            $scope.barWidth = $element.width();
          }
        }

        var newValue = Math.round(volumeLevel);
        if (isNaN(newValue) || newValue === targetOffset) {
          return;
        }

        _clearProcTimeoutSafe();
        currentStep = Math.round((newValue - currentOffset) / ANIMATION_DIVIDER);
        targetOffset = newValue;
        procTimeout = $timeout(_proc, ANIMATION_TIMEOUT);
      });
    }

    function _setUp() {
      $scope.barWidth = $element.width();
      widthTimeout = $timeout(_checkWidth, WIDTH_CHECK_TIMEOUT);
      offMeterListenerFn = $rootScope.$on(constants.UI_EVENTS.meter_volume_changed, _handleVolumeChange);
    }

    function _tearDown() {
      _.isFunction(offMeterListenerFn) && offMeterListenerFn();
      _clearWidthTimeoutSafe();
      _clearProcTimeoutSafe();
      // reset "rainbow" position
      $scope.volumeOffest = 0;
    }


    // For hoots we can enable listeners only when hoot is shouting
    if ($scope.hoot) {
      var initializeVolumeMeterForHoot = function() {
        if ($scope.hoot.emptySlot) {
          return;
        }

        // it needs to reinitialize volume meter after hoot movement
        if ($scope.isOutgoingShouting) {
          _setUp();
        }

        unwatches.push(
          $rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout, function(event, hoot) {
            if (hoot.uid === $scope.hoot.uid) {
              _setUp();
              console.log('hooooot start', hoot.contact.display_name);
            }
          }),

          $rootScope.$on(constants.GKT.CALL_EVENTS.outbound_shout_end, function(event, hoot) {
            if (hoot.uid === $scope.hoot.uid) {
              _tearDown();
              console.log('hooooot stop', hoot.contact.display_name);
            }
          })
        );
      };

      initializeVolumeMeterForHoot();
      // hoots could be moved to another slot and it needs to reinitialize volume meter after it
      $scope.$watch('hoot', function(newValue, oldValue) {
        // to prevent reinitialization after every digest cycle
        if (newValue === oldValue) {
          return;
        }

        _tearDown();
        initializeVolumeMeterForHoot();
      });
    }
    // And enable it anyway if it's not a hoot
    else {
      _setUp();
    }

    $scope.$on('$destroy', function() {
      _tearDown();
      _cleanUpWatches();
    });
  }
})();

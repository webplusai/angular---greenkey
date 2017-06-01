(function(){
    'use strict';

    angular.module('gkt.voiceBox.services')
        .factory('JsMediaQueryService', ['$rootScope', '$timeout', 'tvbUIState', 'commonConstants', '$window',
            function ($rootScope, $timeout, tvbUIState, commonConstants, $window) {
                function handleCompactMode(mediaQuery) {
                    $timeout(function() {
                        if(mediaQuery.matches) {
                            tvbUIState.compactMode = true;
                            angular.element('body').addClass('compact');
                        } else {
                            tvbUIState.compactMode = false;
                            angular.element('body').removeClass('compact');
                        }
                        $rootScope.$emit(commonConstants.UI_EVENTS.compact_mode_toggled, tvbUIState.compactMode);
                    });
                }

                function _watchCompactMode(){
                    if($window.matchMedia) {
                        var query = $window.matchMedia("(max-width: 1200px)");

                        query.addListener(handleCompactMode);
                        handleCompactMode(query);
                    }
                }

                function handleWideScreenMode(wideScreenQuery) {
                    $timeout(function() {
                        tvbUIState.wideScreenMode = Boolean(wideScreenQuery.matches);
                        $rootScope.$emit(commonConstants.UI_EVENTS.wide_screen_mode_toggled, tvbUIState.wideScreenMode);
                    });
                }

                function _watchWideMode(){
                    var wideScreenQuery = $window.matchMedia("(min-width: 1600px)");
                    handleWideScreenMode(wideScreenQuery);
                    wideScreenQuery.addListener(handleWideScreenMode);
                }

                return{
                    watchCompactMode: _watchCompactMode,
                    watchWideMode: _watchWideMode
                };
            }
        ]);
})();

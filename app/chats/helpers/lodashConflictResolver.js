(function () {

  // it needs to restore old _ before some code depending on it will be run
  if (typeof window._ !== 'undefined' && typeof window._.noConflict === 'function') {
    window.lodash =  window._.noConflict();
  }

})();
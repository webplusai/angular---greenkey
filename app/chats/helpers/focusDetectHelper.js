(function() {

  if (window.isFocusHelperInitialized && typeof window.hasFocus === 'boolean') {
    return;
  }


  window.addEventListener('focus', function() {
    window.hasFocus = true;
  });

  window.addEventListener('blur', function() {
    window.hasFocus = false;
  });

  window.hasFocus = true;
  window.isFocusHelperInitialized = true;
})();
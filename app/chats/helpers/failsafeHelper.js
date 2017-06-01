function FailsafeHelper() {
  this.lastDomStrings = {};
  this.observerConfig = {
    attributes: true,
    childList: true,
    characterData: true,
    subtree: true
  };
}

FailsafeHelper.prototype.init = function (chatDocument, chat, domChangeListener) {
  var self = this;

  if (!chatDocument) {
    console.warn('Unable to initialize observer');
    return;
  }

  var observer = new MutationObserver(function () {
    var domString = chatDocument.body.innerText;
    if (domString !== self.lastDomStrings[chat]) {
      domChangeListener(domString);
      self.lastDomStrings[chat] = domString;
    }
  });

  observer.observe(chatDocument, this.observerConfig);
};

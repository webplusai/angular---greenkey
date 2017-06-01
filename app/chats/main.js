(function(_, uuidGenerator) {

  "use strict";

  /** BinaryDataHelpers **/

  /** FailsafeHelper **/

  /** NotificationHelper **/

  /** TornChatsAutoOpener **/

  /** FocusDetectHelper **/

  /** ChatController **/

  /** ChatUiController **/

  /** ChatDataProvider **/

  /** ChatBlastDialog **/

  /** WhatsAppChatController **/

  /** WhatsAppChatUiController **/

  /** WhatsAppChatDataProvider **/

  /** WeChatController **/

  /** WeChatUiController **/

  /** WeChatDataProvider **/

  /** YahooContactsImportDialog **/

  /** YahooChatController **/

  /** YahooChatUiController **/

  /** YahooChatDataProvider **/

  /** AimChatController **/

  /** AimChatUiController **/

  /** AimChatDataProvider **/
  

  /**
   * Provides a communication between chat window and main window via post messages
   * @var Mediator
   */
  var eventsBus = new Mediator();

  window.addEventListener('message', function(messageEvent) {
    var message = messageEvent.data;
    eventsBus.publish(message.type, message.data);
  });


  var controller;

  eventsBus.subscribe('init', function(options) {
    if (!options || !_.isString(options.network)) {
      return;
    }

    // prevent double initialization
    if (controller) {
      return;
    }

    switch (options.network) {
      // TODO pass whole "options" as a second argument
      case 'whatsapp':
        controller = new WhatsAppChatController(eventsBus, options.id, 
          options.tornChatsUids);
        break;
      case 'wechat':
        // we can't use console in WeChat window by default,
        // so we need to restore it first
        delete window.console;
        controller = new WeChatController(eventsBus, options.id,
          options.tornChatsUids);
        break;
      case 'yahoo':
        // TODO remove greeting message - it's not used now
        controller = new YahooChatController(eventsBus, options.id,
          options.tornChatsUids, options.blastGroups, options.greetingMessage);
        break;
      case 'aim':
        controller = new AimChatController(eventsBus, options.id,
          options.tornChatsUids);
        break;
    }

    window.isChatControllerInitialized = Boolean(controller);
  });

})(lodash, UUID);
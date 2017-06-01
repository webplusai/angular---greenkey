function ContactRequestManagerService(tvcWebSocket) {

  var mediator = new Mediator();
  var eventNames = {
    contact_request_add: GKTConstants.APP_EVENTS.contact_request_add,
    contact_request_update: GKTConstants.APP_EVENTS.contact_request_update,
    contact_request_delete: GKTConstants.APP_EVENTS.contact_request_delete
  };
  var requestEventTypes = [
    eventNames.contact_request_add,
    eventNames.contact_request_update,
    eventNames.contact_request_delete
  ];

  this.addNewRequestListener = mediator.on.bind(mediator, eventNames.contact_request_add);
  this.addUpdateListener = mediator.on.bind(mediator, eventNames.contact_request_update);
  this.addDeleteListener = mediator.on.bind(mediator, eventNames.contact_request_delete);

  this.removeNewRequestListener = mediator.off.bind(mediator, eventNames.contact_request_add);
  this.removeUpdateListener = mediator.off.bind(mediator, eventNames.contact_request_update);
  this.removeDeleteListener = mediator.off.bind(mediator, eventNames.contact_request_delete);

  function init() {
    _.each(requestEventTypes, function(eventName) {
      tvcWebSocket.addMessageListener(eventName, function(event, type, reqData) {
        mediator.trigger(eventName, reqData);
      });
    });
  }

  init();
}

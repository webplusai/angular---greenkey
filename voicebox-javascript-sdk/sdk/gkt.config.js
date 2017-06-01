'use strict';

/**
 *
 * @type RemoteConfig
 */
function RemoteConfig(tvc) {
  var properties = {};

  var isPushing = false;
  var updateQueue = [];

  var mediator = new Mediator();

  this.init = function (initialProperties) {
    _mergeInUpdatedProps(initialProperties);

    var configReloadInterval = this.getInteger("gkt.CONFIG_RELOAD_INTERVAL", 60000);
    if (configReloadInterval > 0)
      window.setInterval(reloadConfig, configReloadInterval);
  };

  this.getProperty = function (name, defaultValue) {
    return name in properties ? properties[name] : defaultValue;
  };

  this.getBoolean = function (name, defaultValue) {
    if (!(name in properties) ||
      properties[name] === undefined || properties[name] === null)
      return !!defaultValue;

    var value = properties[name];
    return _.isBoolean(value) ? value : value.toLowerCase() === 'true';
  };

  this.getInteger = function (name, defaultValue) {
    return name in properties && properties[name] && !isNaN(properties[name])
      ? parseInt(properties[name])
      : defaultValue;
  };

  this.getJSON = function (name, defaultValue) {
    try {
      return name in properties && properties[name]
        ? JSON.parse(properties[name])
        : defaultValue;
    } catch (e) {
      console.error("Config property expected to be JSON object: " + name,
        "Current value is:\n", properties[name],
        "Exception caught: ", e);
      return defaultValue;
    }
  };


  /**
   * @typedef {Object} RemoteConfig~PropertyUpdateEvent Information about a property update.
   * @property {string} propertyName Name of the updated property.
   * @property {string|number|boolean} oldValue Value before update.
   * @property {string|number|boolean} newValue Value after update.
   */

  /**
   * @callback RemoteConfig~PropertyUpdateListener
   * @param {RemoteConfig~PropertyUpdateEvent} Information about a property update.
   */

  /**
   * Add listener for property updates coming from server or triggered by local "set" operations.
   * @param {RemoteConfig~PropertyUpdateListener} listener
   */
  this.addPropertyUpdatedListener = function (listener) {
    mediator.on(GKTConstants.APP_EVENTS.config_property_updated, listener);
  };

  /**
   * Remove listener for property updates coming from server or triggered by local "set" operations.
   * @param RemoteConfig~PropertyUpdateListener listener
   */
  this.removePropertyUpdatedListener = function (listener) {
    mediator.off(GKTConstants.APP_EVENTS.config_property_updated, listener);
  };

  function _mergeInUpdatedProps(updatedProperties) {
    if (!updatedProperties) updatedProperties = {};
    var allPropNames = _.union(_.keys(updatedProperties), _.keys(properties));

    _.each(allPropNames, function(propName) {
      var isOldValue = propName in properties;
      var isNewValue = propName in updatedProperties;
      var oldValue = properties[propName];
      var newValue = updatedProperties[propName];

      // if the prop was added/removed or changed its value
      if (isOldValue !== isNewValue || oldValue !== newValue) {
        properties[propName] = newValue;
        mediator.trigger(GKTConstants.APP_EVENTS.config_property_updated, {
          propertyName: propName,
          oldValue: oldValue,
          newValue: newValue
        });
      }
    });
  }

  function reloadConfig() {
    tvc.getCurrentConfig()
      .then(_mergeInUpdatedProps)
      .catch(function(error) {
        console.log(
          "Unable to get properties from TVC provision service",
          error
        );
      });
  }

  function pushProvision(propertiesToUpdate) {
    // concurrent queries led to the loss of actual values of properties
    // because all of them are updated together and at once with data from last response
    if (isPushing) {
      updateQueue.push(propertiesToUpdate);
      return;
    }

    isPushing = true;

    tvc.postConfigAndGetUpdated(propertiesToUpdate || properties)
      .then(function () {
        isPushing = false;
        // if there are updated properties values it needs to store them and reset the queue
        if (updateQueue.length > 0) {
          var combinedProperties = {};
          updateQueue.forEach(function (propertiesFromQueue) {
            _.assign(combinedProperties, propertiesFromQueue);
          });

          updateQueue = [];
          return pushProvision(combinedProperties);
        }
      })
      .catch(function (error) {
        console.log("Unable to push properties to TVC provision service and get updated ", error);
      });
  }

  this.setProperty = function (name, value) {
    var oldValue = properties[name];
    properties[name] = value;
    mediator.trigger(GKTConstants.APP_EVENTS.config_property_updated, {
      propertyName: name,
      oldValue: oldValue,
      newValue: value
    });
    var propertyToUpdate = {};
    propertyToUpdate[name] = value;
    pushProvision(propertyToUpdate);
  };

}
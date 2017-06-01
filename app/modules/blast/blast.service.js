(function() {
  'use strict';

  var PROP_BLAST_CONFIG = "tvbweb.SHARED.BLAST_CONFIG";

  angular.module('gkt.voiceBox.blast')
    .factory('Blasts', [
      '$rootScope',
      '$localStorage',
      '$timeout',
      'commonConstants',
      'GKT',
      'CallManager',
      function($rootScope, $localStorage, $timeout, constants, GKT, CallManager) {

        GKT.addConfiguredListener(function() {
          CallManager.getHootConnections().then(_loadFormStorage);
        });

        /* Define Blast Group */
        /**
         * Blast group model
         * @param id blast group id
         * @param name blast group name
         * @constructor
         */
        function BlastGroup(id, name) {
          this.id = id;
          this.name = name;
          this.type = constants.GKT.CONTACT_TYPE.blastGroup; //hoot compatibility
          this.isInPttMode = true;
          this.shouting = false; // transient
          this._members = []; //hoots of the group
          this._pausedMembers = [];
        }

        BlastGroup.TRANSIENTS = ['shouting'];

        BlastGroup.prototype.load = function(data) {
          this.id = data.id;
          this.name = data.name;
          this.isInPttMode = Boolean(data.isInPttMode);
          this._members = data._members.slice();
          this._pausedMembers = _.slice(data._pausedMembers);
        };

        BlastGroup.prototype.isMember = function(contactUid) {
          return this._members.indexOf(contactUid) > -1;
        };

        BlastGroup.prototype.getMembersQty = function() {
          return this._members.length;
        };

        BlastGroup.prototype._toggleListItem = function(list, item) {
          if (_.isArray(list)) {
            var index = list.indexOf(item);
            index > -1 ? list.splice(index, 1) : list.push(item);
          }
        };

        BlastGroup.prototype.toggleMember = function(contactUid) {
          this._toggleListItem(this._members, contactUid);
          _.pull(this._pausedMembers, contactUid);
        };

        BlastGroup.prototype.togglePausedStatus = function(contactUid) {
          this._toggleListItem(this._pausedMembers, contactUid);
        };

        BlastGroup.prototype.isPaused = function(contactUid) {
          return this._pausedMembers.indexOf(contactUid) > -1;
        };

        BlastGroup.prototype.getPausedMembersQty = function() {
          return this._pausedMembers.length;
        };

        BlastGroup.prototype.getUnpausedMembersQty = function() {
          return this._members.length - this._pausedMembers.length;
        };

        BlastGroup.prototype.filterMembers = function(currentIds) {
          var wasModified = false;
          _.each(this._members.slice(), function(id) {
            if(!_.includes(currentIds, id)) {
              wasModified = true;
              this.toggleMember(id);
            }
          }.bind(this));

          return wasModified;
        };


        /* Service */

        var _blastGroupsById = {};
        var _modified = false;
        var idCounter = 0;
        var blastsMediator = new Mediator();

        var BLAST_CREATION_EVENT = 'blast_created',
            BLAST_REMOVAL_EVENT = 'blast_removed';

        var justCreatedGroups = new Set(),
            removedGroups = new Set();

        function _removeNonHoots(hoots) {
          var hootIds = _.keys(hoots);
          _.each(_.values(_blastGroupsById), function(group) {
            var wasModified = group.filterMembers(hootIds);
            _modified = _modified || wasModified;
          })
        }

        function _loadFormStorage(hoots) {
          var blastConfig = GKTConfig.getProperty(PROP_BLAST_CONFIG, []);

          _blastGroupsById = {};
          _.each(blastConfig, function(groupData) {
            var group = new BlastGroup();
            group.load(groupData);
            _blastGroupsById[group.id] = group;
          });

          _removeNonHoots(hoots);
          _saveToStorage();

          idCounter = blastConfig.length === 0 ? 0 : _.max(
            _.map(blastConfig, function(blast) {
            return blast.id.substr(12)*1;
          }));

          _modified = false;
        }

        function _restoreFormStorage() {
          var blastConfig = GKTConfig.getProperty(PROP_BLAST_CONFIG, []);
          var group;

          _.each(blastConfig, function(groupData) {
            group = _blastGroupsById[groupData.id];

            if (group) {
              group.load(groupData);
            } else {
              group = new BlastGroup();
              _blastGroupsById[group.id] = group;
            }
          });

          _.each(_.keys(_blastGroupsById), function(groupId) {
            group = _.find(blastConfig, { id: groupId });
            if (!group) {
              delete _blastGroupsById[groupId];
            }
          });

          idCounter = blastConfig.length === 0 ? 0 : _.max(_.map(blastConfig, function(blast) {
            return blast.id.substr(12)*1;
          }));

          _modified = false;
        }

        function _saveToStorage(forcedSave) {
          if (!_modified && !forcedSave) return;

          var blastGroups = _.values(_blastGroupsById);
          var itemData;

          var blastStore = _.map(blastGroups, function(item) {
            itemData = _.omit(item, BlastGroup.TRANSIENTS);
            itemData._members = item._members.slice();
            return itemData;
          });

          GKTConfig.setProperty(PROP_BLAST_CONFIG, blastStore);

          $rootScope.$emit(constants.UI_EVENTS.blasts_saved);
          if ((justCreatedGroups.size + removedGroups.size) > 0) {
            $rootScope.$emit(constants.UI_EVENTS.blasts_list_updated);
          }

          // send events reporting about changes inside blasts list
          justCreatedGroups.forEach(blastsMediator.publish.bind(blastsMediator, BLAST_CREATION_EVENT));
          removedGroups.forEach(blastsMediator.publish.bind(blastsMediator, BLAST_REMOVAL_EVENT));
          // and then remove already unnecessary data
          justCreatedGroups.clear();
          removedGroups.clear();

          _modified = false;
        }

        function generateBlastId(){
            return 'blast-group-' + (++idCounter);
        }

        function _createGroup(name) {
          var newId = generateBlastId(),
              blast = new BlastGroup(newId, name);

          _blastGroupsById[newId] = blast;
          justCreatedGroups.add(blast);
          _modified = true;
        }

        var _deleteGroup = function(groupId) {
          var blast = _blastGroupsById[groupId];
          // it doesn't need to fire "Blast Removal" event for unsaved yet items
          justCreatedGroups.has(blast) ? justCreatedGroups.delete(blast) : removedGroups.add(blast);
          delete _blastGroupsById[groupId];
          _modified = true;
        };

        function _toggleContact(groupId, contactId) {
          var group = _blastGroupsById[groupId];
          if (!group) return;

          group.toggleMember(contactId);
          _modified = true;
        }

        function _togglePausedStatus(groupId, contactUid) {
          var group = _blastGroupsById[groupId];

          if (group && group.isMember(contactUid)) {
            group.togglePausedStatus(contactUid);
            _modified = true;
          }
        }

        // handle deletion of a hoot
        CallManager.addOnRemoveConnectionListener(function(connection) {
          if (connection.type !== constants.GKT.CONTACT_TYPE.hoot) return;
          var uid = connection.uid;
          _.each(_blastGroupsById, function(group) {
            if (group.isMember(uid)) {
              group.toggleMember(uid);
            }
          });
          _saveToStorage();
        });

        return {
          getAll: function() {
            return _.sortBy(_blastGroupsById, 'name');
          },
          getGroup: function(groupId) {
            return groupId ? _blastGroupsById[groupId] : null;
          },
          groupExists: function(groupId) {
            return groupId && Boolean(_blastGroupsById[groupId]);
          },
          createGroup: _createGroup,
          deleteGroup: _deleteGroup,
          isModified: function() {
            return _modified;
          },
          save: _saveToStorage,
          discard: _restoreFormStorage,
          toggleContact: _toggleContact,
          togglePausedStatus: _togglePausedStatus,

          addBlastCreationListener: function(listener) {
            _.isFunction(listener) && blastsMediator.on(BLAST_CREATION_EVENT, listener);
          },
          addBlastRemovalListener: function(listener) {
          _.isFunction(listener) && blastsMediator.on(BLAST_REMOVAL_EVENT, listener);
          }
        };
      }]);
})();
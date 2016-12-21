/**
 * Created by rharik on 7/13/15.
 */
"use strict";

module.exports = function(AggregateRootBase, invariant, uuid) {
    return class Client extends AggregateRootBase {
        constructor() {
            super();
            var _isArchived;
            this.type = 'Client';
        }

        static aggregateName() {
            return 'Client';
        }

        commandHandlers() {
            return {
                'addClient'   : function(cmd) {
                    this.raiseEvent({
                        eventName     : 'clientAdded',
                        data          : {
                            id         : uuid.v4(),
                            contact    : cmd.contact,
                        }
                    });
                },
                'updateClientInfo'   : function(cmd) {
                    this.expectNotArchived();
                    this.raiseEvent({
                        eventName     : 'clientInfoUpdated',
                        data          : cmd
                    });
                },
                'updateClientContact'   : function(cmd) {
                    this.expectNotArchived();
                    this.raiseEvent({
                        eventName     : 'clientContactUpdated',
                        data          : cmd
                    });
                },
                'updateClientAddress'   : function(cmd) {
                    this.expectNotArchived();
                    this.raiseEvent({
                        eventName     : 'clientAddressUpdated',
                        data          : cmd
                    });
                },
                'archiveClient': function(cmd) {
                    this.expectNotArchived();
                    this.raiseEvent({
                        eventName: 'clientArchived',
                        data     : {
                            id          : this._id,
                            archivedDate: new Date()
                        }
                    });
                },
                'unArchiveUser' : function(cmd) {
                    this.expectArchived();
                    this.raiseEvent({
                        eventName: 'clientUnarchived',
                        data     : {
                            id            : this._id,
                            unArchivedDate: new Date()
                        }
                    });
                }
            }
        }

        applyEventHandlers() {
            return {
                'clientAdded': function(event) {
                    this._id       = event.data.id;
                }.bind(this),

                'userArchived': function(event) {
                    this._isArchived = true;
                }.bind(this),

                'userUnarchived': function(event) {
                    this._isArchived = false;
                }.bind(this)
            }
        }

        expectNotArchived() {
            invariant(this._isArchived,
                new Error('Client already archived'));
        }

        expectArchived() {
            invariant(!this._isArchived,
                new Error('Client is not archived archived'));
        }
    }
};
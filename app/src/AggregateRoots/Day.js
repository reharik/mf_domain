module.exports = function(AggregateRootBase, invariant, uuid, moment) {
    return class Day extends AggregateRootBase {
        constructor() {
            super();
            this.type = 'Day';
            this.appointments = [];
        }

        static aggregateName() {
            return 'Day';
        }

        getNewAppointmentId(startTime, endTime, trainer) {
            var item = this.appointments.find(x => 
            x.startTime === startTime
            && x.endTime === endTime
            && x.trainer === trainer);
            return item ? item.id : undefined;
        }

        commandHandlers() {
            const updateAppointment = function(cmd) {
                this.expectEndTimeAfterStart(cmd);
                this.expectAppointmentDurationCorrect(cmd);
                this.expectCorrectNumberOfClients(cmd);
                this.expectTrainerNotConflicting(cmd);
                this.expectClientsNotConflicting(cmd);

                this.raiseEvent({
                    eventName: this.mapCommandToEvent(cmd),
                    data: {
                        id: cmd.appointmentId,
                        appointmentType: cmd.appointmentType,
                        date: cmd.date,
                        startTime: cmd.startTime,
                        endTime: cmd.endTime,
                        trainer: cmd.trainer,
                        clients: cmd.clients,
                        notes: cmd.notes,
                        entityName: cmd.entityName
                    }
                });
            }.bind(this);

            const scheduleAppointment = function (cmd) {
                this.expectEndTimeAfterStart(cmd);
                this.expectAppointmentDurationCorrect(cmd);
                this.expectCorrectNumberOfClients(cmd);
                this.expectTrainerNotConflicting(cmd);
                this.expectClientsNotConflicting(cmd);
                var id = cmd.commandName === 'scheduleAppointment' || cmd.commandName === 'rescheduleAppointmentToNewDay'
                  ? uuid.v4() : cmd.appointmentId;
                this.raiseEvent({
                    eventName: this.mapCommandToEvent(cmd),
                    data: {
                        id,
                        appointmentType: cmd.appointmentType,
                        date: cmd.date,
                        startTime: cmd.startTime,
                        endTime: cmd.endTime,
                        trainer: cmd.trainer,
                        clients: cmd.clients,
                        notes: cmd.notes,
                        entityName: cmd.entityName
                    }
                });
            }.bind(this);

            const _cancelAppointment = function (cmd) {
                // put lots of business logic here!
                this.raiseEvent({
                    eventName: 'appointmentCanceled',
                    data: {
                        id: cmd.appointmentId
                    }
                });
            }.bind(this);

            return {
                'scheduleAppointment': function(cmd) {
                    scheduleAppointment(cmd);
                },
                'rescheduleAppointmentToNewDay': function(cmd) {
                    if(this._id === cmd.originalEntityName){
                        _cancelAppointment(cmd);
                    } else if(!this._id || this._id === cmd.entityName) {
                        scheduleAppointment(cmd);
                    }
                },
                'changeAppointmentType': function(cmd) {
                    updateAppointment(cmd);
                },
                'updateNotesForAppointment': function(cmd) {
                    updateAppointment(cmd);
                },
                'changeAppointmentClients': function(cmd) {
                    updateAppointment(cmd);
                },
                'changeAppointmentTrainer': function(cmd) {
                    updateAppointment(cmd);
                },
                'rescheduleAppointmentTime': function(cmd) {
                    updateAppointment(cmd);
                },

                'cancelAppointment': function(cmd) {
                    _cancelAppointment(cmd);
                }

            }
        }

        mapCommandToEvent(cmd) {
            switch(cmd.commandName){
                case 'changeAppointmentType':{
                    return 'appointmentTypeChanged'
                }
                case 'changeAppointmentClients':{
                    return 'clientsChangedForAppointment'
                }
                case 'changeAppointmentTrainer':{
                    return 'trainerChangedForAppointment'
                }
                case 'rescheduleAppointmentTime':{
                    return 'timeChangedForAppointment'
                }
                case 'updateNotesForAppointment': {
                    return 'notesForAppointmentUpdated'
                }
                case 'rescheduleAppointmentToNewDay':{
                    if(this._id === cmd.originalEntityName){
                        return 'appointmentMovedToDifferentDay';
                    } else if(!this._id || this._id === cmd.entityName) {
                        return 'appointmentMovedFromDifferentDay';
                    }
                    break;
                }
                case 'cancelAppointment':{
                    return 'appointmentCanceled'
                }
                case 'scheduleAppointment':{
                    return 'appointmentScheduled'
                }
            }
        }

        applyEventHandlers() {
            const _appointmentScheduled = function (event) {
                if(!this._id){
                    this._id = event.data.entityName;
                }
                this.appointments.push({
                    id: event.data.id,
                    appointmentType: event.data.appointmentType,
                    startTime: event.data.startTime,
                    endTime: event.data.endTime,
                    trainer: event.data.trainer,
                    clients: event.data.clients
                });
            }.bind(this);

            const appointmentUpdated = function (event) {
                this.appointments.forEach(x => {
                    if (x.id === event.data.id) {
                        x.appointmentType = event.data.appointmentType;
                        x.startTime = event.data.startTime;
                        x.endTime = event.data.endTime;
                        x.trainer = event.data.trainer;
                        x.clients = event.data.clients;
                    }
                });
            }.bind(this);

            const _appointmentCanceled = function (event) {
                this.appointments = this.appointments.filter(x=> x.id !== event.data.id);
            }.bind(this);

            return {
                'appointmentMovedFromDifferentDay': function (event) {
                    _appointmentScheduled(event);
                },
                'appointmentScheduled': function (event) {
                    _appointmentScheduled(event);
                },
                'appointmentMovedToDifferentDay': function (event) {
                    _appointmentCanceled(event);
                },
                'appointmentCanceled': function (event) {
                    _appointmentCanceled(event);
                },
                'appointmentTypeChanged': function (event) {
                    appointmentUpdated(event);
                },
                'clientsChangedForAppointment': function (event) {
                    appointmentUpdated(event);
                },
                'trainerChangedForAppointment': function (event) {
                    appointmentUpdated(event);
                },
                'timeChangedForAppointment': function (event) {
                    appointmentUpdated(event);
                },
                'notesForAppointmentUpdated': function (event) {
                    appointmentUpdated(event);
                }
            }
        };

        expectEndTimeAfterStart(cmd) {
            invariant(moment(cmd.endTime).isAfter(moment(cmd.startTime))
              , 'Appointment End Time must be after Appointment Start Time');
        }

        expectAppointmentDurationCorrect(cmd) {
            var diff = moment(cmd.endTime).diff(moment(cmd.startTime), 'minutes');
            switch (cmd.appointmentType) {
                case 'halfHour':
                {
                    invariant(diff === 30,
                        'Given the Appointment Type of Half Hour the start time must be 30 minutes after the end time');
                    break;
                }
                case 'fullHour':
                {
                    invariant(diff === 60,
                        'Given the Appointment Type of Full Hour the start time must be 60 minutes after the end time');
                    break;
                }
                case 'pair':
                {
                    invariant(diff === 60,
                        'Given the Appointment Type of Pair the start time must be 60 minutes after the end time');
                    break;
                }
            }
        }

        expectCorrectNumberOfClients(cmd) {
            switch (cmd.appointmentType) {
                case 'halfHour':
                case 'fullHour':
                {
                    invariant(cmd.clients && cmd.clients.length === 1,
                        `Given the Appointment Type of ${cmd.appointmentType} you must have 1 and only 1 client assigned`);
                    break;
                }
                case 'pair':
                {
                    invariant(cmd.clients && cmd.clients.length >= 2,
                        `Given the Appointment Type of Pair you must have 2 or more clients assigned`);
                    break;
                }
            }
        }

        expectTrainerNotConflicting(cmd) {
            var trainerConflict = this.appointments.filter(x=>
                x.id && x.id !== cmd.appointmentId
                && moment(x.startTime).isBetween(cmd.startTime, cmd.endTime, 'minutes','[]')
                ||
                x.id && x.id !== cmd.appointmentId
                && moment(x.endTime).isBetween(cmd.startTime, cmd.endTime, 'minutes'),'[]')
                .filter( x=> x.trainer === cmd.trainer);
            invariant(trainerConflict.length <= 0, `New Appointment conflicts with this Appointment: ${trainerConflict[0] && trainerConflict[0].id} 
                for this trainer: ${cmd.trainer}.`);
        }

        expectClientsNotConflicting(cmd) {
            var clientConflicts = this.appointments.filter(x =>
            x.id && x.id !== cmd.appointmentId
            && moment(x.startTime).isBetween(cmd.startTime, cmd.endTime, 'minutes','[]')
            ||
            x.id && x.id !== cmd.appointmentId
            && moment(x.endTime).isBetween(cmd.startTime, cmd.endTime, 'minutes','[]'))
                .filter(x => x.clients.some(c => cmd.clients.some(c2 => c.id === c2.id)));
            invariant(clientConflicts.length <= 0, `New Appointment conflicts with this Appointment: ${clientConflicts[0] && clientConflicts[0].id} 
                for at least one client.`);
        }
    }
};

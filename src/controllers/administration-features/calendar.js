const { google } = require('googleapis');
const Joi = require("@hapi/joi");
const moment = require("moment-timezone");

const knexReader = require('../../db/knex-reader');
const googleCalendarSync = require('../../helpers/google-calendar-sync');
  
const calendarController = {
    getEvents: async (req, res, next) => {
        try {
            const userId = req.me.id;
            const orgId = req.orgId;

            const { data, error } = await googleCalendarSync.getAllEventsFromGoogleCalendar(+userId, +orgId);

            if(error) {
                return res.status(400).json({
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(200).json({
                data: {
                    events: data.events
                }
            });
        } catch(error) {
            console.error("[controllers][administration-features][calendarController][getEvents]: Error", error);
            return res.status(500).json({
                errors: [
                    { code: "UNKNOWN_SERVER_ERROR", message: error.message },
                ],
            });
        }
    },

    createEvent: async (req, res, next) => {
        try {
            const userId = req.me.id;
            const orgId = req.orgId;
            
            let payload = req.body;

            moment.tz.setDefault('Asia/Bangkok');

            const today = moment().set({
                hour: 0,
                minute: 0,
                second: 0
            }).toISOString();

            const schema = Joi.object().keys({
                title: Joi.string().required(),
                description: Joi.string().required(),
                startTime: Joi.date().greater(today).iso().required(),
                endTime: Joi.date().greater(Joi.ref('startTime')).iso().required()
            });

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            const { data, error } = await googleCalendarSync.addEventToCalendar(
                +userId,
                +orgId,
                payload.title,
                payload.description,
                payload.startTime,
                payload.endTime,
                'custom'
            );

            if(error) {
                return res.status(400).json({
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(201).json({
                data: {
                    event: data.event
                }
            });
        } catch(error) {
            console.error("[controllers][administration-features][calendarController][createEvent]: Error", error);
            return res.status(500).json({
                errors: [
                    { code: "UNKNOWN_SERVER_ERROR", message: error.message },
                ],
            });
        }
    },

    updateEvent: async (req, res, next) => {
        try {
            const userId = req.me.id;
            const orgId = req.orgId;

            const { id } = req.params;

            let payload = req.body;

            moment.tz.setDefault('Asia/Bangkok');

            const today = moment().set({
                hour: 0,
                minute: 0,
                second: 0
            }).toISOString();


            const schema = Joi.object().keys({
                title: Joi.string().required(),
                description: Joi.string().required(),
                startTime: Joi.date().greater(today).iso().required(),
                endTime: Joi.date().greater(Joi.ref('startTime')).iso().required()
            });

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            const { data, error } = await googleCalendarSync.updateEventInCalendar(
                +userId,
                +orgId,
                payload.title,
                payload.description,
                payload.startTime,
                payload.endTime,
                'custom',
                null,
                id
            );

            if(error) {
                return res.status(400).json({
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(201).json({
                data: {
                    event: data.event
                }
            });

        } catch(error) {
            console.error("[controllers][administration-features][calendarController][createEvent]: Error", error);
            return res.status(500).json({
                errors: [
                    { code: "UNKNOWN_SERVER_ERROR", message: error.message },
                ],
            });
        }
    },

    deleteEvent: async (req, res, next) => {
        try {
            const userId = req.me.id;
            const orgId = req.orgId;

            const { id } = req.params;

            const { data, error } = await googleCalendarSync.deleteEventFromCalendar(
                +userId,
                +orgId,
                'custom',
                null,
                id
            );

            if(error) {
                return res.status(400).json({
                    error: {
                        code: error.code,
                        message: error.message
                    }
                });
            }

            return res.status(200).json({
                data: {
                    message: 'Event deleted successfully.'
                }
            });

        } catch(error) {
            console.error("[controllers][administration-features][calendarController][deleteEvent]: Error", error);
            return res.status(500).json({
                errors: [
                    { code: "UNKNOWN_SERVER_ERROR", message: error.message },
                ],
            });
        }
    }
};

module.exports = calendarController;
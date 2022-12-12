const { google } = require('googleapis');
const Joi = require("@hapi/joi");

const knex = require('../db/knex');
const knexReader = require('../db/knex-reader');

const googleCalendarSync = {
    /**
     * @param {number} userId
     * @param {number} orgId
     * @param {string} title
     * @param {string} description
     * @param {string} startDate - start date in ISO format
     * @param {string} endDate - end date in ISO format
     * @param {string} entityType
     * @param {number} entityId
     * @returns {Promise}  Promise object which resolves to either data or error object
     */
    addEventToCalendar: async function (userId, orgId, title, description, startDate, endDate, entityType, entityId) {
        try {
            const schema = Joi.object().keys({
                userId: Joi.number().required(),
                orgId: Joi.number(),
                title: Joi.string().required(),
                description: Joi.string().required(),
                startDate: Joi.date().greater(new Date(new Date().setHours(0, 0, 0)).toISOString()).iso().required(),
                endDate: Joi.date().greater(Joi.ref('startDate')).iso().required(),
                entityType: Joi.string().required(),
                entityId: Joi.number().required(),
                // eventType: Joi.string().valid('single', 'recurring').required(), - if we want to support recurring events in future
                // recurrence: Joi.array().items(Joi.string()).when('eventType', {
                //     is: 'recurring',
                //     then: Joi.required()
                // })
            });

            const result = Joi.validate({ userId, orgId, title, description, startDate, endDate, entityType, entityId }, schema);

            console.log('[helpers][google-calendar-sync][addEventToCalendar]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { 
                   error: {
                        code: 'PARAMS_VALIDATION_ERROR', 
                        message: + result.error.message, 
                        error: new Error('Could Not add event to Google calendar due to params validations failure.') 
                    }
                };
            }

            let googleAccount = await knexReader('social_accounts').where({ userId: userId, accountName: 'GOOGLE' }).first();
            if(!googleAccount) {
                return {
                    error: {
                        code: "ACCOUNT_NOT_FOUND",
                        message: 'Please connect your Google account to use this API',
                        error: new Error('Please connect your Google account to use this API')
                    }
                }
            }

            const existingEvent = await knexReader('google_calendar_events').where({
                userId: userId,
                orgId: orgId,
                eventEntityId: entityId,
                eventEntityType: entityType
            }).first();

            if(existingEvent) {
                console.log('[helpers][google-calendar-sync][addEventToCalendar]: Event already exists -- updating existing event');
                const data =  this.updateEventInCalendar(userId, orgId, title, description, startDate, endDate, entityType, entityId);
                return data;
            }

            const { refreshToken, calendarId } = googleAccount.details;

            const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
            const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
            const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
            const oauthScope =
            "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

            const REDIRECT_URL = 'https://app.cantrak.tech' + '/' + GOOGLE_REDIRECT_URL;

            const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: oauthScope
            });

            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            let googleCalendar;
            try {
                googleCalendar =  await calendar.calendars.get({
                    calendarId: calendarId,
                  });
            } catch(error) {
                console.error("[helpers][google-calendar-sync][addEventToCalendar]: [Error] Calendar Not Found", error);
                return {
                    error: {
                        code: "CALENDAR_NOT_FOUND",
                        message: 'Cantrak calendar not found in the Google Calendar',
                        error: new Error('Cantrak calendar not found in the Google Calendar')
                    }
                }
            }

            switch(entityType) {
                case 'work_order': {
                    const event = await calendar.events.insert({
                        calendarId: googleCalendar.data.id,
                        requestBody: {
                            summary: title,
                            description: description,
                            start: {
                                dateTime: startDate,
                                timeZone: 'Asia/Bangkok'
                            },
                            end: {
                                dateTime: endDate,
                                timeZone: 'Asia/Bangkok'                    
                            },
                            reminders: {
                                useDefault: false,
                                overrides: [
                                    { method: 'email', minutes: 24 * 60 },
                                    { method: 'popup', minutes: 10 }
                                ]
                            }
                        }
                    });
                    await knex.insert({
                        userId: userId,
                        orgId: orgId,
                        eventEntityId: entityId,
                        eventEntityType: entityType,
                        googleCalEventId: event.data.id
                    })
                    .returning(["*"])
                    .into("google_calendar_events");
                    return {
                        data: {
                            event: event.data
                        }
                    };
                }
                default:
                    return {
                        error: {
                            code: "INVALID_ENTITY_TYPE",
                            message: 'Please provide the correct entity_type',
                            error: new Error('Invalid entity type. Please provide the correct entity_type.')
                        }                    
                    };
            }

        } catch (err) {
            console.log('[helpers][googleCalendarSync][addEventToCalendar]:  Error', err);
            return { 
                error: {
                    code: 'UNKNOWN_ERROR', 
                    message: err.message, 
                    error: err
                }
             };
        }
    },

   /**
     * @param {number} userId
     * @param {number} orgId
     * @param {string} title
     * @param {string} description
     * @param {string} startDate - start date in ISO format
     * @param {string} endDate - end date in ISO format
     * @param {string} entityType
     * @param {number} entityId
     * @returns {Promise}  Promise object which resolves to either data or error object
     */
    updateEventInCalendar: async function (userId, orgId, title, description, startDate, endDate, entityType, entityId) {
        try {
            const schema = Joi.object().keys({
                userId: Joi.number().required(),
                orgId: Joi.number(),
                title: Joi.string().required(),
                description: Joi.string().required(),
                startDate: Joi.date().greater(new Date(new Date().setHours(0, 0, 0)).toISOString()).iso().required(),
                endDate: Joi.date().greater(Joi.ref('startDate')).iso().required(),
                entityType: Joi.string().required(),
                entityId: Joi.number().required(),
                // eventType: Joi.string().valid('single', 'recurring').required(),  - if we want to support recurring events in future
                // recurrence: Joi.array().items(Joi.string()).when('eventType', {
                //     is: 'recurring',
                //     then: Joi.required()
                // })
            });

            const result = Joi.validate({ userId, orgId, title, description, startDate, endDate, entityType, entityId }, schema);

            console.log('[helpers][google-calendar-sync][updateEventInCalendar]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { 
                    error: {
                        code: 'PARAMS_VALIDATION_ERROR', 
                        message: + result.error.message, 
                        error: new Error('Could Not add event to Google calendar due to params validations failure.')     
                    }
                };
            }

            let googleAccount = await knexReader('social_accounts').where({ userId: userId, accountName: 'GOOGLE' }).first();
            if(!googleAccount) {
                return {
                    error: {
                        code: "ACCOUNT_NOT_FOUND",
                        message: 'Please connect your Google account to use this API',
                        error: new Error('Please connect your Google account to use this API')
                    }
                }
            }

            const existingEvent = await knexReader('google_calendar_events').where({
                userId: userId,
                orgId: orgId,
                eventEntityId: entityId,
                eventEntityType: entityType
            }).first();

            if(!existingEvent) {
                console.log('[helpers][google-calendar-sync][updateEventInCalendar]: Event does not exists');
                return {
                   error: {
                    code: "EVENT_NOT_FOUND",
                    message: 'Event not found',
                    error: new Error('Event not found.')
                   }
                };
            }

            const { refreshToken, calendarId } = googleAccount.details;

            const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
            const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
            const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
            const oauthScope =
            "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

            const REDIRECT_URL = 'https://app.cantrak.tech' + '/' + GOOGLE_REDIRECT_URL;


            const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: oauthScope
            });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            let googleCalendar;
            try {
                googleCalendar =  await calendar.calendars.get({
                    calendarId: calendarId,
                  });
            } catch(error) {
                console.error("[helpers][google-calendar-sync][updateEventInCalendar]: [Error] Calendar Not Found", error);
                return {
                    error: {
                        code: "CALENDAR_NOT_FOUND",
                        message: 'Cantrak calendar not found in the Google Calendar',
                        error: new Error('Cantrak calendar not found in the Google Calendar')
                    }
                }
            }
            switch(entityType) {
                case 'work_order': {
                    try {
                        const event = await calendar.events.update({
                            calendarId: googleCalendar.data.id,
                            eventId: existingEvent.googleCalEventId,
                            requestBody: {
                                summary: title,
                                description: description,
                                start: {
                                    dateTime: startDate,
                                    timeZone: 'Asia/Bangkok'
                                },
                                end: {
                                    dateTime: endDate,
                                    timeZone: 'Asia/Bangkok'                    
                                },
                                reminders: {
                                    useDefault: false,
                                    overrides: [
                                        { method: 'email', minutes: 24 * 60 },
                                        { method: 'popup', minutes: 10 }
                                    ]
                                }
                            }
                        });
                        return {
                            data: {
                                event: event.data
                            }
                        };
                    } catch(error) {
                        return {
                           error: {
                            code: "EVENT_NOT_FOUND",
                            message: 'Event not found',
                            error: new Error('Event not found.')
                           }
                        }
                    }
                }
                default:
                    return {
                        error: {
                            code: "INVALID_ENTITY_TYPE",
                            message: 'Please provide the correct entity_type',
                            error: new Error('Invalid entity type. Please provide the correct entity_type.')
                        }                    
                    };
            }
        } catch (err) {
            console.log('[helpers][googleCalendarSync][updateEventInCalendar]:  Error', err);
            return { 
                error: {
                    code: 'UNKNOWN_ERROR', 
                    message: err.message, 
                    error: err
                }
             };
        }
    },

    /**
     * @param {number} userId
     * @param {number} orgId
     * @param {string} entityType
     * @param {number} entityId
     * @returns {Promise}  Promise object which resolves to either data or error object
     */
    deleteEventFromCalendar: async function (userId, orgId, entityType, entityId) {
        console.log('Delete Event -----------', userId, orgId, entityType, entityType)
        try {
            const schema = Joi.object().keys({
                userId: Joi.number().required(),
                orgId: Joi.number().required(),
                entityType: Joi.string().required(),
                entityId: Joi.number()
            });

            const result = Joi.validate({ userId, orgId, entityType, entityId }, schema);

            console.log('[helpers][google-calendar-sync][deleteEventFromCalendar]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { 
                    error: {
                        code: 'PARAMS_VALIDATION_ERROR', 
                        message: + result.error.message, 
                        error: new Error('Could Not add event to Google calendar due to params validations failure.')    
                    }
                };
            }

            let googleAccount = await knexReader('social_accounts').where({ userId: userId, accountName: 'GOOGLE' }).first();
            if(!googleAccount) {
                return {
                    error: {
                        code: "ACCOUNT_NOT_FOUND",
                        message: 'Please connect your Google account to use this API',
                        error: new Error('Please connect your Google account to use this API')
                    }
                }
            }

            const existingEvent = await knexReader('google_calendar_events').where({
                userId: userId,
                orgId: orgId,
                eventEntityId: entityId,
                eventEntityType: entityType
            }).first();

            if(!existingEvent) {
                console.log('[helpers][google-calendar-sync][deleteEventFromCalendar]: Event does not exists');
                return {
                    error: {
                        code: "EVENT_NOT_FOUND",
                        message: 'Event not found',
                        error: new Error('Event not found.')    
                    }
                }
            }

            const { refreshToken, calendarId } = googleAccount.details;

            const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
            const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
            const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
            const oauthScope =
            "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

            const REDIRECT_URL = 'https://app.cantrak.tech' + '/' + GOOGLE_REDIRECT_URL;

            const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: oauthScope
            });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            let googleCalendar;
            try {
                googleCalendar =  await calendar.calendars.get({
                    calendarId: calendarId,
                  });
            } catch(error) {
                console.error("[helpers][google-calendar-sync][updateEventInCalendar]: [Error] Calendar Not Found", error);
                return {
                    error: {
                        code: "CALENDAR_NOT_FOUND",
                        message: 'Cantrak calendar not found in the Google Calendar',
                        error: new Error('Cantrak calendar not found in the Google Calendar')
                    }
                }
            }
            switch(entityType) {
                case 'work_order': {
                    try {
                        await calendar.events.delete({
                            calendarId: googleCalendar.data.id,
                            eventId: existingEvent.googleCalEventId,
                        });
                        await knex('google_calendar_events').where({
                            userId: userId,
                            orgId: orgId,
                            eventEntityId: entityId,
                            eventEntityType: entityType
                        }).del();
                        return {
                            data: {
                                message: 'Event deleted successfully.'
                            }
                        };
                    } catch(error) {
                        return {
                            error: {
                                code: "EVENT_NOT_FOUND",
                                message: 'Event not found',
                                error: new Error('Event not found.')    
                            }
                        }
                    }
                }
                default:
                    return {
                        error: {
                            code: "INVALID_ENTITY_TYPE",
                            message: 'Please provide the correct entity_type',
                            error: new Error('Invalid entity type. Please provide the correct entity_type.')
                        }                    
                    };
            }
        } catch (err) {
            console.log('[helpers][googleCalendarSync][deleteEventFromCalendar]:  Error', err);
            return { 
                error: {
                    code: 'UNKNOWN_ERROR', 
                    message: err.message, 
                    error: err
                }
            };
        }
    },

    /**
     * @param {number} userId
     * @param {number} orgId
     * @returns {Promise}  Promise object which resolves to either data or error object
     */
    getAllEventsFromGoogleCalendar: async function (userId, orgId) {
        try {
            const schema = Joi.object().keys({
                userId: Joi.number().required(),
                orgId: Joi.number().required(),
            });

            const result = Joi.validate({ userId, orgId }, schema);

            console.log('[helpers][google-calendar-sync][getAllEventsFromGoogleCalendar]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return { 
                    error: {
                        code: 'PARAMS_VALIDATION_ERROR', 
                        message: + result.error.message, 
                        error: new Error('Could Not get calendar events due to params validations failure.') 
                    }
                };
            }

            let googleAccount = await knexReader('social_accounts').where({ userId: userId, accountName: 'GOOGLE' }).first();
            if(!googleAccount) {
                return {
                    error: {
                        code: "ACCOUNT_NOT_FOUND",
                        message: 'Please connect your Google account to use this API',
                        error: new Error('Please connect your Google account to use this API')
                    }
                }
            }

            const { refreshToken, calendarId } = googleAccount.details;

            const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
            const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
            const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
            const oauthScope =
            "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

            const REDIRECT_URL = 'https://app.cantrak.tech' + '/' + GOOGLE_REDIRECT_URL;

            const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: oauthScope
            });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            let googleCalendar;
            try {
                googleCalendar =  await calendar.calendars.get({
                    calendarId: calendarId,
                  });
            } catch(error) {
                console.error("[helpers][google-calendar-sync][getAllEventsFromGoogleCalendar]: [Error] Calendar Not Found", error);
                return {
                    error: {
                        code: "CALENDAR_NOT_FOUND",
                        message: 'Cantrak calendar not found in the Google Calendar',
                        error: new Error('Cantrak calendar not be found in the Google Calendar')
                    }
                }
            }
            const events = await calendar.events.list({
                calendarId: googleCalendar.data.id
            });
            return {
                data: {
                    events: events.data.items
                }
            };
        } catch(error) {
            console.log('[helpers][googleCalendarSync][getAllEventsFromGoogleCalendar]:  Error', err);
            return { 
                error: {
                    code: 'UNKNOWN_ERROR', 
                    message: err.message, 
                    error: err     
                }
            };
        }
    },

    /**
     * @param {number} userId
     * @param {number} orgId
     * @param {string} entityType
     * @returns {Promise}  Promise object which resolves to either data or error object
     */
    getAllEventsFromLocalDB: async function (userId, orgId, entityType) {
        try {
            const schema = Joi.object().keys({
                userId: Joi.number().required(),
                orgId: Joi.number().required(),
                entityType: Joi.string().required(),
            });

            const result = Joi.validate({ userId, orgId, entityType }, schema);

            console.log('[helpers][google-calendar-sync][getAllEventsFromLocalDB]: Joi Validate Params:', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return {
                    error: {
                        code: 'PARAMS_VALIDATION_ERROR', 
                        message: + result.error.message, 
                        error: new Error('Could Not get calendar events due to params validations failure.') 
                    }
                }
            }

            let googleAccount = await knexReader('social_accounts').where({ userId: userId, accountName: 'GOOGLE' }).first();
            if(!googleAccount) {
                return {
                    error: {
                        code: "ACCOUNT_NOT_FOUND",
                        message: 'Please connect your Google account to use this API',
                        error: new Error('Please connect your Google account to use this API')
                    }
                }
            }

            const { refreshToken, calendarId } = googleAccount.details;

            const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
            const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
            const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
            const oauthScope =
            "openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.app.created";

            const REDIRECT_URL = 'https://app.cantrak.tech' + '/' + GOOGLE_REDIRECT_URL;

            const oauth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
            oauth2Client.setCredentials({
                refresh_token: refreshToken,
                token_type: 'Bearer',
                scope: oauthScope
            });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            let googleCalendar;
            try {
                googleCalendar =  await calendar.calendars.get({
                    calendarId: calendarId,
                  });
            } catch(error) {
                console.error("[helpers][google-calendar-sync][getAllEventsFromLocalDB]: [Error] Calendar Not Found", error);
                return {
                    error: {
                        code: "CALENDAR_NOT_FOUND",
                        message: 'Cantrak calendar not found in the Google Calendar',
                        error: new Error('Cantrak calendar not be found in the Google Calendar')
                    }
                }
            }

            const googleCalendarEvents = await this.getAllEventsFromGoogleCalendar(userId, orgId);

            if(googleCalendarEvents.error) {
                return {
                    error: googleCalendarEvents.error
                }
            }

            const localEventsInDB = await knexReader('google_calendar_events').where({
                userId: userId,
                orgId: orgId,
                eventEntityType: entityType
            });

            const filteredEvents = googleCalendarEvents.data.events.filter(evt => (
                localEventsInDB.find(localEvent => localEvent.googleCalEventId === evt.id)
            ));

            return {
                data: {
                    events: filteredEvents
                }
            };
        } catch (err) {
            console.log('[helpers][googleCalendarSync][getAllEventsFromLocalDB]:  Error', err);
            return { 
                error: {
                    code: 'UNKNOWN_ERROR', 
                    message: err.message, 
                    error: err     
                }
            };
        }
    },
};

module.exports = googleCalendarSync;
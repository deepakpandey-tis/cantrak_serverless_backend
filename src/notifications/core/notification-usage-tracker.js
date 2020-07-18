const _ = require('lodash');
const knex = require('../../db/knex');


const notificationTrackerHelper = {
    increaseCount: async (orgId, notificationType) => {
        try {
            let incrementQuery = ``;
            switch (notificationType) {

                case 'IN_APP':
                    incrementQuery = `
                        INSERT INTO notifications_usage_tracker ("orgId", "sms", "webpush", "app", "email", "line", "socket")
                        VALUES ( ${orgId}, 0, 0, 1, 0, 0, 0)
                        ON CONFLICT ON constraint notifications_usage_tracker_un
                        do update set "app" = (notifications_usage_tracker."app" + 1);
                    `;
                    break;

                case 'EMAIL':
                    incrementQuery = `
                        INSERT INTO notifications_usage_tracker ("orgId", "sms", "webpush", "app", "email", "line", "socket")
                        VALUES ( ${orgId}, 0, 0, 0, 1, 0, 0)
                        ON CONFLICT ON constraint notifications_usage_tracker_un
                        do update set "email" = (notifications_usage_tracker."email" + 1);
                    `;
                    break;

                case 'WEB_PUSH':
                    incrementQuery = `
                        INSERT INTO notifications_usage_tracker ("orgId", "sms", "webpush", "app", "email", "line", "socket")
                        VALUES ( ${orgId}, 0, 0, 1, 0, 0, 0)
                        ON CONFLICT ON constraint notifications_usage_tracker_un
                        do update set "webpush" = (notifications_usage_tracker."webpush" + 1);
                    `;
                    break;

                case 'SOCKET_NOTIFY':
                    incrementQuery = `
                        INSERT INTO notifications_usage_tracker ("orgId", "sms", "webpush", "app", "email", "line", "socket")
                        VALUES ( ${orgId}, 0, 0, 0, 0, 0, 1)
                        ON CONFLICT ON constraint notifications_usage_tracker_un
                        do update set "socket" = (notifications_usage_tracker."socket" + 1);
                    `;
                    break;

                case 'LINE_NOTIFY':
                    incrementQuery = `
                        INSERT INTO notifications_usage_tracker ("orgId", "sms", "webpush", "app", "email", "line", "socket")
                        VALUES ( ${orgId}, 0, 0, 0, 0, 1, 0)
                        ON CONFLICT ON constraint notifications_usage_tracker_un
                        do update set "line" = (notifications_usage_tracker."line" + 1);
                    `;
                    break;

                case 'SMS':
                    incrementQuery = `
                        INSERT INTO notifications_usage_tracker ("orgId", "sms", "webpush", "app", "email", "line", "socket")
                        VALUES ( ${orgId}, 0, 1, 0, 0, 0, 0)
                        ON CONFLICT ON constraint notifications_usage_tracker_un
                        do update set "sms" = (notifications_usage_tracker."sms" + 1);
                    `;
                    break;
            }

            await knex.raw(incrementQuery);

        } catch (err) {
            console.log('[notifications][core][notification-usage-tracker][increaseCount]: Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = notificationTrackerHelper;
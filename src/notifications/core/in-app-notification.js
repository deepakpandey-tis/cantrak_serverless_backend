const _ = require('lodash');
const knex = require('../../db/knex');


const inAppNotification = {
    send: async ({ orgId, senderId, receiverId, payload, payloadThai, actions }) => {
        try {
            const currentTime = new Date().getTime();

            let insertDataObj = {
                orgId,
                senderId,
                receiverId,
                payload: JSON.stringify(payload),
                payloadThai: JSON.stringify(payloadThai),
                actions: JSON.stringify(actions)
            }

            let insertedData = await knex.insert({ ...insertDataObj, createdAt: currentTime, updatedAt: currentTime })
                .returning(["*"])
                .into("user_notifications");

            console.log('[notifications][core][in-app-notification]: In App Messaging, Inserted Data:', insertedData);

        } catch (err) {
            console.log('[notifications][core][notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = inAppNotification;
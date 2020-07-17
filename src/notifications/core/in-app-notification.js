const _ = require('lodash');
const knex = require('../../db/knex');


const inAppNotification = {
    send: async ({orgId, senderId, receiverId, payload, actions}) => {
        try {
            const currentTime =  new Date().getTime();

            let insertDataObj = {
                orgId,
                senderId,
                receiverId,
                payload,
                actions
            }

            let insertedData = { ...insertDataObj, createdAt: currentTime, updatedAt: currentTime };
            console.log('[notifications][core][in-app-notification]: In App Messaging, Inserted Data', insertedData);

        } catch (err) {
            console.log('[notifications][core][notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = inAppNotification;
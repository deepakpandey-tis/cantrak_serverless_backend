const _ = require('lodash');
const knex = require('../../db/knex');
const socket = require("../../socket");

async function sendViaSocket(connectionId, data) {
  await socket.sendMessage(connectionId, data);
}

const socketNotification = {
    send: async ({ channel, orgId, senderId, receiverId, payload, actions }) => {
        try {

            const socketConnectionHelper = require('../../helpers/socket-connection-helper');
            let userSocketConnections = await socketConnectionHelper.getUserConnectionsByUserId(receiverId);
            console.log('[notifications][core][socket-notification] : User Active socket connections:', userSocketConnections);

            if (userSocketConnections && userSocketConnections.length > 0) {

                let dataObj = {
                    channel,
                    orgId,
                    senderId,
                    receiverId,
                    payload,
                    actions
                }

                const Parallel = require("async-parallel");
                await Parallel.each(userSocketConnections, async (connection) => {
                    try {

                        await sendViaSocket(connection.connectionId, dataObj);
                        
                        console.log(`[notifications][core][socket-notification] :Sending Notification For User: ${receiverId} on Connection: `, connection.connectionId, ', Sent');
                    } catch (err) {
                        console.error(`[notifications][core][socket-notification] :Sending Notification For User: ${receiverId} on Connection: `, connection.connectionId, ', Failed:', err.statusCode, err);

                        if (err.statusCode == 404 || err.statusCode == 410) {
                            await socketConnectionHelper.removeConnection(connection.connectionId);
                            console.error(`[notifications][core][socket-notification] :Deleting Expired Connection: `, connection);
                        }
                    }
                });


            } else {
                console.log('[notifications][core][socket-notification] : No Active socket connection available for user:', receiverId);
            }

        } catch (err) {
            console.log('[notifications][core][push-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', error: err };
        }
    },

};

module.exports = socketNotification;
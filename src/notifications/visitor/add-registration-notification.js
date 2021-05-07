const knex = require('../../db/knex');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'SMS'];            //  'IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const addRegistrationNotification = {
    send: async(data) => {
        try {
            console.log('[notifications][visitor][add-registration-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(data.sender, data.receiver, JSON.parse(JSON.stringify(data.payload)), ALLOWED_CHANNELS, __filename);
                console.log('[notifications][visitor][add-registration-notification][send]: All Notifications Queued');
            } else {
                await notification.send(data.sender, data.receiver, JSON.parse(JSON.stringify(data.payload)), ALLOWED_CHANNELS, addRegistrationNotification);
                console.log('[notifications][visitor][add-registration-notification][send]: All Notifications Sent');
            }
        } catch (err) {
            console.log('[notifications][visitor][add-registration-notification][send]: Error ', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },


    sendInAppNotification: async (sender, receiver, data) => {

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: `Visitor Registration Notification`,
                body: `At gate, ${sender.name} has registered ${receiver.visitorNames} for check-in on ${receiver.visitorArrivalDate}.`,
                subjectThai: `Visitor Registration Notification`,
                bodyThai: `At gate, ${sender.name} has registered ${receiver.visitorNames} for check-in on ${receiver.visitorArrivalDate}.`,
                extraData: {
                    url: `/user/dashboard/home`,
                    primaryKey: receiver.visitorIds
                }
            },            
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/user/visitor`
                }
            ]
        }

        return data;
    },


    sendSMSNotification: async (sender, receiver, data) => {
        data = {
            receiverMobileNumber: receiver.mobileNo,
            textMessage: `At gate, ${sender.name} has registered ${sender.visitorNames} for check-in` + sender.visitorArrivalDate !== '' ? ` on ${sender.visitorArrivalDate}.` : `.`
        }

        return data;
    }
}

module.exports = addRegistrationNotification;

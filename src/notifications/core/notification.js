const _ = require('lodash');
const inAppNotification = require('../core/in-app-notification');
const emailNotification = require('../core/email-notification');
const webPushNotification = require('../core/web-push-notification');
const smsNotification = require('../core/sms-notification');

const notificationUsageTracker = require('../core/notification-usage-tracker');



async function handleInAppNotification(sender, receiver, dataPayload, notificationClass) {

    try {

        if ('sendInAppNotification' in notificationClass) {

            let data = await notificationClass.sendInAppNotification(sender, receiver, dataPayload);
            console.log('[notifications][core][notification][send]: Data for InApp Notification:', data);
    
            await inAppNotification.send({
                orgId: data.orgId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                payload: data.payload,
                actions: data.actions
            });
            console.log('[notifications][core][notification][send]: InApp Notification sent.');
    
        } else {
            console.log('[notifications][core][notification][send]: No methods found to send in app notification.');
        }

    } catch (err) {
        console.log('[notifications][core][notification][handleInAppNotification]: Error:', err);
    }
}

async function handleEmailNotification(sender, receiver, dataPayload, notificationClass) {

    try {

        if ('sendEmailNotification' in notificationClass) {

            let data = await notificationClass.sendEmailNotification(sender, receiver, dataPayload);
            console.log('[notifications][core][notification][send]: Data for Email Notification:', data);

            await emailNotification.send({
                to: data.receiverEmail,
                subject: data.payload.subject,
                template: data.template,
                templateData: data.templateData
            });
            console.log('[notifications][core][notification][send]: Email Notification sent.');
        } else {
            console.log('[notifications][core][notification][send]: No methods found to send email notification.');
        }

    } catch (err) {
        console.log('[notifications][core][notification][sendEmailNotification]: Error:', err);
    }
}

async function handleWebPushNotification(sender, receiver, dataPayload, notificationClass) {

    try {

        if ('sendWebPushNotification' in notificationClass) {

            let data = await notificationClass.sendWebPushNotification(sender, receiver, dataPayload);
            console.log('[notifications][core][notification][send]: Data for Push Notification:', data);

            await webPushNotification.send({
                receiverId: data.receiverId,
                subject: data.payload.subject,
                body: data.payload.body,
                icon: data.payload.icon,
                image: data.payload.image,
                extraData: data.payload.extraData,
                actions: data.actions
            });
            console.log('[notifications][core][notification][send]: Push Notification sent.');
        } else {
            console.log('[notifications][core][notification][send]: No methods found to send web push notification.');
        }

    } catch (err) {
        console.log('[notifications][core][notification][sendWebPushNotification]: Error:', err);
    }

}


async function handleSocketNotification(sender, receiver, dataPayload, notificationClass) {

    try {

        if ('sendSocketNotification' in notificationClass) {

            let data = await notificationClass.sendSocketNotification(sender, receiver, dataPayload);
            console.log('[notifications][core][notification][send]: Data for Socket Notification:', data);



        } else {
            console.log('[notifications][core][notification][send]: No methods found to send socket notification.');
        }

    } catch (err) {
        console.log('[notifications][core][notification][sendSocketNotification]: Error:', err);
    }

}


async function handleLineNotification(sender, receiver, dataPayload, notificationClass) {

    try {

        if ('sendLineNotification' in notificationClass) {

            let data = await notificationClass.sendLineNotification(sender, receiver, dataPayload);
            console.log('[notifications][core][notification][send]: Data for Line Notification:', data);



        } else {
            console.log('[notifications][core][notification][send]: No methods found to send line notification.');
        }

    } catch (err) {
        console.log('[notifications][core][notification][sendLineNotification]: Error:', err);
    }

}


async function handleSMSNotification(sender, receiver, dataPayload, notificationClass) {

    try {

        if ('sendSMSNotification' in notificationClass) {

            let data = await notificationClass.sendSMSNotification(sender, receiver, dataPayload);
            console.log('[notifications][core][notification][send]: Data for SMS Notification:', data);

            if (data.receiverMobileNumber != '') {
                await smsNotification.send({
                    mobileNumber: data.receiverMobileNumber,
                    textMessage: data.textMessage
                });
                console.log('[notifications][core][notification][send]: SMS sent.');
            } else {
                console.log('[notifications][core][notification][send]: User doesn\'t have a valid Mobile Number.');
            }
        } else {
            console.log('[notifications][core][notification][send]: No methods found to send sms notification.');
        }

    } catch (err) {
        console.log('[notifications][core][notification][sendSMSNotification]: Error:', err);
    }
}


const notification = {
    send: async (sender, receiver, dataPayload, channels, notificationClass) => {
        try {

            const Parallel = require('async-parallel');

            Parallel.each(channels, async channel => {

                switch (channel) {
                    case 'IN_APP':
                        await handleInAppNotification(sender, receiver, dataPayload, notificationClass);
                        await notificationUsageTracker.increaseCount(sender.orgId, channel);
                        break;

                    case 'EMAIL':
                        await handleEmailNotification(sender, receiver, dataPayload, notificationClass);
                        await notificationUsageTracker.increaseCount(sender.orgId, channel);
                        break;

                    case 'WEB_PUSH':
                        await handleWebPushNotification(sender, receiver, dataPayload, notificationClass);
                        await notificationUsageTracker.increaseCount(sender.orgId, channel);
                        break;

                    case 'SOCKET_NOTIFY':
                        await handleSocketNotification(sender, receiver, dataPayload, notificationClass);
                        await notificationUsageTracker.increaseCount(sender.orgId, channel);
                        break;

                    case 'LINE_NOTIFY':
                        await handleLineNotification(sender, receiver, dataPayload, notificationClass);
                        await notificationUsageTracker.increaseCount(sender.orgId, channel);
                        break;

                    case 'SMS':
                        await handleSMSNotification(sender, receiver, dataPayload, notificationClass);
                        await notificationUsageTracker.increaseCount(sender.orgId, channel);
                        break;

                    default:
                        console.log('[notifications][core][notification][send]: Given Notification channel not available:', channel);
                }

            });


        } catch (err) {
            console.log('[notifications][core][notification][send]:  Error', err);

            if (err.list && Array.isArray(err.list)) {
                err.list.forEach(item => {
                    sails.log.error('[notifications][core][notification][send]: Each Error:', item.message);
                });
            }

            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = notification;
const _ = require('lodash');
const AWS = require('aws-sdk');
const inAppNotification = require('../core/in-app-notification');
const emailNotification = require('../core/email-notification');
const webPushNotification = require('../core/web-push-notification');
const smsNotification = require('../core/sms-notification');

const notificationUsageTracker = require('../core/notification-usage-tracker');




const sendSQSMessage = async (messageBody) => {

    AWS.config.update({
        accessKeyId: process.env.NOTIFIER_ACCESS_KEY_ID,
        secretAccessKey: process.env.NOTIFIER_SECRET_ACCESS_KEY,
        region: process.env.REGION || "us-east-1"
    });


    const createdAt = new Date().toISOString();

    let params = {
        DelaySeconds: 2,
        MessageAttributes: {
            "title": {
                DataType: "String",
                StringValue: "Notification Message Body"
            },
            "createdAt": {
                DataType: "String",
                StringValue: createdAt
            },
            "messageType": {
                DataType: "String",
                StringValue: "NOTIFICATION"
            }
        },
        MessageBody: messageBody,
        // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
        // MessageId: "Group1",  // Required for FIFO queues
        QueueUrl: process.env.SQS_MAIL_QUEUE_URL
    };

    return new Promise(async (resolve, reject) => {
        const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
        sqs.sendMessage(params, (err, data) => {
            if (err) {
                console.log("SQS Message POST Error", err);
                reject(err)
            } else {
                console.log("SQS Message POST Success", data.MessageId);
                resolve(data);
            }
        });
    })
};



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

            await Parallel.each(channels, async channel => {

                switch (channel) {
                    case 'IN_APP':
                        await handleInAppNotification(sender, receiver, dataPayload, notificationClass);
                        break;

                    case 'EMAIL':
                        await handleEmailNotification(sender, receiver, dataPayload, notificationClass);
                        break;

                    case 'WEB_PUSH':
                        await handleWebPushNotification(sender, receiver, dataPayload, notificationClass);
                        break;

                    case 'SOCKET_NOTIFY':
                        await handleSocketNotification(sender, receiver, dataPayload, notificationClass);
                        break;

                    case 'LINE_NOTIFY':
                        await handleLineNotification(sender, receiver, dataPayload, notificationClass);
                        break;

                    case 'SMS':
                        await handleSMSNotification(sender, receiver, dataPayload, notificationClass);
                        break;

                    default:
                        console.log('[notifications][core][notification][send]: Given Notification channel not available:', channel);
                }

                console.log(`[notifications][core][notification][send]: Increasing notification count for OrgId : ${sender.orgId}, Channel: `, channel);
                await notificationUsageTracker.increaseCount(sender.orgId, channel);

            });

            console.log('[notifications][core][notification][send]: Notification Sent on all of the given channels:', channels);

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

    queue: async (sender, receiver, dataPayload, channels, notificationClassPath) => {
        try {
            console.log('[notifications][core][notification][queue]: Queuing Notification:', notificationClassPath);
            await sendSQSMessage(JSON.stringify({
                sender, receiver, dataPayload, channels, notificationClassPath
            }));
        } catch (err) {
            console.log('[notifications][core][notification][queue]: Error:', err);
        }
    },

    processQueue: async ({ sender, receiver, dataPayload, channels, notificationClassPath }) => {

        try {
            console.log('[notifications][core][notification][processQueue]: Processing Notification Queue:', notificationClassPath);
            const notificationClass = require(notificationClassPath);
            await notification.send(sender, receiver, dataPayload, channels, notificationClass);

            console.log('[notifications][core][notification][processQueue]: Processing Notification Queue: Done...');

        } catch (err) {
            console.log('[notifications][core][notification][processQueue]: Error:', err);
        }

    }

};

module.exports = notification;
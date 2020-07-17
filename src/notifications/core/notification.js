const _ = require('lodash');
const inAppNotification = require('../core/in-app-notification');
const emailNotification = require('../core/email-notification');
const webPushNotification = require('../core/web-push-notification');
const smsNotification = require('../core/sms-notification');


const notification = {
    send: async (data, channel, notificationClass) => {
        try {
            switch (channel) {
                case 'IN_APP':
                    if ('sendInAppNotification' in notificationClass) {

                        await inAppNotification.send({
                            orgId: data.orgId,
                            senderId: data.sender.id,
                            receiverId: data.receiver.id,
                            payload: data.payload,
                            actions: data.actions
                        });
                        console.log('[notifications][core][notification][send]: InApp Notification sent.');

                    } else {
                        console.log('[notifications][core][notification][send]: No methods found to send in app notification.');
                    }
                    break;

                case 'EMAIL':
                    if ('sendEmailNotification' in notificationClass) {
                        await emailNotification.send({
                            to: data.receiver.email,
                            subject: data.payload.subject,
                            template: data.template,
                            templateData: data.templateData
                        });
                        console.log('[notifications][core][notification][send]: Email Notification sent.');
                    } else {
                        console.log('[notifications][core][notification][send]: No methods found to send email notification.');
                    }
                    break;

                case 'WEB_PUSH':
                    if ('sendWebPushNotification' in notificationClass) {
                        await webPushNotification.send({
                            receiverId: data.receiver.id,
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
                    break;

                case 'SOCKET_NOTIFY':
                    if ('sendSocketNotification' in notificationClass) {

                    } else {
                        console.log('[notifications][core][notification][send]: No methods found to send socket notification.');
                    }
                    break;

                case 'LINE_NOTIFY':
                    if ('sendLineNotification' in notificationClass) {

                    } else {
                        console.log('[notifications][core][notification][send]: No methods found to send line notification.');
                    }
                    break;

                case 'SMS_NOTIFY':
                    if ('sendSMSNotification' in notificationClass) {
                        if (data.receiver.mobileNo && data.receiver.mobileNo != '') {
                            await smsNotification.send({
                                mobileNumber: data.receiver.mobileNo,
                                textMessage: data.payload.textMessage
                            });
                            console.log('[notifications][core][notification][send]: SMS sent.');
                        } else {
                            console.log('[notifications][core][notification][send]: User doesn\'t have a valid Mobile Number.');
                        }
                    } else {
                        console.log('[notifications][core][notification][send]: No methods found to send sms notification.');
                    }
                    break;
                    
                default:
                    console.log('[notifications][core][notification][send]: Given Notification channel not available:', ch);
            }
        } catch (err) {
            console.log('[notifications][core][notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = notification;
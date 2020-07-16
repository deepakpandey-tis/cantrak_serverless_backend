const _ = require('lodash');
const AWS = require('aws-sdk');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];

const testNotification = {
    send: async (sender, receiver, data) => {
        try {

            console.log('[notifications][test][test-notification][send]: User To Notify:', user);
            console.log('[notifications][test][test-notification][send]: Notification Data:', data);

            await testNotification.sendInAppNotification(sender, receiver, JSON.parse(JSON.stringify(data)));
            await testNotification.sendEmailNotification(sender, receiver, JSON.parse(JSON.stringify(data)));
            await testNotification.sendWebPushNotification(sender, receiver, JSON.parse(JSON.stringify(data)));
            await testNotification.sendSocketNotification(sender, receiver, JSON.parse(JSON.stringify(data)));
            await testNotification.sendLineNotification(sender, receiver, JSON.parse(JSON.stringify(data)));
            await testNotification.sendSMSNotification(sender, receiver, JSON.parse(JSON.stringify(data)));

            console.log('[notifications][test][test-notification][send]: All Notifications Sent');

        } catch (err) {
            console.log('[notifications][test][test-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },


    sendInAppNotification: async (sender, receiver, data) => {
        console.log('[notifications][test][test-notification][sendInAppNotification]: Start');

        // Todo : Modify Data Object As Needed
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: 'Test Notification',
                body: `Hi!!, This is a test notification to all users from ${sender.name}`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `${process.env.SITE_URL}/admin/dashboard/home`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open Home Page",
                    url: `${process.env.SITE_URL}/admin/dashboard/home`
                }
            ]
        }

        await notification.send(data, ALLOWED_CHANNELS[0], testNotification);
        console.log('[notifications][test][test-notification][sendInAppNotification]: Sent Successfully');
    },


    sendEmailNotification: async (sender, receiver, data) => {
        console.log('[notifications][test][test-notification][sendEmailNotification]: Start');

        console.log('[notifications][test][test-notification][sendEmailNotification]: Sent Successfully');
    },

    sendWebPushNotification: async (sender, receiver, data) => {
        console.log('[notifications][test][test-notification][sendWebPushNotification]: Start');

        console.log('[notifications][test][test-notification][sendWebPushNotification]: Sent Successfully');
    },

    sendSocketNotification: async (sender, receiver, data) => {
        console.log('[notifications][test][test-notification][sendSocketNotification]: Start');

        console.log('[notifications][test][test-notification][sendSocketNotification]: Sent Successfully');
    },


    sendLineNotification: async (sender, receiver, data) => {
        console.log('[notifications][test][test-notification][sendLineNotification]: Start');

        console.log('[notifications][test][test-notification][sendLineNotification]: Sent Successfully');
    },

    sendSMSNotification: async (sender, receiver, data) => {
        console.log('[notifications][test][test-notification][sendSMSNotification]: Start');

        console.log('[notifications][test][test-notification][sendSMSNotification]: Sent Successfully');
    }

};

module.exports = testNotification;
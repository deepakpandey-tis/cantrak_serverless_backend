const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];

const testNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {

            // console.log('[notifications][test][test-notification][send]: Sender:', sender);
            // console.log('[notifications][test][test-notification][send]: Receiver:', receiver);
            console.log('[notifications][test][test-notification][send]: Data:', data);

            await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, testNotification);

            console.log('[notifications][test][test-notification][send]: All Notifications Sent');

        } catch (err) {
            console.log('[notifications][test][test-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },


    sendInAppNotification: async (sender, receiver, data) => {

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
                subject: 'Test Notification',
                body: `Hi!!, This is a test notification to all users from ${sender.name}`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/dashboard/home`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open Home Page",
                    url: `/user/dashboard/home`
                }
            ]
        }

        return data;
    },


    sendEmailNotification: async (sender, receiver, data) => {
        data = {
            receiverEmail: receiver.email,
            template: 'test-email.ejs',
            templateData: {
                fullName: receiver.name
            },
            payload: {
                ...data,
                subject: 'Test Email Notification',
            }
        };

        return data;
    },

    sendWebPushNotification: async (sender, receiver, data) => {

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

        return data;
    },

    sendSocketNotification: async (sender, receiver, data) => {
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
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
        return data;
    },


    sendLineNotification: async (sender, receiver, data) => {
        data = {

        }

        return data;
    },

    sendSMSNotification: async (sender, receiver, data) => {
        data = {
            receiverMobileNumber: receiver.mobileNo,
            textMessage: `Hi ${receiver.name} this is simple text message send to test the notification`
        }

        return data;
    }

};

module.exports = testNotification;
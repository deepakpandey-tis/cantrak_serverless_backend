const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const testNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {

            // console.log('[notifications][test][test-notification][send]: Sender:', sender);
            // console.log('[notifications][test][test-notification][send]: Receiver:', receiver);
            console.log('[notifications][test][test-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][test][test-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, testNotification);
                console.log('[notifications][test][test-notification][send]: All Notifications Sent');
            }


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
                    title: "Open",
                }
            ]
        }

        return data;
    },


    sendEmailNotification: async (sender, receiver, data) => {
        console.log("data=======>>>>>>",data)
        data = {
            receiverEmail: receiver.email,
            template: 'test-email.ejs',
            templateData: {
                fullName: receiver.name,
                orgId : receiver.orgId,
                ...data.payload
            },
            payload: {
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
            channel: 'socket-notification',
            payload: {
                ...data,
                subject: 'Test Notification from socket',
                body: `Hi!!, This is a socket test notification to all users from ${sender.name}.`,
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
            receiverId: receiver.id,
            message: `Hi ${receiver.name} this is simple text message send to test the notification`
        };

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
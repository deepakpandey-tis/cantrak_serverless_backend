const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const surveyAppointmentAssignUserNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {
            console.log('[notifications][announcement][announcement-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][announcement][announcement-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, surveyAppointmentAssignUserNotification);
                console.log('[notifications][announcement][announcement-notification][send]: All Notifications Sent');
            }

        } catch (err) {

        }
    },

    sendInAppNotification: async (sender, receiver, data) => {
        console.log("Site url", process.env.SITE_URL)
        let title = data.payload.title;
        let description = data.payload.description;
        let url = data.payload.url;
        let orgData = data.payload.orgData;
        let thaiTitle = data.payload.thaiTitle;
        let thaiDetails = data.payload.thaiDetails;
        let icons;
        let images;
        if (orgData && orgData.id == '56') {
            icons = 'assets/icons/cbre-512x512.png';
            images = 'assets/icons/cbre-512x512.png';
        } else if (orgData && orgData.id == '89') {
            icons = 'assets/icons/senses-512x512.png';
            images = 'assets/icons/senses-512x512.png';
        }
        else {
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
                subject: title,
                body: description,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/dashboard/home`,
                    primaryKey: Date.now()
                }
            },
            payloadThai: {
                ...data,
                subject: thaiTitle,
                body: thaiDetails,
                icon: icons,
                image: images,
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
                    //url: `/user/dashboard/home`,
                    url: data.payload.redirectUrl

                }
            ]
        }

        return data;
    },


    sendEmailNotification: async (sender, receiver, data) => {
        let title = data.payload.title;
        let description = data.payload.description;
        let url = data.payload.url;
        data = {
            receiverEmail: receiver.email,
            template: 'service-request.ejs',
            templateData: {
                fullName: receiver.name,
                description: description,
                title: title,
                orgId:receiver.orgId
            },
            payload: {
                ...data,
                subject: title,
            }
        };

        return data;
    },

    sendWebPushNotification: async (sender, receiver, data) => {
        let title = data.payload.title;
        let description = data.payload.description;
        let url = data.payload.url;

        let orgData = data.payload.orgData;
        let icons;
        let images;
        if (orgData) {
            console.log("org data for notification", orgData)
            if (orgData.id == '56') {
                icons = 'assets/icons/cbre-512x512.png';
                images = 'assets/icons/cbre-512x512.png';
            } else {
                icons = 'assets/icons/senses-512x512.png';
                images = 'assets/icons/senses-512x512.png';
            }
        } else {
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: title,
                body: description,
                icon: icons,
                image: images,
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
        let title = data.payload.title;
        let description = data.payload.description;
        let url = data.payload.url;
        let orgData = data.payload.orgData;
        let icons;
        let images;
        if (orgData && orgData.id == '56') {
            icons = 'assets/icons/cbre-512x512.png';
            images = 'assets/icons/cbre-512x512.png';
        } else if (orgData && orgData.id == '89') {
            icons = 'assets/icons/senses-512x512.png';
            images = 'assets/icons/senses-512x512.png';
        }
        else {
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            channel: 'socket-notification',
            payload: {
                ...data,
                subject: title,
                body: description,
                icon: icons,
                image: images,
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
                    //url: `/user/dashboard/home`,
                    url: data.payload.redirectUrl

                }
            ]
        }

        return data;
    },


    sendLineNotification: async (sender, receiver, data) => {
        let title = data.payload.title
        let description = data.payload.description
        let url = data.payload.url
        data = {
            receiverId: receiver.id,
            message: `Hi ${receiver.name} ` + description
        };

        return data;
    },

    sendSMSNotification: async (sender, receiver, data) => {
        let title = data.payload.title
        let description = data.payload.description
        let url = data.payload.url
        data = {
            receiverMobileNumber: receiver.mobileNo,
            textMessage: `Hi ${receiver.name} this is simple Survey message send to test the notification`
        }

        return data;
    }
}
module.exports = surveyAppointmentAssignUserNotification;
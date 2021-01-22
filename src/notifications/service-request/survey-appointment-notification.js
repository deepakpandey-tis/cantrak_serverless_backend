const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const surveyAppointmentNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {
            console.log('[notifications][announcement][announcement-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][announcement][announcement-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, surveyAppointmentNotification);
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
        let icons;
        let images;

        if(orgData && orgData.organisationLogo == ''){
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else{
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
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
                title: title
            },
            payload: {
                ...data,
                subject: 'Survey Appointment',
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

        if(orgData && orgData.organisationLogo == ''){
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else{
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
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

        if(orgData && orgData.organisationLogo == ''){
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else{
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
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
module.exports = surveyAppointmentNotification;
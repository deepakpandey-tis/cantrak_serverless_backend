const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const bookingCanceledNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {

            // console.log('[notifications][test][test-notification][send]: Sender:', sender);
            // console.log('[notifications][test][test-notification][send]: Receiver:', receiver);
            console.log('[notifications][facility-booking-cancelled][facility-booking-cancelled-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][facility-booking-cancelled][facility-booking-cancelled-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, bookingCanceledNotification);
                console.log('[notifications][facility-booking-cancelled][facility-booking-cancelled-notification][send]: All Notifications Sent');
            }


        } catch (err) {
            console.log('[notifications][facility-booking-cancelled][facility-booking-cancelled-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },


    sendInAppNotification: async (sender, receiver, data) => {
        let  orgData = data.payload.orgData;
        let icons;
        let images;
        // if(orgData && orgData.id == '56'){
        //     icons = 'assets/icons/cbre-512x512.png';
        //     images = 'assets/icons/cbre-512x512.png';
        // }else if(orgData && orgData.id == '89'){
        //     icons = 'assets/icons/senses-512x512.png';
        //     images = 'assets/icons/senses-512x512.png';
        // }
        // else{
        //     icons = 'assets/icons/icon-512x512.png';
        //     images = 'assets/icons/icon-512x512.png';
        // }
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
                subject: 'Facility Booking Canceled',
                body: `Hi, ${receiver.name} Your Booking in Facility ${data.payload.facility} made for ${data.payload.date} at ${data.payload.time} is canceled.`,
                subjectThai: 'ยกเลิกการจองสิ่งอำนวยความสะดวก',
                bodyThai: `สวัสดี ${receiver.name} การจองของคุณในสิ่งอำนวยความสะดวก ${data.payload.facility} สำหรับ ${data.payload.date} ที่ ${data.payload.time} ถูกยกเลิก.`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/facility/your-bookings`,
                    primaryKey: Date.now()
                }
            },            
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/user/facility/your-bookings`
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
                fullName: receiver.name,
                orgId:receiver.orgId
            },
            payload: {
                ...data,
                subject: 'Facility Booking Canceled Notification',
            }
        };

        return data;
    },

    sendWebPushNotification: async (sender, receiver, data) => {

        let  orgData = data.payload.orgData;
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
                subject: 'Facility Booking Canceled',
                body: `Hi, ${receiver.name} Your Booking in Facility ${data.payload.facility} made for ${data.payload.date} at ${data.payload.time} is canceled.`,
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
        let  orgData = data.payload.orgData;
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
                subject: 'Facility Booking Canceled',
                body: `Hi, ${receiver.name} Your Booking in Facility ${data.payload.facility} made for ${data.payload.date} at ${data.payload.time} is canceled.`,
                subjectThai: 'ยกเลิกการจองสิ่งอำนวยความสะดวก',
                bodyThai: `สวัสดี ${receiver.name} การจองของคุณในสิ่งอำนวยความสะดวก ${data.payload.facility} สำหรับ ${data.payload.date} ที่ ${data.payload.time} ถูกยกเลิก.`,
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
                    url: `/user/facility/your-bookings`
                }
            ]
        }

        return data;
    },


    sendLineNotification: async (sender, receiver, data) => {
        data = {
            receiverId: receiver.id,
            message: `Hi ${receiver.name} Your Booking in Facility ${data.payload.facility} made for ${data.payload.date} at ${data.payload.time} is canceled.`
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

module.exports = bookingCanceledNotification;
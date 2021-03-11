const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const bookingapprovalNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {
            console.log('[ALLOWED CHANNELS]',allowedChannels)
            
            console.log('[notifications][facility-booking-approval][facility-booking-approval-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][facility-booking-approval][facility-booking-approval-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, bookingapprovalNotification);
                console.log('[notifications][facility-booking-approval][facility-booking-approval-notification][send]: All Notifications Sent');
            }


        } catch (err) {
            console.log('[notifications][facility-booking-approval][facility-booking-approval-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },


    sendInAppNotification: async (sender, receiver, data) => {
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
                ...data,
                subject: 'Facility Booking approval',
                body: `Hi, ${receiver.name} There is Booking in Facility required approval.`,
                subjectThai: 'การอนุมัติการจองสิ่งอำนวยความสะดวก',
                bodyThai: `สวัสดี ${receiver.name} จำเป็นต้องได้รับการอนุมัติการจองในสิ่งอำนวยความสะดวก`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/admin/facilities-management/manage-facilities-booking`,
                    primaryKey: Date.now()
                }
            },            
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/admin/facilities-management/manage-facilities-booking`
                }
            ]
        }

        return data;
    },
    
    sendEmailNotification: async (sender, receiver, data) => {
        let  orgData = data.payload;
        data = {
            receiverEmail: receiver.email,
            template: 'booking-confirmed-admin.ejs',
            templateData: {
                fullName: receiver.name,
                bookingStartDateTime:orgData.bookingStartDateTime,
                bookingEndDateTime:orgData.bookingEndDateTime,
                noOfSeats: orgData.noOfSeats, 
                facilityName: orgData.facilityName,
                orgId:receiver.orgId
            },
            payload: {
                ...data,
                subject: 'Facility Booking Approval Notification',
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
                subject: 'Facility Booking approval',
                body: `Hi, ${receiver.name} There is Booking in Facility required approval.`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `${process.env.SITE_URL}/admin/facilities-management/manage-facilities-booking`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open Home Page",
                    url: `${process.env.SITE_URL}/admin/facilities-management/manage-facilities-booking`
                }
            ]
        }

        return data;
    },

    sendSocketNotification: async (sender, receiver, data) => {
        console.log("Reciever Id for socket =========>>>",receiver.id)
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
                subject: 'Facility Booking approval',
                body: `Hi, ${receiver.name} There is Booking in Facility required approval.`,
                subjectThai: 'การอนุมัติการจองสิ่งอำนวยความสะดวก',
                bodyThai: `สวัสดี ${receiver.name} จำเป็นต้องได้รับการอนุมัติการจองในสิ่งอำนวยความสะดวก`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/admin/facilities-management/manage-facilities-booking`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/admin/facilities-management/manage-facilities-booking`
                }
            ]
        }

        return data;
    },
};

module.exports = bookingapprovalNotification;
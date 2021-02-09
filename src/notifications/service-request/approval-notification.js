const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const approvalNotification = {
    send:async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) =>{
        try{

            console.log('[notifications][service-request][approval-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][service-request][approval-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, approvalNotification);
                console.log('[notifications][service-request][approval-notification][send]: All Notifications Sent');
            }



        }catch(err){
            console.log('[notifications][service-request][approval-notification][send]:  Error', err);
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
                subject: 'Service Request assigned',
                body: `A new service request has been assigned to you by ${sender.name}`,
                subjectThai: 'มอบหมายคำขอบริการแล้ว',
                bodyThai: `ท่านได้รับมอบหมายงานแจ้งซ่อมใหม่จาก ${sender.name}`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/admin/service-order`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Service Request assigned",
                    url:`/admin/service-order`
                }
            ]
        }

        return data;
    },

    sendSocketNotification : async (sender ,receiver ,data) => {
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            channel: 'socket-notification',
            payload: {
                ...data,
                subject: 'Service Request assigned',
                body: `A new service request has been assigned to you by ${sender.name}`,
                subjectThai: 'มอบหมายคำขอบริการแล้ว',
                bodyThai: `ท่านได้รับมอบหมายงานแจ้งซ่อมใหม่จาก ${sender.name}`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/admin/service-order`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Service Request assigned",
                    url:`/admin/service-order`
                }
            ]
        }

        return data;
    },

    sendEmailNotification: async (sender, receiver, data) => {
        data = {
            receiverEmail: receiver.email,
            template: 'service-request.ejs',
            templateData: {
                fullName: receiver.name,
                title: 'Service Request assigned',
                description: `A new service request has been assigned to you by ${sender.name}`
            },
            payload: {
                ...data,
                subject: 'Service Request assigned',
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
                subject: 'Service Request assigned',
                body: `A new service request has been assigned to you by ${sender.name}`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `${process.env.SITE_URL}/admin/service-order`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Service Request assigned",
                    url: `${process.env.SITE_URL}/admin/service-order`
                }
            ]
        }

        return data;
    },

    sendSMSNotification: async (sender, receiver, data) => {
        data = {
            receiverMobileNumber: receiver.mobileNo,
            textMessage: `Hi ${receiver.name} You have assigned new service request`
        }

        return data;
    },

    sendLineNotification: async (sender, receiver, data) => {
        data = {
            receiverId: receiver.id,
            message: `Hi ${receiver.name} You have assigned new service request.`
        };

        return data;
    },
}
module.exports = approvalNotification;
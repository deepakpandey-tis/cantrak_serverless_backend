const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const parcelAcceptanceNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {

            console.log('[notifications][parcel][parcel-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, parcelAcceptanceNotification);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Sent');
            }


        } catch (err) {
            console.log('[notifications][parcel][parcel-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
    sendInAppNotification: async (sender, receiver, data) => {
        let parcelId = data.payload.parcelId
        let orgData = data.payload.orgData;
        let icons;
        let images;
        if (orgData && orgData.organisationLogo == '') {
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else {
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
        }
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
                subject: 'Parcel Acceptation',
                body: `Hi,Parcel pickup confirmation is pending please confirm to complete the process.`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/parcel/parcel-confirmation?parcels=1,2,3`,
                    primaryKey: Date.now(),
                    parcelIds: parcelId
                }
            },
            payloadThai: {
                ...data,
                subject: 'การรับพัสด',
                body: `การยืนยันรับพัสดุยังไม่เสร็จสิ้น โปรดรีบดำเนินการ`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/parcel/parcel-confirmation?parcels=${parcelId}`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Parcel Acceptation",
                    url: `/user/parcel/parcel-confirmation?parcels=${parcelId}`
                }
            ]
        }

        return data;
    },

    sendSocketNotification: async (sender, receiver, data) => {
        let parcelId = data.payload.parcelId
        let orgData = data.payload.orgData;
        let icons;
        let images;
        if (orgData && orgData.organisationLogo == '') {
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else {
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
                subject: 'Parcel Acceptation',
                body: `Hi,Parcel pickup confirmation is pending please confirm to complete the process.`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/parcel/parcel-confirmation?parcels=1,2,3`,
                    primaryKey: Date.now(),
                    parcelIds: parcelId
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Parcel Acceptation",
                    url: `/user/parcel/parcel-confirmation?parcels=${parcelId}`
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
                subject: 'Parcel Email Notification',
            }
        };

        return data;
    },


    sendWebPushNotification: async (sender, receiver, data) => {
        console.log("web push parcel for acceptance", sender, receiver, data)
        let parcelId = data.payload.parcelId
        let orgData = data.payload.orgData;
        let icons;
        let images;
        if (orgData && orgData.organisationLogo == '') {
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else {
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
        }
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: 'Parcel Acceptation',
                body: `Hi,Parcel pickup confirmation is pending please confirm to complete the process.`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `${process.env.SITE_URL}/user/parcel/parcel-confirmation/${parcelId}`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Parcel Acceptation",
                    url: `${process.env.SITE_URL}/user/parcel/parcel-confirmation/${parcelId}`
                }
            ]
        }

        return data;
    },
    sendLineNotification: async (sender, receiver, data) => {
        data = {
            receiverId: receiver.id,
            message: `Hi ${receiver.name} Parcel pickup confirmation is pending please confirm to complete the process.`
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
}
module.exports = parcelAcceptanceNotification;
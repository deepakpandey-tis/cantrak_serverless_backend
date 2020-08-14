const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const parcelAcceptanceNotification = {
    send:async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) =>{
        try{

            console.log('[notifications][parcel][parcel-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, parcelAcceptanceNotification);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Sent');
            }



        }catch(err){
            console.log('[notifications][parcel][parcel-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
    sendInAppNotification: async (sender, receiver, data) => {
        // console.log("data of parcel",data.payload.parcelId)
        let parcelId = data.payload.parcelId
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
                subject: 'Parcel Notification',
                body: `Hi!!, You have received a parcel,Please accept for picked up the parcels. ${sender.name}`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/parcel/parcel-confirmation/${parcelId}`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Parcel Pending",
                    url:`/user/parcel/parcel-confirmation/${parcelId}`
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

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: 'Parcel Notification',
                body: `Hi!!, You have received a parcel,Please accept for picked up the parcels.  ${sender.name}`,
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
                    title: "User parcel Page",
                    url: `${process.env.SITE_URL}/user/parcel/parcel-confirmation/${parcelId}`
                }
            ]
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
}
module.exports = parcelAcceptanceNotification;
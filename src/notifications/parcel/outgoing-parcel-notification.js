const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['EMAIL'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;
const QRCODE = require("qrcode");


const outgoingParcelNotification = {
    send:async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) =>{
        try{

            console.log('[notifications][parcel][parcel-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, outgoingParcelNotification);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Sent');
            }



        }catch(err){
            console.log('[notifications][parcel][parcel-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
    sendInAppNotification: async (sender, receiver, data) => {
        console.log("data of parcel for acceptance",sender,receiver,data)
        let parcelId = data.payload.parcelId
        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
                subject: 'Parcel Acceptation',
                body: `Hi!!, You have received a parcel,Please accept for picked up the parcels.`,
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `/user/parcel/parcel-confirmation?parcels=1,2,3`,
                    primaryKey: Date.now(),
                    parcelIds:parcelId
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Parcel Acceptation",
                    url:`/user/parcel/parcel-confirmation?parcels=${parcelId}`
                }
            ]
        }

        return data;
    },

    sendEmailNotification: async (sender, receiver, data) => {
        console.log("receiver detail",data)
        let unitNumber = receiver.unitNumber
        let parcelId  = receiver.parcelId

         let qrCode1 = 'org~' + data.orgId + '~unitNumber~' + unitNumber + '~parcel~' + parcelId
        let qrCode;
        if (qrCode1) {
            qrCode = await QRCODE.toDataURL(qrCode1);
        }
        

        data = {
            receiverEmail: receiver.email,
            template: 'outgoing-parcel-notification.ejs',
            templateData: {
                fullName: receiver.name,
                qrCode : qrCode

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
                subject: 'Acceptation',
                body: `Hi!!, You have received a parcel,Please accept for picked up the parcels.`,
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

    sendLineNotification: async (sender, receiver, data) => {
        data = {
            receiverId: receiver.id,
            message: `Hi ${receiver.name} You have received a parcel,Please accept for picked up the parcels.`
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
module.exports = outgoingParcelNotification;
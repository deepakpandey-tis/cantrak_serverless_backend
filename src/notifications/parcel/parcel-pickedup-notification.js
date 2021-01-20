const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const parcelPickedUpNotification = {
    send:async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) =>{
        try{

            console.log('[notifications][parcel][parcel-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, parcelPickedUpNotification);
                console.log('[notifications][parcel][parcel-notification][send]: All Notifications Sent');
            }



        }catch(err){
            console.log('[notifications][parcel][parcel-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },
    sendInAppNotification: async (sender, receiver, data) => {
        let parcelId = data.payload.parcelId
        let  orgData = data.payload.orgData;
       
        let icons;
        let images;
        if(orgData && orgData.id == '56'){
            icons = 'assets/icons/cbre-512x512.png';
            images = 'assets/icons/cbre-512x512.png';
        }else if(orgData && orgData.id == '89'){
            icons = 'assets/icons/senses-512x512.png';
            images = 'assets/icons/senses-512x512.png';
        }else{
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }


        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                ...data,
                subject: 'Parcel Picked Up',
                body: `Hi, Your parcel picked up.`,
                icon: icons,
                image: images,
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
                    url:`/user/parcel`
                }
            ]
        }

        return data;
    },

    sendSocketNotification : async (sender ,receiver ,data) =>{
        let parcelId = data.payload.parcelId
        let  orgData = data.payload.orgData;
       
        let icons;
        let images;
        if(orgData && orgData.id == '56'){
            icons = 'assets/icons/cbre-512x512.png';
            images = 'assets/icons/cbre-512x512.png';
        }else if(orgData && orgData.id == '89'){
            icons = 'assets/icons/senses-512x512.png';
            images = 'assets/icons/senses-512x512.png';
        }else{
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
                subject: 'Parcel Picked Up',
                body: `Hi, Your parcel picked up.`,
                icon: icons,
                image: images,
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
                    url:`/user/parcel`
                }
            ]
        }

        return data;
    },

    sendEmailNotification: async (sender, receiver, data) => {
        data = {
            receiverEmail: receiver.email,
            template: 'parcel-notification.ejs',
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
        
        let  orgData = data.payload.orgData;
        console.log("organisationData",orgData); 
       
        let icons;
        let images;
        if(orgData && orgData.id == '56'){
            icons = 'assets/icons/cbre-512x512.png';
            images = 'assets/icons/cbre-512x512.png';
        }else if(orgData && orgData.id == '89'){
            icons = 'assets/icons/senses-512x512.png';
            images = 'assets/icons/senses-512x512.png';
        }else{
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: 'Parcel Picked up',
                body: `Hi, "Your parcel picked up.`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    // url: `${process.env.SITE_URL}/user/parcel/parcel-confirmation/${parcelId}`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "User parcel Page",
                    url: `${process.env.SITE_URL}/user/parcel`
                }
            ]
        }

        return data;
    },

    sendLineNotification: async (sender, receiver, data) => {
        data = {
            receiverId: receiver.id,
            message: `Hi ${receiver.name} Your parcel picked up.`
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
module.exports = parcelPickedUpNotification;
const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;


const votingDocGeneratedNotification = {
    send:async(sender, receiver, data, allowedChannels = ALLOWED_CHANNELS)=>{
        try{
            console.log('[notifications][announcement][announcement-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][announcement][announcement-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, votingDocGeneratedNotification);
                console.log('[notifications][announcement][announcement-notification][send]: All Notifications Sent');
            }

        }catch(err){

        }
    },

    sendInAppNotification: async (sender, receiver, data) => {

        let title = data.payload.title;
        let description = data.payload.description;
        let url = data.payload.url;
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
                subject: title,
                body: description +`from  ${sender.name}`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: data.payload.redirectUrl,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: data.payload.redirectUrl

                }
            ]
        }

        return data;
    },


    sendEmailNotification: async (sender, receiver, data) => {
        data = {
            receiverEmail: receiver.email,
            template: 'agm/voting-doc-generated.ejs',
            templateData: {
                fullName: receiver.name,
                downloadUrl: `${process.env.SITE_URL}${data.payload.redirectUrl}`,
                orgId:receiver.orgId
            },
            payload: {
                ...data,
                subject: 'AGM - Voting Document Generated.',
            }
        };

        return data;
    },

    sendWebPushNotification: async (sender, receiver, data) => {
        let title = data.payload.title;
        let description = data.payload.description;
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
                subject: title,
                body: description + `from ${sender.name}`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: `${process.env.SITE_URL}${data.payload.redirectUrl}`,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open Home Page",
                    url: `${process.env.SITE_URL}${data.payload.redirectUrl}`
                }
            ]
        }

        return data;
    },

    sendSocketNotification: async (sender, receiver, data) => {
        let title = data.payload.title;
        let description = data.payload.description;
        let url = data.payload.url;
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
                subject: title,
                body: description + `from ${sender.name}`,
                icon: icons,
                image: images,
                extraData: {
                    dateOfArrival: Date.now(),
                    url: data.payload.redirectUrl,
                    primaryKey: Date.now()
                }
            },
            actions: [
                {
                    action: "explore",
                    title: "Open Home Page",
                    url:data.payload.redirectUrl
                }
            ]
        }
        return data;
    },


    sendLineNotification: async (sender, receiver, data) => {
       return data;
    },

    sendSMSNotification: async (sender, receiver, data) => {
       
        return data;
    }

}
module.exports = votingDocGeneratedNotification
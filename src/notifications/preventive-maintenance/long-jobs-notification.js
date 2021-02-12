const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'LINE_NOTIFY','SOCKET_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const createPmLongJobsNotification = {
    send:async(sender, receiver, data, allowedChannels = ALLOWED_CHANNELS)=>{
        try{
            console.log('[notifications][pm-jobs][pm-jobs-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][pm-jobs][pm-jobs-notification][send]: All Notifications Queued');
            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, createPmLongJobsNotification);
                console.log('[notifications][pm-jobs][pm-jobs-notification][send]: All Notifications Sent');
            }

        }catch(err){

        }
    },

    sendInAppNotification: async (sender, receiver, data) => {
        console.log("Site url",process.env.SITE_URL)
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

    sendWebPushNotification: async (sender, receiver, data) => {
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
                subject: title,
                body: description + `from ${sender.name}`,
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
                subject: 'PM Plan',
                body: `Hi, ${receiver.name} Your PM Plan is created successfully`,
                subjectThai: 'PM Plan',
                bodyThai: `สวัสดี ${receiver.name} Your PM Plan is created successfully `,
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
    }


}
module.exports = createPmLongJobsNotification;

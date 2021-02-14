const _ = require('lodash');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const createPmLongJobsNotification = {
    send: async (sender, receiver, data, allowedChannels = ALLOWED_CHANNELS) => {
        try {
            console.log('[notifications][pm-jobs][pm-jobs-notification][send]: Data:', data);

            console.log('[notifications][pm-jobs][pm-jobs-notification][send]: Notifications1:', notification);

            if (SHOULD_QUEUE) {
                await notification.queue(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, __filename);
                console.log('[notifications][pm-jobs][pm-jobs-notification][send]: All Notifications Queued');

            } else {
                await notification.send(sender, receiver, JSON.parse(JSON.stringify(data)), allowedChannels, createPmLongJobsNotification);
                console.log('[notifications][pm-jobs][pm-jobs-notification][send]: All Notifications Sent');
            }

        } catch (err) {

        }
    },

    sendInAppNotification: async (sender, receiver, data) => {
                console.log("Reciever Id =========>>>",receiver.id)
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
                        subject: 'PM Plan',
                        body: `Hi, ${receiver.name} Your PM Plan is created successfully`,
                        subjectThai: 'PM Plan',
                        bodyThai: `สวัสดี ${receiver.name} Your PM Plan is created successfully `,
                        icon: icons,
                        image: images,
                        extraData: {
                            dateOfArrival: Date.now(),
                            url: `/admin/preventive-maintenance`,
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
                        subject: 'PM Plan',
                        body: `Hi, ${receiver.name} Your PM Plan is created successfully`,
                        subjectThai: 'PM Plan',
                        bodyThai: `สวัสดี ${receiver.name} Your PM Plan is created successfully `,
                        icon: icons,
                        image: images,
                        extraData: {
                            dateOfArrival: Date.now(),
                            url: `${process.env.SITE_URL}/admin/preventive-maintenance`,
                            primaryKey: Date.now()
                        }
                    },
                    actions: [
                        {
                            action: "explore",
                            title: "Open Home Page",
                            url: `${process.env.SITE_URL}/admin/preventive-maintenance`
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
                        subject: 'PM Plan',
                        body: `Hi, ${receiver.name} Your PM Plan is created successfully`,
                        subjectThai: 'PM Plan',
                        bodyThai: `สวัสดี ${receiver.name} Your PM Plan is created successfully `,
                        icon: icons,
                        image: images,
                        extraData: {
                            dateOfArrival: Date.now(),
                            url: `${process.env.SITE_URL}/admin/preventive-maintenance`,
                            primaryKey: Date.now()
                        }
                    },
                    actions: [
                        {
                            action: "explore",
                            title: "Open Home Page",
                            url: `${process.env.SITE_URL}/admin/preventive-maintenance`
                        }
                    ]
                }
                return data;
            }
}
module.exports = createPmLongJobsNotification;

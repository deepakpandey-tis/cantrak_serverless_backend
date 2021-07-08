const knex = require('../../db/knex');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH', 'SOCKET_NOTIFY'];            //  'IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const addCheckoutNotification = {
    send: async(data) => {
        try {
            console.log('[notifications][visitor][add-checkout-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(data.sender, data.receiver, JSON.parse(JSON.stringify(data.payload)), ALLOWED_CHANNELS, __filename);
                console.log('[notifications][visitor][add-checkout-notification][send]: All Notifications Queued');
            } else {
                await notification.send(data.sender, data.receiver, JSON.parse(JSON.stringify(data.payload)), ALLOWED_CHANNELS, addCheckoutNotification);
                console.log('[notifications][visitor][add-checkout-notification][send]: All Notifications Sent');
            }
        } catch (err) {
            console.log('[notifications][visitor][add-checkout-notification][send]: Error ', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },


    sendInAppNotification: async (sender, receiver, payload) => {
        let orgData = payload.orgData;
        let icons;
        let images;
        let body;
        let bodyThai;
       
        if(orgData && orgData.organisationLogo == ''){
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else{
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
        }

        if(receiver.visitorStayover){
            body = `${receiver.visitorNames} has successfully checked-out for stayover on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
            bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
        }
        else{// Visiting
            body = `${receiver.visitorNames} has successfully checked-out for visiting on ${receiver.visitorArrivalDate}.`;
            bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: `Visitor Checked-out Notification`,
                body: body,
                subjectThai: `อนุมัติการลงทะเบียนออก`,
                bodyThai: bodyThai,
                icon: icons,
                image: images,
                extraData: {
                    url: `/user/dashboard/home`,
                    primaryKey: receiver.visitorIds
                }
            },            
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/user/visitor`
                }
            ]
        }

        console.log('INApp Notification: ', data);
        return data;
    },

    sendWebPushNotification: async (sender, receiver, payload) => {
        let orgData = payload.orgData;
        let icons;
        let images;
        let body;
        let bodyThai;
       
        if(orgData && orgData.organisationLogo == ''){
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else{
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
        }

        if(receiver.visitorStayover){
            body = `${receiver.visitorNames} has successfully checked-out for stayover on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
            bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
        }
        else{// Visiting
            body = `${receiver.visitorNames} has successfully checked-out for visiting on ${receiver.visitorArrivalDate}.`;
            bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: `Visitor Checked-out Notification`,
                body: body,
                subjectThai: `อนุมัติการลงทะเบียนออก`,
                bodyThai: bodyThai,
                icon: icons,
                image: images,
                extraData: {
                    url: `/user/dashboard/home`,
                    primaryKey: receiver.visitorIds
                }
            },            
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/user/visitor`
                }
            ]
        }

        console.log('WebPush Notification: ', data);
        return data;
    },

    sendSocketNotification: async (sender, receiver, payload) => {
        let orgData = payload.orgData;
        let icons;
        let images;
        let body;
        let bodyThai;

        if(orgData && orgData.organisationLogo == ''){
            icons = 'assets/icons/icon-512x512.png';
            images = 'assets/icons/icon-512x512.png';
        }
        else{
            icons = orgData.organisationLogo;
            images = orgData.organisationLogo;
        }

        if(receiver.visitorStayover){
            body = `${receiver.visitorNames} has successfully checked-out for stayover on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
            bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
        }
        else{// Visiting
            body = `${receiver.visitorNames} has successfully checked-out for visiting on ${receiver.visitorArrivalDate}.`;
            bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: `Visitor Checked-out Notification`,
                body: body,
                subjectThai: `อนุมัติการลงทะเบียนออก`,
                bodyThai: bodyThai,
                icon: icons,
                image: images,
                extraData: {
                    url: `/user/dashboard/home`,
                    primaryKey: receiver.visitorIds
                }
            },            
            actions: [
                {
                    action: "explore",
                    title: "Open",
                    url: `/user/visitor`
                }
            ]
        }

        console.log('Socket Notification: ', data);
        return data;
    },
}

module.exports = addCheckoutNotification;

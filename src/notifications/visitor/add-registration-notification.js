const knex = require('../../db/knex');
const notification = require('../core/notification');

const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH', 'SOCKET_NOTIFY'];            //  'IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY', 'SMS'];
const SHOULD_QUEUE = process.env.IS_OFFLINE ? false : true;

const addRegistrationNotification = {
    send: async(data) => {
        try {
            console.log('[notifications][visitor][add-registration-notification][send]: Data:', data);

            if (SHOULD_QUEUE) {
                await notification.queue(data.sender, data.receiver, JSON.parse(JSON.stringify(data.payload)), ALLOWED_CHANNELS, __filename);
                console.log('[notifications][visitor][add-registration-notification][send]: All Notifications Queued');
            } else {
                await notification.send(data.sender, data.receiver, JSON.parse(JSON.stringify(data.payload)), ALLOWED_CHANNELS, addRegistrationNotification);
                console.log('[notifications][visitor][add-registration-notification][send]: All Notifications Sent');
            }
        } catch (err) {
            console.log('[notifications][visitor][add-registration-notification][send]: Error ', err);
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
            if(sender.id == 0){// Visitor Self Registration
                body = `${sender.name} has self registred for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `${sender.name} has self registred for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
            }
            else if(sender.isCustomer){
                body = `Your pre-registration of ${receiver.visitorNames} has been confirmed for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
            }
            else{// Security Guard
                body = `${sender.name} has registered ${receiver.visitorNames} for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
            }
        }
        else{// Visiting
            if(sender.id == 0){// Visitor Self Registration
                body = `${sender.name} has self registred for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `${sender.name} has self registred for visiting check-in on ${receiver.visitorArrivalDate}.`;
            }
            else if(sender.isCustomer){
                body = `Your pre-registration of ${receiver.visitorNames} has been confirmed for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
            }
            else{// Security Guard
                body = `${sender.name} has registered ${receiver.visitorNames} for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
            }
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: `Visitor Registration Notification`,
                body: body,
                subjectThai: `Visitor Registration Notification`,
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
            if(sender.id == 0){// Visitor Self Registration
                body = `${sender.name} has self registred for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `${sender.name} has self registred for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
            }
            else if(sender.isCustomer){
                body = `Your pre-registration of ${receiver.visitorNames} has been confirmed for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
            }
            else{// Security Guard
                body = `${sender.name} has registered ${receiver.visitorNames} for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
            }
        }
        else{// Visiting
            if(sender.id == 0){// Visitor Self Registration
                body = `${sender.name} has self registred for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `${sender.name} has self registred for visiting check-in on ${receiver.visitorArrivalDate}.`;
            }
            else if(sender.isCustomer){
                body = `Your pre-registration of ${receiver.visitorNames} has been confirmed for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
            }
            else{// Security Guard
                body = `${sender.name} has registered ${receiver.visitorNames} for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
            }
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            payload: {
                subject: `Visitor Registration Notification`,
                body: body,
                subjectThai: `Visitor Registration Notification`,
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
            if(sender.id == 0){// Visitor Self Registration
                body = `${sender.name} has self registred for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `${sender.name} has self registred for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
            }
            else if(sender.isCustomer){
                body = `Your pre-registration of ${receiver.visitorNames} has been confirmed for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
            }
            else{// Security Guard
                body = `${sender.name} has registered ${receiver.visitorNames} for stayover check-in on ${receiver.visitorArrivalDate} - ${receiver.visitorDepartureDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ถึงวันที่ ${receiver.visitorDepartureDate} ได้รับการลงทะเบียนแล้ว.`;
            }
        }
        else{// Visiting
            if(sender.id == 0){// Visitor Self Registration
                body = `${sender.name} has self registred for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `${sender.name} has self registred for visiting check-in on ${receiver.visitorArrivalDate}.`;
            }
            else if(sender.isCustomer){
                body = `Your pre-registration of ${receiver.visitorNames} has been confirmed for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
            }
            else{// Security Guard
                body = `${sender.name} has registered ${receiver.visitorNames} for visiting check-in on ${receiver.visitorArrivalDate}.`;
                bodyThai = `การลงทะเบียนผู้มาติดต่อ ชื่อ ${receiver.visitorNames} วันที่ ${receiver.visitorArrivalDate} ได้รับการลงทะเบียนแล้ว.`;
            }
        }

        data = {
            orgId: sender.orgId,
            senderId: sender.id,
            receiverId: receiver.id,
            channel: 'socket-notification',
            payload: {
                subject: `Visitor Registration Notification`,
                body: body,
                subjectThai: `Visitor Registration Notification`,
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

        return data;
    },
}

module.exports = addRegistrationNotification;

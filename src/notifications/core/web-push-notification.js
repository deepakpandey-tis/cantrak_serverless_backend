const _ = require('lodash');
const knex = require('../../db/knex');
const webPush = require('web-push');

const webPushNotification = {
    send: async ({ receiverId, subject, body, icon, image, extraData, actions }) => {
        try {

            webPush.setVapidDetails(
                process.env.SITE_URL,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
            );

            let subscriptions = await knex.from('push_subscribers').where({ userId: receiverId });

            // let notification = {
            //     title: 'TIS - New Notification',
            //     body: 'Thanks for Subscribing Push Notification from TIS. We will notify you with only those messages which concerns you!',
            //     icon: 'assets/icons/icon-512x512.png',
            //     image: 'assets/icons/icon-512x512.png',
            //     data: {
            //         dateOfArrival: Date.now(),
            //         url: `${process.env.SITE_URL}/admin/dashboard/home`,
            //         primaryKey: 1
            //     },
            //     actions: [{
            //         action: "explore",
            //         title: "Open Web App"
            //     }]
            // };

            let notificationPayload = {
                notification: {
                    title: subject,
                    body: body,
                    icon: icon,
                    image: image,
                    vibrate: [100, 50, 100],
                    data: extraData,
                    actions: actions
                }
            };

            const options = {
                TTL: 120
            };

            const Parallel = require("async-parallel");
            Parallel.forEach(subscriptions, async (subscription) => {
                console.log(`[notifications][core][web-push-notification] :Sending Notification For User: ${receiverId} on Endpoint: `, subscription.endpoint);
                try {
                    const res = await webPush.sendNotification(subscription, JSON.stringify(notificationPayload), options);
                    console.log("[notifications][core][web-push-notification] :  Notification Sent:", res);
                } catch (err) {
                    console.log("[controllers][push-notification] :  Send Notification Error:", err);
                }
            });

        } catch (err) {
            console.log('[notifications][core][email-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
        }
    },

};

module.exports = webPushNotification;
const _ = require('lodash');
const knex = require('../../db/knex');
const webPush = require('web-push');

async function sendWebPush(subscription, notification, options) {

    webPush.setVapidDetails(
        'https://app1.servicemind.asia',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    return webPush.sendNotification(subscription, JSON.stringify({ notification }), options);

}

const webPushNotification = {
    send: async ({ receiverId, subject, body, icon, image, extraData, actions }) => {
        try {

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

            let notification = {
                title: subject,
                body: body,
                icon: icon,
                image: image,
                vibrate: [100, 50, 100],
                data: extraData,
                actions: actions
            };

            const options = {
                TTL: 120
            };

            const Parallel = require("async-parallel");
            Parallel.each(subscriptions, async (subs) => {
                let subscription = subs.subscription;
                try {
                    const res = await sendWebPush(subscription, notification, options);
                    console.log(`[notifications][core][web-push-notification] :Sending Notification For User: ${receiverId} on Endpoint: `, subscription.endpoint, ', Sent:', res);
                } catch (err) {
                    console.error(`[notifications][core][web-push-notification] :Sending Notification For User: ${receiverId} on Endpoint: `, subscription.endpoint, ', Failed:', err);
                }
            });

        } catch (err) {
            console.log('[notifications][core][push-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', error: err };
        }
    },

};

module.exports = webPushNotification;
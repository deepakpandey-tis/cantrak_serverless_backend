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
            //     title: "Test Notification",
            //     body: "Hi!!, This is a test notification to all users from TrainingAdmin",
            //     icon: "http://localhost:8080/assets/icons/icon-512x512.png",
            //     image: "http://localhost:8080/assets/icons/icon-512x512.png",
            //     data: {
            //         "dateOfArrival": 1595423932171,
            //         "url": "http://localhost:4200/admin/dashboard/home",
            //         "primaryKey": 1595423932171
            //     },
            //     actions: [{
            //         "action": "explore",
            //         "icon": "",
            //         "placeholder": null,
            //         "title": "Open Home Page",
            //         "type": "button"
            //     }],
            //     badge: "",
            //     dir: "auto",
            //     lang: "",
            //     renotify: false,
            //     requireInteraction: false,
            //     silent: false,
            //     tag: "",
            //     timestamp: 1595423934239,
            //     vibrate: [200, 100, 200, 100, 200, 100, 400]
            // };

            let notification = {
                title: subject,
                body: body,
                icon: icon,
                image: image,
                vibrate: [200, 100, 200, 100, 200, 100, 400],
                data: extraData,
                actions: actions,
                requireInteraction: true
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

                    if (err.statusCode == 404 || err.statusCode == 410) {
                        await knex.del().from('push_subscribers').where({ id: subs.id });
                        console.error(`[notifications][core][web-push-notification] :Deleting Expired Subscription: `, subs);
                    }
                }
            });

        } catch (err) {
            console.log('[notifications][core][push-notification][send]:  Error', err);
            return { code: 'UNKNOWN_ERROR', error: err };
        }
    },

};

module.exports = webPushNotification;
const Joi = require("@hapi/joi");
const _ = require("lodash");
const knex = require("../db/knex");
const webPush = require('web-push');


webPush.setVapidDetails(
    'https://desktop.panzuracloud.com:4000/',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const pushNotificationController = {
    subscribeUserForPush: async (req, res) => {
        try {
            console.log('[test-push-notification]: Body:', req.body);
            const user = req.me;
            const subscription = req.body;
            currentTime = new Date().getTime();

            const options = {
                TTL: 120
            };

            let insertData = {
                userId: user.id,
                subscription: JSON.stringify(subscription),
                updatedAt: currentTime,
                createdAt: currentTime
            };
            let addedData = await knex
                .insert(insertData)
                .returning(["*"])
                .into("push_subscribers");
            addedData = addedData[0];

            let notification = {
                title: 'TIS - New Notification',
                body: 'Thanks for Subscribing Push Notification from TIS. We will notify you with only those messages which concerns you!',
                icon: 'assets/icons/icon-512x512.png',
                image: 'assets/icons/icon-512x512.png',
                data: {
                    dateOfArrival: Date.now(),
                    url: `${process.env.SITE_URL}/admin/dashboard/home`,
                    primaryKey: 1
                },
                actions: [{
                    action: "explore",
                    title: "Open Web App"
                }]
            };

            webPush.sendNotification(subscription, JSON.stringify({ notification }), options)
                .then(function () {
                    res.json({
                        success: true,
                        data: { notification, options, insertedRecord: addedData }
                    }).status(200);
                })
                .catch(function (error) {
                    console.log("[controllers][push-notification] :  Send Notification Error:", error);
                    res.json({
                        error: error,
                        data: { subscription, notification, options }
                    }).status(500);
                });

        } catch (err) {
            console.log("[controllers][push-notification] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
};

module.exports = pushNotificationController;

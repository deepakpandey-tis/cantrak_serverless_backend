const Joi = require('@hapi/joi');
const moment = require('moment');
const _ = require('lodash');

const knex = require('../db/knex');

const notificationController = {


    getUnreadNotificationCount: async (req, res) => {
        try {

            const userId = req.me.id;
            console.log('[controllers][notification][getUnreadNotificationCount], Get Notifications for User:', userId);

            let total = await knex.count("* as count").from("user_notifications")
                .where({ receiverId: userId, readAt: null })
                .first();

            res.status(200).json({
                data: {
                    unreadCount: total.count
                },
            });

        } catch (err) {
            console.log('[controllers][notification][getUnreadNotificationCount], Err', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    getUnreadNotifications: async (req, res) => {
        try {

            const userId = req.me.id;
            console.log('[controllers][notification][getUnreadNotifications], Get Notifications for User:', userId);
            let total, rows;

            let reqData = req.query;
            let pagination = {};
            let perPage = reqData.limit || 10;
            let page = reqData.page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * perPage;

            [total, rows] = await Promise.all([
                knex
                    .count("* as count")
                    .from("user_notifications")
                    .where({ receiverId: userId, readAt: null })
                    .first(),

                knex
                    .from("user_notifications")
                    .where({ receiverId: userId, readAt: null })
                    .orderBy('createdAt', 'desc')
                    .offset(offset)
                    .limit(perPage)
            ]);

            res.status(200).json({
                data: {
                    notifications: rows,
                    currentPage: page,
                    limit: perPage,
                    total: total.count,
                    from: ((page - 1) * perPage) + 1,
                    to: page * perPage,
                    nextPage: total.count > (page * perPage) ? page + 1 : null
                },
            });

        } catch (err) {
            console.log('[controllers][notification][getUnreadNotifications], Err', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    clearAllNotifications: async (req, res) => {

        try {

            const userId = req.me.id;
            console.log('[controllers][notification][clearAllNotifications], Mark All Notifications read  for User:', userId);

            const currentTime = new Date().getTime();

            let updatedNotifications = await knex.update({ readAt: currentTime, updatedAt: currentTime }).where({ receiverId: userId }).returning(['*']).into('user_notifications');

            res.status(200).json({
                data: {
                    readNotificationsCount: updatedNotifications.length
                },
            });

        } catch (err) {
            console.log('[controllers][notification][clearAllNotifications], Err', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }

    },


    markAsClicked: async (req, res) => {

        try {

            const userId = req.me.id;
            const payload = req.body;
            console.log('[controllers][notification][markAsClicked], Mark All Notifications read  for User:', userId);
            console.log('[controllers][notification][markAsClicked], Payload:', payload);

            const currentTime = new Date().getTime();

            let updatedNotifications = await knex.update({ clickedAt: currentTime, readAt: currentTime, updatedAt: currentTime }).where({ id: payload.notificationId, receiverId: userId }).returning(['*']).into('user_notifications');

            res.status(200).json({
                data: {
                    readNotificationsCount: updatedNotifications
                },
            });

        } catch (err) {
            console.log('[controllers][notification][clearAllNotifications], Err', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }

    },

}

module.exports = notificationController;
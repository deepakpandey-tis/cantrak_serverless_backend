const { Router } = require("express")

const router = Router();
const testNotification = require('../notifications/test/test-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');

// const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SMS', 'SOCKET_NOTIFY'];
const ALLOWED_CHANNELS = ['IN_APP', 'SOCKET_NOTIFY'];


router.get('/', async (req, res) => {
    try {

        // let sender = await knex.from('users').where({ id: 406 }).first();
        // let receiver = await knex.from('users').where({ id: 1121 }).first();
        // let receiver = await knex.from('users').where({ id: 406 }).first();    // Admin - TrainingAdmin
        // let receiver = await knex.from('users').where({ id: 1121 }).first();  // Tenant - daniel15@mailinator.com

        let data = {
            payload: {
            }
        };

        // await testNotification.send(sender, receiver, data);
        // await testNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

        // Trigger Daily Digest emails...
        // const dailyDigestHelper = require("../helpers/daily-digest");
        // await dailyDigestHelper.prepareDailyDigestForUsers();
        // await knex.raw(`ALTER TABLE public.users ADD "deactivationStatus" bool NULL DEFAULT false`)

        let a;

        if (process.env.IS_OFFLINE) {
            a = true;
        } else {
            a = false;
        }

        res.json({
            IS_OFFLINE: process.env.IS_OFFLINE,
            ifCheck: a,
            typeOf: typeof process.env.IS_OFFLINE,
            typeof1: typeof true
        });

    } catch (err) {
        res.status(200).json({ failed: true, error: err });
    }
})

router.post('/', trimmer, (req, res) => {
    return res.status(200).json(req.body)
})

module.exports = router;
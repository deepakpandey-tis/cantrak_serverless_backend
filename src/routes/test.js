const { Router } = require("express")

const router = Router();
const testNotification = require('../notifications/test/test-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');

// const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SMS'];
const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH'];



router.get('/', async (req, res) => {
    try {

        let sender = await knex.from('users').where({ id: 406 }).first();
        let receiver = await knex.from('users').where({ id: 750 }).first();

        let data = {
            payload: {
            }
        };

        // await testNotification.send(sender, receiver, data);
        await testNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

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
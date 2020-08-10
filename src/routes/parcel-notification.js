const { Router } = require("express")

const router = Router();
const parcelNotification = require('../notifications/parcel/parcel-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');

const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH'];


router.post('/parcel-notification',async(req,res)=>{
    try{
        console.log("requested body",req.body)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id }).first();

        let data = {
            payload: {
            }
        };
        await parcelNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

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


    }catch(err){
        res.status(200).json({ failed: true, error: err });
    }

    router.post('/',trimmer,(req,res)=>{
        return res.status(200).json(req.body)
    })
})
module.exports = router
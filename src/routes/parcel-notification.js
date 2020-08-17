const { Router } = require("express")

const router = Router();
const parcelNotification = require('../notifications/parcel/parcel-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');
const authMiddleware = require("../middlewares/auth");
const parcelAcceptanceNotification = require("../notifications/parcel/parcel-acceptance-notification");
const parcelPickedUpNotification = require("../notifications/parcel/parcel-pickedup-notification");
// const { CloudFrontCustomizations } = require("aws-sdk/lib/services/cloudfront");

const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH'];


router.post('/parcel-notification',authMiddleware.isAuthenticated, async(req,res)=>{
    try{
        // console.log("org user",req.me.id)
        console.log("requested tenant id for notification",req.body.id)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id }).first();
        console.log("reciever tenant",receiver)

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
}),

router.post('/parcel-acceptance-notification',authMiddleware.isAuthenticated, async(req,res)=>{
    try{
        // console.log("org user",req.me.id)
        console.log("requested tenant id for notification",req.body)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id }).first();
        console.log("reciever tenant",receiver)

        let data = {
            payload: {
                parcelId:req.body.parcelId
            }
        };
        await parcelAcceptanceNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

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
}),
router.post('/parcel-pickedUp-notification',authMiddleware.isAuthenticated, async(req,res)=>{
    try{
        // console.log("org user",req.me.id)
        console.log("requested tenant id for notification",req.body)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id }).first();
        console.log("reciever tenant",receiver)

        let data = {
            payload: {
                parcelId:req.body.parcelId
            }
        };
        await parcelPickedUpNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

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
}),

module.exports = router
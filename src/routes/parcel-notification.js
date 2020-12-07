const { Router } = require("express")

const router = Router();
const parcelNotification = require('../notifications/parcel/parcel-notification');
const trimmer = require('../middlewares/trimmer');
const QRCODE = require("qrcode");


const knex = require('../db/knex');
const authMiddleware = require("../middlewares/auth");
const parcelAcceptanceNotification = require("../notifications/parcel/parcel-acceptance-notification");
const parcelPickedUpNotification = require("../notifications/parcel/parcel-pickedup-notification");
const outgoingParcelNotification = require("../notifications/parcel/outgoing-parcel-notification");


const ALLOWED_CHANNELS = ['IN_APP', 'EMAIL', 'WEB_PUSH', 'SOCKET_NOTIFY', 'LINE_NOTIFY'];


router.post('/parcel-notification',authMiddleware.isAuthenticated, async(req,res)=>{
    try{
        // console.log("org user",req.me.id)
        // console.log("requested tenant id for notification",req.body.id)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id }).first();
        // console.log("reciever tenant",receiver)
        let orgMaster = await knex.from("organisations").where({ id: req.orgId, organisationAdminId: 994 }).orWhere({ id: req.orgId, organisationAdminId: 1188 }).first();
        // console.log("requested tenant id for notification orgMaster",orgMaster)



        let data = {
            payload: {
                orgData : orgMaster
            }
        };
        await parcelNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

      

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
        console.log("requested tenant id for notification",req.body.id)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id[0] }).first();
        // console.log("reciever tenant",receiver)
        // console.log("total parcel id",req.body.parcelId.join(','))
        let orgMaster = await knex.from("organisations").where({ id: req.orgId, organisationAdminId: 994 }).orWhere({ id: req.orgId, organisationAdminId: 1188 }).first();

        let data = {
            payload: {
                orgData : orgMaster,
                parcelId:req.body.parcelId.join(',')
            }
        };
        await parcelAcceptanceNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

       
        res.json({
            IS_OFFLINE: process.env.IS_OFFLINE,
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
        console.log("requested tenant id for notification",req.body)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.id }).first();
        console.log("reciever tenant",receiver)
        let orgMaster = await knex.from("organisations").where({ id: req.orgId, organisationAdminId: 994 }).orWhere({ id: req.orgId, organisationAdminId: 1188 }).first();


        let data = {
            payload: {
                orgData : orgMaster,
                parcelId:req.body.parcelId
            }
        };
        await parcelPickedUpNotification.send(sender, receiver, data, ALLOWED_CHANNELS);


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
router.post('/outgoing-parcel-notification',authMiddleware.isAuthenticated, async(req,res)=>{
    try{
        // console.log("org user",req.me.id)
        console.log("requested receiver for notification",req.body)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        // let receiver = await knex.from('users').where({ id: req.body.id }).first();
        let receiver = req.body
        console.log("reciever tenant",receiver)
        // let qrCode1 = 'org~' + data.orgId + '~unitNumber~' + unitNumber + '~parcel~' + parcelId
        // let qrCode;
        // if (qrCode1) {
        //     qrCode = await QRCODE.toDataURL(qrCode1);
        // }
        // console.log("qr code1",qrCode)
        let orgMaster = await knex.from("organisations").where({ id: req.orgId, organisationAdminId: 994 }).orWhere({ id: req.orgId, organisationAdminId: 1188 }).first();


        let data = {
            payload: {
                orgData : orgMaster,
                parcelId:req.body.parcelId,
                orgId:req.orgId,
                // qrCode:req.body.url
                // qrCode:qrCode
            }
        };
        await outgoingParcelNotification.send(sender, receiver, data, ALLOWED_CHANNELS);


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
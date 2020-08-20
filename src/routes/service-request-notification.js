const { Router } = require("express")

const router = Router();
const serviceRequestNotification = require('../notifications/service-request/approval-notification');
const trimmer = require('../middlewares/trimmer');

const knex = require('../db/knex');
const authMiddleware = require("../middlewares/auth");
// const { CloudFrontCustomizations } = require("aws-sdk/lib/services/cloudfront");

const ALLOWED_CHANNELS = ['IN_APP', 'WEB_PUSH', 'LINE_NOTIFY'];


router.post('/approval-notification',authMiddleware.isAuthenticated, async(req,res)=>{
    try{
        // console.log("org user",req.me.id)
        console.log("requested tenant id for notification",req.body.id)
        let sender = await knex.from('users').where({ id: req.me.id }).first();
        let receiver = await knex.from('users').where({ id: req.body.mainUserId }).first();
        
        console.log("requested mainUserId id for notification",req.body.mainUserId);
        console.log("requested additionalUsers id for notification",req.body.additionalUsers);
        
      //  console.log("receiver tenant",receiver)

        let data = {
            payload: {
            }
        };
        await serviceRequestNotification.send(sender, receiver, data, ALLOWED_CHANNELS);

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
const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');
const fs = require('fs')
const request = require("request");
const path = require("path");
const QRCode = require('qrcode')
const uuid = require('uuid/v4')
const moment = require('moment')


const agmController = {

    generateAGMId: async(req,res) =>{
        try {
            const generatedId = await knex("agm_master")
            .insert({ createdAt: new Date().getTime() })
            .returning(["*"]);
        return res.status(200).json({
            data: {
                id: generatedId[0].id,
            },
        });
        } catch (err) {
            console.log("[controllers][AGM][generate] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
            });
            
        }
    },

    addAGMPreparation: async(req,res)=>{
        try {
            let agmPrepPayload = req.body


            await knex.transaction(async (trx)=>{
                const payload =_.omit(req.body,[
                    "agmId",
                    "votingAgendaName",
                    "description",
                    "proxyDocumentName",
                    "ProxyDocumentTemplateId",
                    "subDocument"
                ])

                const schema = Joi.object().keys({
                    name: Joi.string().required(),
                    companyId: Joi.string().required(),
                    projectId: Joi.string().required(),
                    agmdate:  Joi.string().required()
                })
                const result = Joi.validate(payload, schema);
                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message },
                        ],
                    });
                }

                let checkUpdate = await knex("agm_master")
                    .where({ id: req.body.agmId })
                    .first();

                    if(checkUpdate && checkUpdate.moderationStatus == true){
                        message = "AGM updated successfully!";
                    }else {
                        message = "AGM added successfully!";
                    }
        
                    let currentTime = new Date().getTime();
        
                    let addAGMResultData = await knex("agm_master")
                    .update({
                        ...payload,
                        updatedAt: currentTime,
                        createdAt: currentTime,
                        orgId: req.orgId,
                        createdBy: req.me.id,
                        moderationStatus : true
                    })
            })

           

        } catch (err) {
             return res.status(200).json({
                errors: [
                    { code: 'UNKNOWN SERVER ERROR', message: err.message }
                ]
            })
        }
    }
  
}

module.exports = agmController;

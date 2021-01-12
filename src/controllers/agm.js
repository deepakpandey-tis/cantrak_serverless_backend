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

    generateAGMId: async (req, res) => {
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

    addAGMPreparation: async (req, res) => {
        try {
            let agmPrepPayload = req.body


            await knex.transaction(async (trx) => {
                const payload = _.omit(req.body, [
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
                    agmdate: Joi.string().required()
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

                if (checkUpdate && checkUpdate.moderationStatus == true) {
                    message = "AGM updated successfully!";
                } else {
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
                        moderationStatus: true
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
    ,
    /**IMPORT OWNER DATA */
    importOwnerData: async (req, res) => {

        try {

            let data = req.body;
            console.log("+++++++++++++", data[0], "=========");
            let totalData = data.length - 1;
            let fail = 0;
            let success = 0;
            let result = null;
            let userId = req.me.id;
            let errors = [];
            let header = Object.values(data[0]);
            header.unshift('Error');
            errors.push(header)

            if (data[0].A === 'UNIT_NO' &&
                data[0].B === 'OWNER_NAME' &&
                data[0].C === 'OWNERSHIP_RATIO' &&
                data[0].D === 'ELIGIBILITY_TOGGLE'
            ) {
                if (data.length > 0) {

                    let i = 0;
                    for (let ownerData of data) {
                        i++;
                        if (i > 1) {

                            if (!ownerData.A) {
                                let values = _.values(ownerData)
                                values.unshift('Unit no. can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!ownerData.B) {
                                let values = _.values(ownerData)
                                values.unshift('Owner name can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!ownerData.C) {
                                let values = _.values(ownerData)
                                values.unshift('Ownership ratio can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!ownerData.D) {
                                let values = _.values(ownerData)
                                values.unshift('Eligibility can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }
                            let unitId;
                            let checkExist = await knex("property_units")
                                .select("id")
                                .where({
                                    orgId: req.orgId,
                                    unitNumber: ownerData.A.toUpperCase(),
                                });

                            if (!checkExist.length > 0) {
                                let values = _.values(ownerData)
                                values.unshift('Unit Number Does not exist!')
                                errors.push(values);
                                fail++;
                                continue;

                            } else {
                                unitId = checkExist[0].id;
                            }

                            let insertData = {
                                agmId: "",
                                unitId: "",
                                ownerName: ownerData.B,
                                ownershipRatio: ownerData.C,
                                eligibility: ownerData.D,
                                orgId: req.orgId,
                                isActive: true,
                                createdAt: new Date().getTime(),
                                updatedAt: new Date().getTime(),
                                importedBy: req.me.id
                            };

                            let resultData = await knex
                                .insert(insertData)
                                .returning(["*"])
                                .into("agm_owner_master");
                            success++;



                        }
                    }
                }

            } else {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
                    ]
                });
            }



        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN SERVER ERROR', message: err.message }
                ]
            })
        }

    }


}

module.exports = agmController;

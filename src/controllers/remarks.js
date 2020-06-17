const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const AWS = require("aws-sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const https = require("https");
const imageHelper = require("../helpers/image");


const remarksController = {

    getImageUploadUrl: async (req, res) => {
        const mimeType = req.body.mimeType;
        const filename = req.body.filename;
        const type = req.body.type;
        try {
            const uploadUrlData = await imageHelper.getUploadURL(mimeType, filename, type);

            res.status(200).json({
                data: {
                    uploadUrlData: uploadUrlData
                },
                message: "Upload Url generated succesfully!"
            });
        } catch (err) {
            console.log("[controllers][service][getImageUploadUrl] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    
    updateRemarksNotes: async (req, res) => {
        // Define try/catch block
        try {
            let problemImagesData = [];
            let userId = req.me.id;

            await knex.transaction(async trx => {
                let upNotesPayload = _.omit(req.body, ["images"]);
                console.log("[controllers][remarks][updateRemarksNotes] : Request Body", upNotesPayload);

                // validate keys
                const schema = Joi.object().keys({
                    entityId: Joi.number().required(),
                    entityType: Joi.string().required(),
                    description: Joi.string().required()
                });

                // // validate params
                const result = Joi.validate(upNotesPayload, schema);

                if (result && result.hasOwnProperty("error") && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATION ERRORS", message: result.message.error }
                        ]
                    });
                }

                const currentTime = new Date().getTime();
                // Insert into remarks master table
                const insertData = {
                    entityId: upNotesPayload.entityId,
                    entityType: upNotesPayload.entityType,
                    description: upNotesPayload.description,
                    orgId: req.orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                };
                console.log("[controllers][remarks][postRemarksNotes] : Insert Data", insertData);

                const resultRemarksNotes = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");
                notesData = resultRemarksNotes;
                remarkNoteId = notesData[0];


                let usernameRes = await knex('users').where({ id: notesData[0].createdBy }).select('name')
                let username = usernameRes[0].name;
                notesData = { ...notesData[0], createdBy: username }

                /*INSERT IMAGE TABLE DATA OPEN */

                if (req.body.images && req.body.images.length) {
                    let imagesData = req.body.images;
                    for (image of imagesData) {
                        let d = await knex
                            .insert({
                                entityId: remarkNoteId.id,
                                ...image,
                                entityType: 'remarks_master',
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("images");

                        problemImagesData.push(d[0]);
                    }
                }

                /*INSERT IMAGE TABLE DATA CLOSE */
                if (problemImagesData.length) {
                    notesData = { ...notesData, s3Url: problemImagesData[0].s3Url }
                } else {
                    notesData = { ...notesData, s3Url: '' }
                }

                trx.commit;

                res.status(200).json({
                    data: {
                        remarksNotesResponse: {
                            notesData: [notesData]
                        }
                    },
                    message: "Remarks Notes updated successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][remarks][addRemarks]:  : Error", err);

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getRemarksNotesList: async (req, res) => {
        try {
            let remarksNotesList = null;
            let remarksData = req.body;

            const schema = Joi.object().keys({
                entityId: Joi.number().required(),
                entityType: Joi.string().required()
            });

            let result = Joi.validate(remarksData, schema);
            console.log("[controllers][remarks][getRemarksNotes]: JOi Result", result);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
                });
            }

            let entityId = remarksData.entityId;
            let entityType = remarksData.entityType;

            let remarksNotesResult = await knex.raw(`select "remarks_master"."id","remarks_master"."description","remarks_master"."createdAt", "remarks_master"."createdBy","users"."name" as "createdBy" from "remarks_master" inner join "users" on "remarks_master"."createdBy" = "users"."id" where "remarks_master"."orgId" = ${req.orgId} and "remarks_master"."entityId" = ${entityId}  and "remarks_master"."entityType" = '${entityType}' and "remarks_master"."isActive" = 'true' ORDER BY "remarks_master"."id"  DESC LIMIT 50`)

            remarksNotesList = remarksNotesResult.rows;
            console.log("remarks rows", remarksNotesList);

            const Parallel = require('async-parallel');
            remarksNotesList = await Parallel.map(remarksNotesList, async item => {
                let images = await knex.raw(
                    `select * from "images" 
                     where "images"."entityId"= ${item.id} and 
                    "images"."entityType" = 'remarks_master' and 
                    "images"."orgId" = ${req.orgId} `
                );
                item.images = images.rows;
                return item;
            });

            console.log("remarksList", remarksNotesList);

            return res.status(200).json({
                data: remarksNotesList,
                message: "Remarks Notes Details"
            });

        } catch (err) {
            console.log("[controllers][remarks][getRemarks]:  : Error", err);

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteRemarksNotes: async (req, res) => {
        try {
            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                const remarkPayload = req.body;
                const schema = Joi.object().keys({
                    remarkId: Joi.number().required()
                });

                let result = Joi.validate(remarkPayload, schema);
                console.log("[controllers][remarks][deleteRemarks]: JOi Result", result);

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                // Now soft delete and return
                let updatedRemark = await knex
                    .update({
                        isActive: "false",
                        updatedAt: currentTime,
                        orgId: req.orgId
                    })
                    .where({
                        id: remarkPayload.remarkId
                    })
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");

                trx.commit;

                return res.status(200).json({
                    data: {
                        deletedRemark: updatedRemark
                    },
                    message: "Remarks deleted successfully !"
                });
            });
        } catch (err) {
            console.log("[controllers][remarks][deleteRemarks]:  : Error", err);

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },


}


module.exports = remarksController;
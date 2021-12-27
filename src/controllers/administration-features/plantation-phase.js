const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");
const knexReader = require("../../db/knex-reader");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require("fs");
const path = require("path");
// const request = require("request");
const { whereIn } = require("../../db/knex");
const { join } = require("path");

const plantationPhaseController = {
    addPlantationPhase: async (req, res) => {
        try {
            let plantationPhase = null;
            let userId = req.me.id;
            let orgId = req.orgId;

            const payload = req.body;

            const schema = Joi.object().keys({
                // id: Joi.string().required(),
                companyId: Joi.string().required(),
                plantationId: Joi.string().required(),
                plantationTypeId: Joi.string().required(),
                code: Joi.string().required(),
                description: Joi.string().allow("").optional(),
                addressEng: Joi.string().allow("").optional(),
                addressThai: Joi.string().allow("").optional(),
            });

            const result = Joi.validate(payload, schema);
            console.log(
                "[controllers][administrationFeatures][addPlantationPhase]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            /*CHECK DUPLICATE VALUES OPEN */
            let existValue = await knex('plantation_phases')
                .where({ code: payload.code.toUpperCase(), plantationId: payload.plantationId, orgId: orgId });
            if (existValue && existValue.length) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "Plantation Phase code already exist!!" }
                    ]
                });
            }
            /*CHECK DUPLICATE VALUES CLOSE */

            await knex.transaction(async trx => {

/*                 let checkBuildInfoUpdate = await knex("building_info")
                    .where({ buildingId: payload.id })
                    .first()

                if (checkBuildInfoUpdate && checkBuildInfoUpdate.moderationStatus == false) {
                    let updateModerationStatus = await knex('building_info')
                        .update({ moderationStatus: true })
                        .where({ buildingId: payload.id, orgId: req.orgId })
                        .returning(['*'])
                }
                let checkContactInfoUpdate = await knex("contact_info")
                    .where({ buildingId: payload.id })
                    .first()

                if (checkContactInfoUpdate && checkContactInfoUpdate.moderationStatus == false) {
                    let updateModerationStatus = await knex('contact_info')
                        .update({ moderationStatus: true })
                        .where({ buildingId: payload.id, orgId: req.orgId })
                        .returning(['*'])
                }
 */
                let currentTime = new Date().getTime();
                let insertData = {
                    ...payload,
                    code: payload.code.toUpperCase(),
                    orgId: orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime
                };

                let insertResult = await knex
                    // .update(insertData)
                    // .where({ id: payload.id })
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("plantation_phases");
                plantationPhase = insertResult[0];
                trx.commit;
            });

            return res.status(200).json({
                data: {
                    plantationPhase: plantationPhase
                },
                message: "Plantation Phase added successfully."
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][addPlantationPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    addPlantationInfo: async (req, res) => {
        try {
            let addedDescription = []

            const payload = _.omit(req.body, ['description'])

            const schema = Joi.object().keys({
                id: Joi.string().required(),
                title: Joi.string().required(),
                // description:Joi.string().allow('').optional()
            })

            const result = Joi.validate(payload, schema);

            console.log(
                "[controllers][administrationFeatures][addPlantationInfo]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            await knex.transaction(async trx => {
                // const payload = req.body

                let currentTime = new Date().getTime();

                let descriptionPayload = req.body.description

                let delPlantationPhaseInfo = await knex("building_info")
                    .where({ buildingId: req.body.id, orgId: req.orgId })
                    .del()

                addedDescription = []
                for (let d of descriptionPayload) {
                    let addedResult = await knex("building_info")
                        .insert({
                            buildingId: req.body.id,
                            title: req.body.title,
                            description: d.description,
                            updatedAt: currentTime,
                            createdAt: currentTime,
                            orgId: req.orgId,
                            createdBy: req.me.id,
                            updatedBy: req.me.id
                        })
                        .returning(["*"])
                    addedDescription.push(addedResult[0])
                }
                trx.commit;
            })
            return res.status(200).json({
                data: {
                    plantationPhaseInfo: addedDescription
                },
                message: "Plantation Phase Info added successfully."
            });

        } catch (err) {

            console.log(
                "[controllers][administrationFeatures][addPlantationInfo] :  Error",
                err
            );

        }
    },

    getPlantationInfoByPlantationId: async (req, res) => {
        try {

            console.log("get plantation phase info", req.body)
            let payload = req.body

            const schema = Joi.object().keys({
                id: Joi.string().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
                });
            }

            let [plantationPhaseInfo, images] = await Promise.all([
                knexReader.from("building_info")
                    .select('*')
                    .where({ "building_info.buildingId": payload.id, "building_info.orgId": req.orgId }),
                knexReader
                    .from('images')
                    .where({ entityId: payload.id, entityType: "building_info" })
            ])

            return res.status(200).json({
                data: {
                    plantationPhaseInfo,
                    images
                }
            })
        } catch (err) {
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
            });
        }
    },

    addContactInfo: async (req, res) => {
        try {
            let addedInfo = []
            const payload = _.omit(req.body, ['contactInfo'])

            const schema = Joi.object().keys({
                id: Joi.string().required(),
                // title:Joi.string().required(),
                // description:Joi.string().allow('').optional()
            })

            const result = Joi.validate(payload, schema);

            console.log(
                "[controllers][administrationFeatures][addContactInfo]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            await knex.transaction(async trx => {
                // const payload = req.body
                let currentTime = new Date().getTime();
                let contactPayload = req.body.contactInfo
                console.log("contact payload", contactPayload)
                addedInfo = []
                let delContact = await knex("contact_info")
                    .where({ buildingId: req.body.id, orgId: req.orgId })
                    .del()

                for (let c of contactPayload) {
                    let addedResult = await knex("contact_info")
                        .insert({
                            buildingId: req.body.id,
                            contactId: c.contactName,
                            contactValue: c.contactValue,
                            updatedAt: currentTime,
                            createdAt: currentTime,
                            orgId: req.orgId,
                            createdBy: req.me.id,
                            updatedBy: req.me.id
                        })
                        .returning(["*"])
                    addedInfo.push(addedResult[0])
                }
                trx.commit;
            })
            return res.status(200).json({
                data: {
                    contactInfo: addedInfo
                },
                message: "Contact Info added successfully."
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][addContactInfo] :  Error",
                err
            );

        }
    },

    getContactInfoById: async (req, res) => {
        try {
            let payload = req.body

            const schema = Joi.object().keys({
                id: Joi.string().required()
            })

            const result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
                });
            }

            let [contactInfo, images] = await Promise.all([
                knexReader.from("contact_info")
                    .select('*')
                    .where({ "contact_info.buildingId": payload.id, "contact_info.orgId": req.orgId }),
                knexReader
                    .from('images')
                    .where({ entityId: payload.id, entityType: "contact_info" })
            ])

            return res.status(200).json({
                data: {
                    contactInfo,
                    images
                }
            })
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getContactInfoById] :  Error",
                err
            );
        }
    },

    updatePlantationPhase: async (req, res) => {
        try {
            let userId = req.me.id;
            let orgId = req.orgId;

            let plantationPhase = null;
            const payload = req.body;

            const schema = Joi.object().keys({
                id: Joi.string().required(),
                companyId: Joi.string().required(),
                plantationId: Joi.string().required(),
                plantationTypeId: Joi.string().required(),
                code: Joi.string().required(),
                description: Joi.string().allow("").allow(null).optional(),
                addressEng: Joi.string().allow("").allow(null).optional(),
                addressThai: Joi.string().allow("").allow(null).optional(),
            });

            const result = Joi.validate(payload, schema);
            console.log(
                "[controllers][administrationFeatures][updatePlantationPhase]: JOi Result",
                result
            );

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            /*CHECK DUPLICATE VALUES OPEN */
            let existValue = await knex('plantation_phases')
                .where({ code: payload.code.toUpperCase(), plantationId: payload.plantationId, orgId: orgId });

            if (existValue && existValue.length) {

                if (existValue[0].id === payload.id) {

                } else {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: "Plantation Phase code already exist!!" }
                        ]
                    });
                }
            }
            /*CHECK DUPLICATE VALUES CLOSE */

            await knex.transaction(async trx => {
                let currentTime = new Date().getTime();
                let insertData = { ...payload, code: payload.code.toUpperCase(), updatedBy: userId, updatedAt: currentTime };
                let insertResult = await knex
                    .update(insertData)
                    .where({ id: payload.id, orgId: orgId, createdBy: userId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("plantation_phases");
                plantationPhase = insertResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    plantationPhase: plantationPhase
                },
                message: "Plantation Phase detail updated successfully."
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][updatePlantationPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    generatePlantationId: async (req, res) => {
        try {
            const generatedId = await knex("plantation_phases")
                .insert({ createdAt: new Date().getTime() })
                .returning(["*"]);
            return res.status(200).json({
                data: {
                    id: generatedId[0].id,
                },
            });
        } catch (err) {
            console.log("[controllers][administrationFeatures][generatePlantationId] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
            });
        }
    },

    viewPlantationPhase: async (req, res) => {
        try {
            let plantationPhase = null;
            let payload = req.body;
            let orgId = req.orgId;

            const schema = Joi.object().keys({
                id: Joi.string().required()
            });
            const result = Joi.validate(payload, schema);
            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            let sqlResult = await knexReader("plantation_phases")
                .leftJoin(
                    "companies",
                    "plantation_phases.companyId",
                    "companies.id"
                )
                .leftJoin(
                    "plantations",
                    "plantation_phases.plantationId",
                    "plantations.id"
                )
                .leftJoin(
                    "plantation_types",
                    "plantation_phases.plantationTypeId",
                    "plantation_types.id"
                )
                .select(
                    "plantation_phases.*",
                    "companies.companyName as companyName",
                    "companies.companyId as compId",
                    "companies.id as companyId",
                    "plantations.name",
                    "plantation_types.code as plantationTypeCode",
                    "plantations.code as plantationCode",
                    "plantation_types.name as plantationTypeName",
                )
                .where({
                    "plantation_phases.id": payload.id,
                    "plantation_phases.orgId": orgId
                });

            plantationPhase = _.omit(sqlResult[0], [
                "plantation_phases.createdAt",
                "plantation_phases.updatedAt"
            ]);

            return res.status(200).json({
                data: {
                    plantationPhase: plantationPhase
                },
                message: "Plantation Phase detail"
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][viewPlantationPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    deletePlantationPhase: async (req, res) => {
        try {
            let userId = req.me.id;
            let plantationPhase = null;
            let message;
            let payload = req.body;
            let orgId = req.orgId;

            const schema = Joi.object().keys({
                id: Joi.string().required()
            });
            const result = Joi.validate(payload, schema);
            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }

            await knex.transaction(async trx => {

                let sqlResult;
                let currentTime = new Date().getTime();
                let checkStatus = await knex.from('plantation_phases').where({ id: payload.id }).returning(['*'])
                if (checkStatus && checkStatus.length) {

                    if (checkStatus[0].isActive == true) {

                        sqlResult = await knex
                            .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
                            .where({ id: payload.id })
                            .returning(["*"])
                            .transacting(trx)
                            .into("plantation_phases");
                        plantationPhase = sqlResult[0];
                        message = "Plantation Phase deactivate successfully!"

                    } else {

                        sqlResult = await knex
                            .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
                            .where({ id: payload.id })
                            .returning(["*"])
                            .transacting(trx)
                            .into("plantation_phases");
                        plantationPhase = sqlResult[0];
                        message = "Plantation Phase activate successfully!"
                    }
                }
                trx.commit;
            });

            return res.status(200).json({
                data: {
                    plantationPhase: plantationPhase
                },
                message: message
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][deletePlantationPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseList: async (req, res) => {
        try {

            let plantations = req.userPlantationResources[0].plantations;

            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "plantation_phases.code";
                sortPayload.orderBy = "asc"
            }
            let orgId = req.orgId;
            let {
                companyId,
                plantationId,
                code,
                plantationTypeId
            } = req.body;
            let reqData = req.query;
            let pagination = {};

            if (companyId || plantationId || code || plantationTypeId) {


                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                let [total, rows] = await Promise.all([
                    knexReader
                        .count("* as count")
                        .from("plantation_phases")
                        .leftJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .leftJoin(
                            "companies",
                            "plantation_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "plantation_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .where({
                            "plantations.isActive": true,
                            "plantation_phases.orgId": orgId
                        })
                        .where(qb => {
                            if (companyId) {
                                qb.where('plantation_phases.companyId', companyId)
                            }

                            if (plantationId) {
                                qb.where('plantation_phases.plantationId', plantationId)
                            }
                            if (plantationTypeId) {
                                qb.where('plantation_phases.plantationTypeId', plantationTypeId)
                            }

                            if (code) {
                                qb.where('plantation_phases.code', 'iLIKE', `%${code}%`)
                            }

                        })
                        .whereIn('plantation_phases.plantationId', plantations)
                        .first(),
                    knexReader("plantation_phases")
                        .leftJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .leftJoin(
                            "companies",
                            "plantation_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "plantation_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .where({
                            "plantations.isActive": true,
                            "plantation_phases.orgId": orgId
                        })
                        .where(qb => {
                            if (companyId) {
                                qb.where('plantation_phases.companyId', companyId)
                            }

                            if (plantationId) {
                                qb.where('plantation_phases.plantationId', plantationId)
                            }
                            if (plantationTypeId) {
                                qb.where('plantation_phases.plantationTypeId', plantationTypeId)
                            }

                            if (code) {
                                qb.where('plantation_phases.code', 'iLIKE', `%${code}%`)
                            }

                        })
                        .whereIn('plantation_phases.plantationId', plantations)
                        .select([
                            "plantation_phases.id as id",
                            "plantation_phases.code as code",
                            "plantations.name as Plantation Name",
                            "companies.companyName as Company Name",
                            "plantation_phases.isActive as Status",
                            "plantation_phases.description as Description",
                            "users.name as Created By",
                            "plantation_phases.createdAt as Date Created",
                            "plantation_types.name as plantationTypeName",
                            "companies.companyId",
                            "plantations.code as plantationCode",
                            "plantation_types.code as plantationTypeCode",
                        ])
                        .orderBy(sortPayload.sortBy, sortPayload.orderBy)
                        .offset(offset)
                        .limit(per_page)
                ]);

                let count = total.count;
                pagination.total = count;
                pagination.per_page = per_page;
                pagination.offset = offset;
                pagination.to = offset + rows.length;
                pagination.last_page = Math.ceil(count / per_page);
                pagination.current_page = page;
                pagination.from = offset;
                pagination.data = rows;

            } else {

                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                let [total, rows] = await Promise.all([
                    knexReader
                        .count("* as count")
                        .from("plantation_phases")
                        .leftJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .leftJoin(
                            "companies",
                            "plantation_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "plantation_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .where({
                            "plantation_phases.orgId": orgId,
                            "plantations.isActive": true
                        })
                        .whereIn('plantation_phases.plantationId', plantations)
                        .first(),

                    knexReader("plantation_phases")
                        .leftJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .leftJoin(
                            "companies",
                            "plantation_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "plantation_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .where({
                            "plantations.isActive": true,
                            "plantation_phases.orgId": orgId
                        })
                        .whereIn('plantation_phases.plantationId', plantations)
                        .select([
                            "plantation_phases.id as id",
                            "plantation_phases.code as code",
                            "plantations.name as Plantation Name",
                            "companies.companyName as Company Name",
                            "plantation_phases.isActive as Status",
                            "plantation_phases.description as Description",
                            "users.name as Created By",
                            "plantation_phases.createdAt as Date Created",
                            "plantation_types.name as plantationTypeName",
                            "companies.companyId",
                            "plantations.code as plantationCode",
                            "plantation_types.code as plantationTypeCode",
                        ])
                        .orderBy(sortPayload.sortBy, sortPayload.orderBy)
                        .offset(offset)
                        .limit(per_page)
                ]);

                let count = total.count;
                pagination.total = count;
                pagination.per_page = per_page;
                pagination.offset = offset;
                pagination.to = offset + rows.length;
                pagination.last_page = Math.ceil(count / per_page);
                pagination.current_page = page;
                pagination.from = offset;
                pagination.data = rows;

            }

            return res.status(200).json({
                data: {
                    plantationPhases: pagination
                },
                message: "Plantation Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseList] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
        // Export Plantation Phase Data
    },

    exportPlantationPhase: async (req, res) => {
        try {
            let orgId = req.orgId;
            let companyId = req.query.companyId;
            let reqData = req.query;
            let rows = null;

            if (!companyId) {
                [rows] = await Promise.all([
                    knexReader("plantation_phases")
                        .leftJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .leftJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .leftJoin(
                            "companies",
                            "plantation_phases.companyId",
                            "companies.id"
                        )

                        .where({ "plantations.isActive": true })
                        .where({ "plantation_phases.orgId": orgId })
                        .select([
                            "companies.companyId as COMPANY",
                            "companies.companyName as COMPANY_NAME",
                            "plantations.code as PLANTATION_CODE",
                            "plantations.name as PLANTATION_NAME",
                            "plantation_types.code as PLANTATION_TYPE_CODE",
                            "plantation_phases.code as PLANTATION_PHASE_CODE",
                            "plantation_phases.description as PLANTATION_PHASE_NAME",
                            "plantation_phases.addressEng as DESCRIPTION",
                            "plantation_phases.addressThai as DESCRIPTION_ALTERNATE_LANGUAGE"
                        ])
                ]);
            } else {
                [rows] = await Promise.all([
                    knexReader("plantation_phases")
                        .leftJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .leftJoin(
                            "companies",
                            "plantation_phases.companyId",
                            "companies.id"
                        )
                        .where({ "plantations.isActive": true })
                        .where({
                            "plantation_phases.companyId": companyId,
                            "plantation_phases.orgId": orgId
                        })
                        .select([
                            "companies.companyId as COMPANY",
                            "companies.companyName as COMPANY_NAME",
                            "plantations.code as PLANTATION_CODE",
                            "plantations.name as PLANTATION_NAME",
                            "plantation_phases.plantationTypeId as PLANTATION_TYPE_CODE",
                            "plantation_phases.code as PLANTATION_PHASE_CODE",
                            "plantation_phases.description as DESCRIPTION"
                        ])
                ]);
            }

            let tempraryDirectory = null;
            let bucketName = null;
            if (process.env.IS_OFFLINE) {
                bucketName = process.env.S3_BUCKET_NAME;
                tempraryDirectory = "tmp/";
            } else {
                tempraryDirectory = "/tmp/";
                bucketName = process.env.S3_BUCKET_NAME;
            }

            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
            var ws;

            if (rows && rows.length) {
                ws = XLSX.utils.json_to_sheet(rows);
            } else {
                ws = XLSX.utils.json_to_sheet([{
                    COMPANY: "",
                    "COMPANY_NAME": "",
                    PLANTATION_CODE: "",
                    "PLANTATION_NAME": "",
                    PLANTATION_TYPE_CODE: "",
                    PLANTATION_PHASE_CODE: "",
                    DESCRIPTION: ""
                }]);
            }

            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
            let filename = "PlantationPhaseData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
            let filepath = tempraryDirectory + filename;
            let check = XLSX.writeFile(wb, filepath);
            const AWS = require("aws-sdk");
            fs.readFile(filepath, function (err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/PlantationPhase/" + filename,
                    Body: file_buffer,
                    ACL: "public-read"
                };
                s3.putObject(params, function (err, data) {
                    if (err) {
                        console.log("Error at uploadCSVFileOnS3Bucket function", err);
                        //next(err);
                        res.status(500).json({
                            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
                        });
                    } else {
                        console.log("File uploaded Successfully");

                        //next(null, filePath);
                        fs.unlink(filepath, err => {
                            console.log("File Deleting Error " + err);
                        });
                        let url = process.env.S3_BUCKET_URL + "/Export/PlantationPhase/" +
                            filename;
                        // let url =
                        //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/PlantationPhase/" +
                        //   filename;

                        return res.status(200).json({
                            data: {
                                plantationPhases: rows
                            },
                            message: "Plantation Phases Data Export Successfully!",
                            url: url
                        });
                    }
                });
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][exportPlantationPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseAllList: async (req, res) => {
        try {
            let plantationId = req.query.plantationId;
            let orgId = req.orgId;

            let plantationPhaseData = {};
            //console.log(orgId);

            let [rows] = await Promise.all([
                knexReader("plantation_phases")
                    .innerJoin(
                        "plantations",
                        "plantation_phases.plantationId",
                        "plantations.id"
                    )
/*                     .leftJoin(
                        "plantation_types",
                        "plantation_phases.plantationTypeId",
                        "plantation_types.id"
                    )
 */                    
                    .where({
                        "plantation_phases.isActive": true,
                        "plantation_phases.plantationId": plantationId,
                        "plantation_phases.orgId": orgId
                    })
                    .select([
                        "plantation_phases.id as id",
                        "plantation_phases.code",
                        "plantation_phases.description",
/*                         "plantation_types.name as plantationTypeName",
                        "plantation_types.code as plantationTypeCode",
                        "plantation_types.descriptionEng as plantationTypeDescription"
 */                        
                    ])
            ]);

            plantationPhaseData.data = rows;

            return res.status(200).json({
                data: {
                    plantationPhases: plantationPhaseData
                },
                message: "Plantation Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseAllList] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhase: async (req, res) => {
        try {

            let orgId = req.orgId
            let plantationPhases = await knexReader("plantation_phases")
                .select("*")
                .where({ orgId: orgId, isActive: true })
                .orderBy('plantation_phases.description', 'asc')

            return res
                .status(200)
                .json({ data: { plantationPhases }, message: "Plantation Phases list" });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseListByPlantationId: async (req, res) => {
        try {
            const { plantationId } = req.body;
            let orgId = req.orgId;


            let plantationPhases;
            if (plantationId) {
                // console.log("plantation id for plantation phase: ", plantationId)
                plantationPhases = await knexReader("plantation_phases")
                    .select("*")
                    .where({ plantationId: plantationId, orgId: orgId, isActive: true })
                    .orderBy('plantation_phases.description', 'asc');


            } else {
                plantationPhases = await knexReader("plantation_phases")
                    .select("*")
                    .where({ orgId: orgId, isActive: true })
                    .orderBy('plantation_phases.description', 'asc');
            }
            return res
                .status(200)
                .json({ data: { plantationPhases }, message: "Plantation Phases list" });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseListByPlantationId] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseListByMultipleProjectId: async (req, res) => {
        try {
            let plantationId = req.body;
            let orgId = req.orgId;
            console.log("plantationId for plantation phases ", plantationId)


            let plantationPhases = await knexReader("plantation_phases")
                .where({ "plantation_phases.orgId": orgId, "plantation_phases.isActive": true })
                .whereIn("plantation_phases.plantationId", plantationId)
                .select("*")
                .orderBy('plantation_phases.description', 'asc');

            return res
                .status(200)
                .json({
                    data: {
                        plantationPhases
                    },
                    message: "Plantation Phases list"
                });

        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseListByMultipleProjectId] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },

    importPlantationData: async (req, res) => {
        try {

            let result = null;
            let data = req.body;

            let errors = []
            let header = Object.values(data[0]);
            header.unshift('Error');
            errors.push(header)

            if (

                data[0].A == "Ã¯Â»Â¿COMPANY" ||
                (data[0].A == "COMPANY" &&
                    data[0].B == "COMPANY_NAME" &&
                    data[0].C == "PLANTATION_CODE" &&
                    data[0].D == "PLANTATION_NAME" &&
                    data[0].E == "PLANTATION_TYPE_CODE" &&
                    data[0].F == "PLANTATION_PHASE_CODE" &&
                    data[0].G == "DESCRIPTION")

            ) {
                if (data.length > 0) {
                    let i = 0;
                    console.log("Data[0]", data[0]);
                    let success = 0;
                    let totalData = data.length - 1;
                    let fail = 0;

                    for (let plantationPhaseData of data) {

                        i++;

                        if (i > 1) {



                            if (!plantationPhaseData.A) {
                                let values = _.values(plantationPhaseData)
                                values.unshift('Company Id can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!plantationPhaseData.C) {
                                let values = _.values(plantationPhaseData)
                                values.unshift('Plantation Code can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!plantationPhaseData.E) {
                                let values = _.values(plantationPhaseData)
                                values.unshift('Plantation type Code can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }


                            if (!plantationPhaseData.F) {
                                let values = _.values(plantationPhaseData)
                                values.unshift('Plantation phase Code can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }


                            // Find Company primary key
                            let companyId = null;
                            let plantationId = null;
                            let plantationTypeId = null;

                            let companyIdResult = await knexReader("companies")
                                .select("id")
                                .where({ companyId: plantationPhaseData.A.toUpperCase(), orgId: req.orgId });

                            if (companyIdResult && companyIdResult.length) {
                                companyId = companyIdResult[0].id;

                                let plantationIdResult = await knexReader("plantations")
                                    .select("id")
                                    .where({ code: plantationPhaseData.C.toUpperCase(), companyId: companyId, orgId: req.orgId });

                                if (plantationIdResult && plantationIdResult.length) {
                                    plantationId = plantationIdResult[0].id;
                                }

                            }


                            let plantationTypeIdResult = await knexReader("plantation_types")
                                .select("id")
                                .where({ code: plantationPhaseData.E.toUpperCase(), orgId: req.orgId });


                            if (plantationTypeIdResult && plantationTypeIdResult.length) {
                                plantationTypeId = plantationTypeIdResult[0].id;
                            }


                            if (!companyId) {
                                console.log("breaking due to: null companyId");
                                fail++;
                                let values = _.values(plantationPhaseData)
                                values.unshift('Company ID does not exist')

                                //errors.push(header);
                                errors.push(values);
                                continue;
                            }
                            if (!plantationId) {
                                fail++;
                                let values = _.values(plantationPhaseData)
                                values.unshift('Plantation ID does not exist')

                                //errors.push(header);
                                errors.push(values);
                                console.log("breaking due to: null plantationId");
                                continue;
                            }
                            if (!plantationTypeId) {
                                fail++;
                                let values = _.values(plantationPhaseData)
                                values.unshift('Plantation Type code does not exist')

                                //errors.push(header);
                                errors.push(values);
                                console.log("breaking due to: null plantationTypeId");
                                continue;
                            }

                            console.log(
                                "^&&&&&&&&&&&&&&&&&&&&&&&&&&&& IDS &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&^",
                                companyId,
                                plantationId,
                                plantationTypeId
                            );

                            const checkExistance = await knex("plantation_phases").where({
                                orgId: req.orgId,
                                companyId: companyId,
                                plantationId: plantationId,
                                plantationTypeId: plantationTypeId,
                                code: plantationPhaseData.F.toUpperCase()
                            });
                            if (checkExistance.length) {
                                fail++;
                                let values = _.values(plantationPhaseData)
                                values.unshift('Plantation Phase Code already exist')
                                errors.push(values);
                                continue;
                            }

                            //if (i > 1) {
                            let currentTime = new Date().getTime();

                            success++;
                            let insertData = {
                                orgId: req.orgId,
                                companyId: companyId,
                                plantationId: plantationId,
                                code: plantationPhaseData.F.toUpperCase(),
                                plantationTypeId: plantationTypeId,
                                description: plantationPhaseData.G,
                                createdBy: req.me.id,
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                updatedBy: req.me.id
                            };

                            resultData = await knex
                                .insert(insertData)
                                .returning(["*"])
                                .into("plantation_phases");

                        }
                    }

                    let message = null;
                    // fail = fail - 1;
                    if (totalData == success) {
                        message =
                            "System has processed ( " +
                            totalData +
                            " ) entries and added them successfully!";
                    } else {
                        message =
                            "System have processed ( " +
                            totalData +
                            " ) entries out of which only ( " +
                            success +
                            " ) are added and others are failed ( " +
                            fail +
                            " ) due to validation!";
                    }
                    return res.status(200).json({
                        message: message,
                        errors
                    });
                }
            } else {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
                    ]
                });
            }

        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][importPlantationData] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseAllListHavingPropertyUnits: async (req, res) => {
        try {
            let plantationId = req.query.plantationId;
            let orgId = req.orgId;
            console.log("plantationId for plantation phase", plantationId)

            let plantationPhaseData = {};
            //console.log(orgId);

            let companyIds = []
            let companyArr1 = []
            let rows = []

            if (req.query.areaName === 'common') {
                companyIds = await knexReader('plantation_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                companyArr1 = companyIds.map(v => v.companyId)
                rows = await knexReader("plantation_phases")
                    .innerJoin(
                        "plantations",
                        "plantation_phases.plantationId",
                        "plantations.id"
                    )
                    .innerJoin(
                        "plantation_types",
                        "plantation_phases.plantationTypeId",
                        "plantation_types.id"
                    )
                    .innerJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                    .where({
                        "plantation_phases.isActive": true,
                        "plantation_phases.plantationId": plantationId,
                        "plantation_phases.orgId": orgId,
                        //'plant_containers.type': 2
                    })
                    .select([
                        "plantation_phases.id as id",
                        "plantation_phases.code",
                        "plantation_types.name as plantationTypeName",
                        "plantation_phases.description",
                        "plantation_types.code as plantationTypeCode",
                    ])
                    .whereIn('plantations.companyId', companyArr1)
                    .groupBy(["plantation_phases.id",
                        "plantation_phases.code",
                        "plantation_types.name as plantationTypeName",
                        "plantation_phases.description",
                        "plantation_types.code as plantationTypeCode",
                    ])


            } else
                if (req.query.areaName === 'all' && plantationId === '') {
                    companyIds = await knexReader('plantation_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                    companyArr1 = companyIds.map(v => v.companyId)
                    rows = await knexReader("plantation_phases")
                        .innerJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .innerJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .innerJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                        .where({
                            "plantation_phases.isActive": true,
                            "plantation_phases.orgId": orgId,
                        })
                        .select([
                            "plantation_phases.id as id",
                            "plantation_phases.code",
                            "plantation_types.name as plantationTypeName",
                            "plantation_phases.description",
                            "plantation_types.code as plantationTypeCode",
                        ])
                        .whereIn('plantations.companyId', companyArr1)
                        .groupBy(["plantation_phases.id",
                            "plantation_phases.code",
                            "plantation_types.name as plantationTypeName",
                            "plantation_phases.description",
                            "plantation_types.code as plantationTypeCode",
                        ])
                } else
                    if (req.query.areaName === 'all') {
                        companyIds = await knexReader('plantation_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyIds.map(v => v.companyId)
                        rows = await knexReader("plantation_phases")
                            .innerJoin(
                                "plantations",
                                "plantation_phases.plantationId",
                                "plantations.id"
                            )
                            .innerJoin(
                                "plantation_types",
                                "plantation_phases.plantationTypeId",
                                "plantation_types.id"
                            )
                            .innerJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                            .where({
                                "plantation_phases.isActive": true,
                                //"plantation_phases.plantationId": plantationId,
                                "plantation_phases.orgId": orgId,
                            })
                            .where(qb => {
                                if (plantationId == 'undefined') {

                                } else {

                                    qb.where('plantation_phases.plantationId', plantationId)

                                }
                            })
                            .select([
                                "plantation_phases.id as id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])
                            .whereIn('plantations.companyId', companyArr1)
                            .groupBy(["plantation_phases.id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])
                    } else {
                        companyIds = await knexReader('plantations').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyIds.map(v => v.companyId)
                        rows = await knexReader("plantation_phases")
                            .innerJoin(
                                "plantations",
                                "plantation_phases.plantationId",
                                "plantations.id"
                            )
                            .innerJoin(
                                "plantation_types",
                                "plantation_phases.plantationTypeId",
                                "plantation_types.id"
                            )
                            .innerJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                            .where({
                                "plantation_phases.isActive": true,
                                "plantation_phases.plantationId": plantationId,
                                "plantation_phases.orgId": orgId,
                                //'plant_containers.type': 1
                            })
                            .select([
                                "plantation_phases.id as id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])
                            .whereIn('plantations.companyId', companyArr1)
                            .groupBy(["plantation_phases.id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])


                        console.log('Plantation Phase LIST:********************************************************* ', rows)
                    }


            plantationPhaseData.data = rows;

            return res.status(200).json({
                data: {
                    plantationPhases: plantationPhaseData
                },
                message: "Plantation Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseAllListHavingPropertyUnits] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseAllListHavingPropertyUnitsAndWithoutUnits: async (req, res) => {
        try {
            let plantationId = req.query.plantationId;
            let orgId = req.orgId;
            console.log("plantationId for plantation phase", plantationId)

            let plantationPhaseData = {};
            //console.log(orgId);

            let companyIds = []
            let companyArr1 = []
            let rows = []

            if (req.query.areaName === 'common') {
                companyIds = await knexReader('plantation_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                companyArr1 = companyIds.map(v => v.companyId)
                rows = await knexReader("plantation_phases")
                    .innerJoin(
                        "plantations",
                        "plantation_phases.plantationId",
                        "plantations.id"
                    )
                    .innerJoin(
                        "plantation_types",
                        "plantation_phases.plantationTypeId",
                        "plantation_types.id"
                    )
                    .leftJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                    .where({
                        "plantation_phases.isActive": true,
                        "plantation_phases.plantationId": plantationId,
                        "plantation_phases.orgId": orgId,
                        // 'plant_containers.type': 2
                    })
                    .select([
                        "plantation_phases.id as id",
                        "plantation_phases.code",
                        "plantation_types.name as plantationTypeName",
                        "plantation_phases.description",
                        "plantation_types.code as plantationTypeCode",
                    ])
                    .whereIn('plantations.companyId', companyArr1)
                    .groupBy(["plantation_phases.id",
                        "plantation_phases.code",
                        "plantation_types.name as plantationTypeName",
                        "plantation_phases.description",
                        "plantation_types.code as plantationTypeCode",
                    ])


            } else
                if (req.query.areaName === 'all' && plantationId === '') {
                    companyIds = await knexReader('plantation_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                    companyArr1 = companyIds.map(v => v.companyId)
                    rows = await knexReader("plantation_phases")
                        .innerJoin(
                            "plantations",
                            "plantation_phases.plantationId",
                            "plantations.id"
                        )
                        .innerJoin(
                            "plantation_types",
                            "plantation_phases.plantationTypeId",
                            "plantation_types.id"
                        )
                        .leftJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                        .where({
                            "plantation_phases.isActive": true,
                            "plantation_phases.orgId": orgId,
                        })
                        .select([
                            "plantation_phases.id as id",
                            "plantation_phases.code",
                            "plantation_types.name as plantationTypeName",
                            "plantation_phases.description",
                            "plantation_types.code as plantationTypeCode",
                        ])
                        .whereIn('plantations.companyId', companyArr1)
                        .groupBy(["plantation_phases.id",
                            "plantation_phases.code",
                            "plantation_types.name as plantationTypeName",
                            "plantation_phases.description",
                            "plantation_types.code as plantationTypeCode",
                        ])
                } else
                    if (req.query.areaName === 'all') {
                        companyIds = await knexReader('plantation_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyIds.map(v => v.companyId)
                        rows = await knexReader("plantation_phases")
                            .innerJoin(
                                "plantations",
                                "plantation_phases.plantationId",
                                "plantations.id"
                            )
                            .innerJoin(
                                "plantation_types",
                                "plantation_phases.plantationTypeId",
                                "plantation_types.id"
                            )
                            .leftJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                            .where({
                                "plantation_phases.isActive": true,
                                //"plantation_phases.plantationId": plantationId,
                                "plantation_phases.orgId": orgId,
                            })
                            .where(qb => {
                                if (plantationId == 'undefined') {

                                } else {

                                    qb.where('plantation_phases.plantationId', plantationId)

                                }
                            })
                            .select([
                                "plantation_phases.id as id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])
                            .whereIn('plantations.companyId', companyArr1)
                            .groupBy(["plantation_phases.id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])
                    } else {
                        companyIds = await knexReader('plantations').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyIds.map(v => v.companyId)
                        rows = await knexReader("plantation_phases")
                            .innerJoin(
                                "plantations",
                                "plantation_phases.plantationId",
                                "plantations.id"
                            )
                            .innerJoin(
                                "plantation_types",
                                "plantation_phases.plantationTypeId",
                                "plantation_types.id"
                            )
                            .leftJoin('plant_containers', 'plantation_phases.id', 'plant_containers.plantationPhaseId')
                            .where({
                                "plantation_phases.isActive": true,
                                "plantation_phases.plantationId": plantationId,
                                "plantation_phases.orgId": orgId,
                                // 'plant_containers.type': 1
                            })
                            .select([
                                "plantation_phases.id as id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])
                            .whereIn('plantations.companyId', companyArr1)
                            .groupBy(["plantation_phases.id",
                                "plantation_phases.code",
                                "plantation_types.name as plantationTypeName",
                                "plantation_phases.description",
                                "plantation_types.code as plantationTypeCode",
                            ])


                        console.log('Plantation Phase LIST:******************************************************** ', rows)
                    }


            plantationPhaseData.data = rows;

            return res.status(200).json({
                data: {
                    plantationPhases: plantationPhaseData
                },
                message: "Plantation Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseAllListHavingPropertyUnitsAndWithoutUnits] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getPlantationPhaseById: async (req, res) => {
        try {
            let id = req.body.id
            let orgId = req.orgId
            let sqlResult = await knexReader("plantation_phases")
                .select([
                    "plantation_phases.id",
                    "plantation_phases.description",
                    "plantation_phases.code"
                ])
                .where("plantation_phases.id", id)
                .where("plantation_phases.orgId", orgId)

            return res.status(200).json({
                data: {
                    plantationPhases: sqlResult
                },
                message: "Plantation Phases List!"
            });

        } catch (err) {
            console.log(
                "[controllers][administrationFeatures][getPlantationPhaseById] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getUnitListByPlantationId: async (req, res) => {

        try {

            let rows;
            let plantationPhaseId = req.query.plantationPhaseId;
            let orgId = req.orgId;

            if (req.query.plantationPhaseId == 'undefined' || req.query.plantationPhaseId == "all") {

                rows = await knexReader("plant_containers")
                    .where({
                        "plant_containers.isActive": true,
                        //"plant_containers.plantationPhaseId": plantationId,
                        "plant_containers.orgId": orgId,
                        "type": 1
                    })
                    .select('*')

            } else {

                rows = await knexReader("plant_containers")
                    .where({
                        "plant_containers.isActive": true,
                        "plant_containers.plantationPhaseId": plantationPhaseId,
                        "plant_containers.orgId": orgId,
                        "type": 1
                    })
                    .select('*')

                console.log('Plant Containers LIST:*********************************************************** ', rows)
            }

            return res.status(200).json({
                data: rows,
                message: "Plant Containers List!"
            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },


};

module.exports = plantationPhaseController;

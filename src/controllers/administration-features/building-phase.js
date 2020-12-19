const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require("fs");
const path = require("path");
const request = require("request");
const { whereIn } = require("../../db/knex");
const { join } = require("path");

const buildingPhaseController = {
    addBuildingPhase: async (req, res) => {
        try {
            let buildingPhase = null;
            let userId = req.me.id;
            let orgId = req.orgId;

            await knex.transaction(async trx => {
                const payload = req.body;

                const schema = Joi.object().keys({
                    id: Joi.string().required(),
                    companyId: Joi.string().required(),
                    projectId: Joi.string().required(),
                    propertyTypeId: Joi.string().required(),
                    buildingPhaseCode: Joi.string().required(),
                    description: Joi.string().allow("").optional(),
                    buildingAddressEng: Joi.string().allow("").optional(),
                    buildingAddressThai: Joi.string().allow("").optional(),
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][addbuildingPhase]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let checkBuildInfoUpdate = await knex("building_info")
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
                /*CHECK DUPLICATE VALUES OPEN */
                let existValue = await knex('buildings_and_phases')
                    .where({ buildingPhaseCode: payload.buildingPhaseCode.toUpperCase(), projectId: payload.projectId, orgId: orgId });
                if (existValue && existValue.length) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: "Building Phase code already exist!!" }
                        ]
                    });
                }
                /*CHECK DUPLICATE VALUES CLOSE */


                let currentTime = new Date().getTime();
                let insertData = {
                    ...payload,
                    buildingPhaseCode: payload.buildingPhaseCode.toUpperCase(),
                    orgId: orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime
                };

                let insertResult = await knex
                    .update(insertData)
                    .where({ id: payload.id })
                    .returning(["*"])
                    .transacting(trx)
                    .into("buildings_and_phases");
                buildingPhase = insertResult[0];
                trx.commit;
            });

            return res.status(200).json({
                data: {
                    buildingPhase: buildingPhase
                },
                message: "Building Phase added successfully."
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][addbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    addBuildingInfo: async (req, res) => {
        try {
            let addedDescription = []

            await knex.transaction(async trx => {
                // const payload = req.body

                const payload = _.omit(req.body, ['description'])

                const schema = Joi.object().keys({
                    id: Joi.string().required(),
                    title: Joi.string().required(),
                    // description:Joi.string().allow('').optional()
                })

                const result = Joi.validate(payload, schema);

                console.log(
                    "[controllers][administrationFeatures][addbuildingPhase]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

                let currentTime = new Date().getTime();

                let descriptionPayload = req.body.description

                let delBuildingInfo = await knex("building_info")
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
                            createdBy: req.me.id
                        })
                        .returning(["*"])
                    addedDescription.push(addedResult[0])
                }
                trx.commit;
            })
            return res.status(200).json({
                data: {
                    buildingInfo: addedDescription
                },
                message: "Building Info added successfully."
            });

        } catch (err) {

            console.log(
                "[controllers][buildingInfo][building] :  Error",
                err
            );

        }
    },
    getBuildingInfoByBuildingId: async (req, res) => {
        try {

            console.log("get bulding info", req.body)
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

            let [buildingInfo, images] = await Promise.all([
                knex.from("building_info")
                    .select('*')
                    .where({ "building_info.buildingId": payload.id, "building_info.orgId": req.orgId }),
                knex
                    .from('images')
                    .where({ entityId: payload.id, entityType: "building_info" })
            ])
            // knex("building_info")
            // .select('*')
            // .where({buildingId:payload.id,orgId:req.orgId})

            return res.status(200).json({
                data: {
                    buildingInfo,
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
            await knex.transaction(async trx => {
                // const payload = req.body
                const payload = _.omit(req.body, ['contactInfo'])

                const schema = Joi.object().keys({
                    id: Joi.string().required(),
                    // title:Joi.string().required(),
                    // description:Joi.string().allow('').optional()
                })

                const result = Joi.validate(payload, schema);

                console.log(
                    "[controllers][administrationFeatures][addbuildingPhase]: JOi Result",
                    result
                );

                if (result && result.hasOwnProperty("error") && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: result.error.message }
                        ]
                    });
                }

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
                            createdBy: req.me.id
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
                "[controllers][buildingInfo][building] :  Error",
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

            // let contactInfo = await knex("contact_info")
            // .select('*')
            // .where({buildingId:payload.id,orgId:req.orgId})

            let [contactInfo, images] = await Promise.all([
                knex.from("contact_info")
                    .select('*')
                    .where({ "contact_info.buildingId": payload.id, "contact_info.orgId": req.orgId }),
                knex
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
                "[controllers][buildingInfo][building] :  Error",
                err
            );
        }
    },
    updateBuildingPhase: async (req, res) => {
        try {
            let userId = req.me.id;
            let orgId = req.orgId;

            let buildingPhase = null;
            await knex.transaction(async trx => {
                const payload = req.body;

                const schema = Joi.object().keys({
                    id: Joi.string().required(),
                    companyId: Joi.string().required(),
                    projectId: Joi.string().required(),
                    propertyTypeId: Joi.string().required(),
                    buildingPhaseCode: Joi.string().required(),
                    description: Joi.string().allow("").allow(null).optional(),
                    buildingAddressEng: Joi.string().allow("").allow(null).optional(),
                    buildingAddressThai: Joi.string().allow("").allow(null).optional(),
                });

                const result = Joi.validate(payload, schema);
                console.log(
                    "[controllers][administrationFeatures][updatebuildingPhase]: JOi Result",
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
                let existValue = await knex('buildings_and_phases')
                    .where({ buildingPhaseCode: payload.buildingPhaseCode.toUpperCase(), projectId: payload.projectId, orgId: orgId });

                if (existValue && existValue.length) {

                    if (existValue[0].id === payload.id) {

                    } else {
                        return res.status(400).json({
                            errors: [
                                { code: "VALIDATION_ERROR", message: "Building Phase code already exist!!" }
                            ]
                        });
                    }
                }
                /*CHECK DUPLICATE VALUES CLOSE */

                let currentTime = new Date().getTime();
                let insertData = { ...payload, buildingPhaseCode: payload.buildingPhaseCode.toUpperCase(), updatedAt: currentTime };
                let insertResult = await knex
                    .update(insertData)
                    .where({ id: payload.id, orgId: orgId, createdBy: userId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("buildings_and_phases");
                buildingPhase = insertResult[0];

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    buildingPhase: buildingPhase
                },
                message: "Building Phase details updated successfully."
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][updatebuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    generateBuildingId: async (req, res) => {
        try {
            const generatedId = await knex("buildings_and_phases")
                .insert({ createdAt: new Date().getTime() })
                .returning(["*"]);
            return res.status(200).json({
                data: {
                    id: generatedId[0].id,
                },
            });
        } catch (err) {
            console.log("[controllers][building_and_phases][id] :  Error", err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
            });
        }
    },
    viewBuildingPhase: async (req, res) => {
        try {
            let buildingPhase = null;
            await knex.transaction(async trx => {
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

                let buildingPhaseResult = await knex("buildings_and_phases")
                    .leftJoin(
                        "companies",
                        "buildings_and_phases.companyId",
                        "companies.id"
                    )
                    .leftJoin(
                        "projects",
                        "buildings_and_phases.projectId",
                        "projects.id"
                    )
                    .leftJoin(
                        "property_types",
                        "buildings_and_phases.propertyTypeId",
                        "property_types.id"
                    )
                    .select(
                        "buildings_and_phases.*",
                        "companies.companyName as companyName",
                        "companies.companyId as compId",
                        "companies.id as companyId",
                        "projects.projectName",
                        "property_types.propertyTypeCode",
                        "projects.project as projectCode",
                        "property_types.propertyType",
                    )
                    .where({
                        "buildings_and_phases.id": payload.id,
                        "buildings_and_phases.orgId": orgId
                    });

                buildingPhase = _.omit(buildingPhaseResult[0], [
                    "buildings_and_phases.createdAt",
                    "buildings_and_phases.updatedAt"
                ]);

                trx.commit;
            });

            return res.status(200).json({
                data: {
                    buildingPhase: buildingPhase
                },
                message: "Building Phase details"
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteBuildingPhase: async (req, res) => {
        try {
            let buildingPhase = null;
            let message;
            await knex.transaction(async trx => {
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


                let buildingPhaseResult;
                let checkStatus = await knex.from('buildings_and_phases').where({ id: payload.id }).returning(['*'])
                if (checkStatus && checkStatus.length) {

                    if (checkStatus[0].isActive == true) {

                        buildingPhaseResult = await knex
                            .update({ isActive: false })
                            .where({ id: payload.id })
                            .returning(["*"])
                            .transacting(trx)
                            .into("buildings_and_phases");
                        buildingPhase = buildingPhaseResult[0];
                        message = "Building Phase deactivate successfully!"

                    } else {

                        buildingPhaseResult = await knex
                            .update({ isActive: true })
                            .where({ id: payload.id })
                            .returning(["*"])
                            .transacting(trx)
                            .into("buildings_and_phases");
                        buildingPhase = buildingPhaseResult[0];
                        message = "Building Phase activate successfully!"
                    }
                }
                trx.commit;
            });

            return res.status(200).json({
                data: {
                    buildingPhase: buildingPhase
                },
                message: message
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhaseList: async (req, res) => {
        try {

            let resourceProject = req.userProjectResources[0].projects;

            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "buildings_and_phases.buildingPhaseCode";
                sortPayload.orderBy = "asc"
            }
            let orgId = req.orgId;
            let {
                companyId,
                projectId,
                buildingPhaseCode,
                propertyType
            } = req.body;
            let reqData = req.query;
            let pagination = {};

            if (companyId || projectId || buildingPhaseCode || propertyType) {


                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                let [total, rows] = await Promise.all([
                    knex
                        .count("* as count")
                        .from("buildings_and_phases")
                        .leftJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .leftJoin(
                            "companies",
                            "buildings_and_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "buildings_and_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .where({
                            "projects.isActive": true,
                            "buildings_and_phases.orgId": orgId
                        })
                        .where(qb => {
                            if (companyId) {
                                qb.where('buildings_and_phases.companyId', companyId)
                            }

                            if (projectId) {
                                qb.where('buildings_and_phases.projectId', projectId)
                            }
                            if (propertyType) {
                                qb.where('buildings_and_phases.propertyTypeId', propertyType)
                            }

                            if (buildingPhaseCode) {
                                qb.where('buildings_and_phases.buildingPhaseCode', 'iLIKE', `%${buildingPhaseCode}%`)
                            }

                        })
                        .whereIn('buildings_and_phases.projectId', resourceProject)
                        .first(),
                    knex("buildings_and_phases")
                        .leftJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .leftJoin(
                            "companies",
                            "buildings_and_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "buildings_and_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .where({
                            "projects.isActive": true,
                            "buildings_and_phases.orgId": orgId
                        })
                        .where(qb => {
                            if (companyId) {
                                qb.where('buildings_and_phases.companyId', companyId)
                            }

                            if (projectId) {
                                qb.where('buildings_and_phases.projectId', projectId)
                            }
                            if (propertyType) {
                                qb.where('buildings_and_phases.propertyTypeId', propertyType)
                            }

                            if (buildingPhaseCode) {
                                qb.where('buildings_and_phases.buildingPhaseCode', 'iLIKE', `%${buildingPhaseCode}%`)
                            }

                        })
                        .whereIn('buildings_and_phases.projectId', resourceProject)
                        .select([
                            "buildings_and_phases.id as id",
                            "buildings_and_phases.buildingPhaseCode as Building/Phase",
                            "projects.projectName as Project Name",
                            "companies.companyName as Company Name",
                            "buildings_and_phases.isActive as Status",
                            "buildings_and_phases.description as Description",
                            "users.name as Created By",
                            "buildings_and_phases.createdAt as Date Created",
                            "property_types.propertyType",
                            "companies.companyId",
                            "projects.project as projectCode",
                            "property_types.propertyTypeCode",
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
                    knex
                        .count("* as count")
                        .from("buildings_and_phases")
                        .leftJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .leftJoin(
                            "companies",
                            "buildings_and_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "buildings_and_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .where({
                            "buildings_and_phases.orgId": orgId,
                            "projects.isActive": true
                        })
                        .whereIn('buildings_and_phases.projectId', resourceProject)
                        .first(),

                    knex("buildings_and_phases")
                        .leftJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .leftJoin(
                            "companies",
                            "buildings_and_phases.companyId",
                            "companies.id"
                        )
                        .leftJoin(
                            "users",
                            "buildings_and_phases.createdBy",
                            "users.id"
                        )
                        .leftJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .where({
                            "projects.isActive": true,
                            "buildings_and_phases.orgId": orgId
                        })
                        .whereIn('buildings_and_phases.projectId', resourceProject)
                        .select([
                            "buildings_and_phases.id as id",
                            "buildings_and_phases.buildingPhaseCode as Building/Phase",
                            "projects.projectName as Project Name",
                            "companies.companyName as Company Name",
                            "buildings_and_phases.isActive as Status",
                            "buildings_and_phases.description as Description",
                            "users.name as Created By",
                            "buildings_and_phases.createdAt as Date Created",
                            "property_types.propertyType",
                            "companies.companyId",
                            "projects.project as projectCode",
                            "property_types.propertyTypeCode",
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
                    buildingPhases: pagination
                },
                message: "Building Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
        // Export Building Phase Data
    },
    exportBuildingPhase: async (req, res) => {
        try {
            let orgId = req.orgId;
            let companyId = req.query.companyId;
            let reqData = req.query;
            let rows = null;

            if (!companyId) {
                [rows] = await Promise.all([
                    knex("buildings_and_phases")
                        .leftJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .leftJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .leftJoin(
                            "companies",
                            "buildings_and_phases.companyId",
                            "companies.id"
                        )

                        .where({ "projects.isActive": true })
                        .where({ "buildings_and_phases.orgId": orgId })
                        .select([
                            "companies.companyId as COMPANY",
                            "companies.companyName as COMPANY_NAME",
                            "projects.project as PROJECT",
                            "projects.projectName as PROJECT_NAME",
                            "property_types.propertyTypeCode as PROPERTY_TYPE_CODE",
                            "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
                            "buildings_and_phases.description as DESCRIPTION"
                        ])
                ]);
            } else {
                [rows] = await Promise.all([
                    knex("buildings_and_phases")
                        .leftJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .leftJoin(
                            "companies",
                            "buildings_and_phases.companyId",
                            "companies.id"
                        )
                        .where({ "projects.isActive": true })
                        .where({
                            "buildings_and_phases.companyId": companyId,
                            "buildings_and_phases.orgId": orgId
                        })
                        .select([
                            "companies.companyId as COMPANY",
                            "companies.companyName as COMPANY_NAME",
                            "projects.project as PROJECT",
                            "projects.projectName as PROJECT_NAME",
                            "buildings_and_phases.propertyTypeId as PROPERTY_TYPE_CODE",
                            "buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
                            "buildings_and_phases.description as DESCRIPTION"
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
                    PROJECT: "",
                    "PROJECT_NAME": "",
                    PROPERTY_TYPE_CODE: "",
                    BUILDING_PHASE_CODE: "",
                    DESCRIPTION: ""
                }]);
            }

            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
            let filename = "BuildingPhaseData-" + Date.now() + ".csv";
            let filepath = tempraryDirectory + filename;
            let check = XLSX.writeFile(wb, filepath);
            const AWS = require("aws-sdk");
            fs.readFile(filepath, function (err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/BuildingPhase/" + filename,
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
                        let url = process.env.S3_BUCKET_URL + "/Export/BuildingPhase/" +
                            filename;
                        // let url =
                        //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/BuildingPhase/" +
                        //   filename;

                        return res.status(200).json({
                            data: {
                                buildingPhases: rows
                            },
                            message: "Building Phases Data Export Successfully!",
                            url: url
                        });
                    }
                });
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhaseAllList: async (req, res) => {
        try {
            let projectId = req.query.projectId;
            let orgId = req.orgId;

            let buildingData = {};
            //console.log(orgId);

            let [rows] = await Promise.all([
                knex("buildings_and_phases")
                    .innerJoin(
                        "projects",
                        "buildings_and_phases.projectId",
                        "projects.id"
                    )
                    .leftJoin(
                        "property_types",
                        "buildings_and_phases.propertyTypeId",
                        "property_types.id"
                    )
                    .where({
                        "buildings_and_phases.isActive": true,
                        "buildings_and_phases.projectId": projectId,
                        "buildings_and_phases.orgId": orgId
                    })
                    .select([
                        "buildings_and_phases.id as id",
                        "buildings_and_phases.buildingPhaseCode",
                        "property_types.propertyType",
                        "buildings_and_phases.description",
                        "property_types.propertyTypeCode",
                        "property_types.descriptionEng as propertyDescription"
                    ])
            ]);

            buildingData.data = rows;

            return res.status(200).json({
                data: {
                    buildingPhases: buildingData
                },
                message: "Building Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhase: async (req, res) => {
        try {

            let orgId = req.orgId
            let buildings = await knex("buildings_and_phases")
                .select("*")
                .where({ orgId: orgId, isActive: true })
                .orderBy('buildings_and_phases.description', 'asc')

            return res
                .status(200)
                .json({ data: { buildings }, message: "Buildings list" });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhaseListByProjectId: async (req, res) => {
        try {
            const { projectId } = req.body;
            let orgId = req.orgId;

            let buildings;
            if (projectId) {
                buildings = await knex("buildings_and_phases")
                    .select("*")
                    .where({ projectId, orgId: orgId, isActive: true })
                    .orderBy('buildings_and_phases.description', 'asc');


            } else {
                buildings = await knex("buildings_and_phases")
                    .select("*")
                    .where({ orgId: orgId, isActive: true })
                    .orderBy('buildings_and_phases.description', 'asc');
            }
            return res
                .status(200)
                .json({ data: { buildings }, message: "Buildings list" });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhaseListByMultipleProjectId: async (req, res) => {
        try {
            let projectId = req.body;
            let orgId = req.orgId;
            console.log("projectId for buildings", projectId)


            let buildings = await knex("buildings_and_phases")
                .where({ "buildings_and_phases.orgId": orgId, "buildings_and_phases.isActive": true })
                .whereIn("buildings_and_phases.projectId", projectId)
                .select("*")
                .orderBy('buildings_and_phases.description', 'asc');

            return res
                .status(200)
                .json({
                    data: {
                        buildings
                    },
                    message: "Buildings list"
                });

        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },
    importBuildingData: async (req, res) => {
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
                    data[0].C == "PROJECT" &&
                    data[0].D == "PROJECT_NAME" &&
                    data[0].E == "PROPERTY_TYPE_CODE" &&
                    data[0].F == "BUILDING_PHASE_CODE" &&
                    data[0].G == "DESCRIPTION")

            ) {
                if (data.length > 0) {
                    let i = 0;
                    console.log("Data[0]", data[0]);
                    let success = 0;
                    let totalData = data.length - 1;
                    let fail = 0;

                    for (let buildingData of data) {

                        i++;

                        if (i > 1) {



                            if (!buildingData.A) {
                                let values = _.values(buildingData)
                                values.unshift('Company Id can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!buildingData.C) {
                                let values = _.values(buildingData)
                                values.unshift('Project Code can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }

                            if (!buildingData.E) {
                                let values = _.values(buildingData)
                                values.unshift('Property type Code can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }


                            if (!buildingData.F) {
                                let values = _.values(buildingData)
                                values.unshift('Building phase Code can not empty!')
                                errors.push(values);
                                fail++;
                                continue;
                            }


                            // Find Company primary key
                            let companyId = null;
                            let projectId = null;
                            let propertyTypeId = null;

                            let companyIdResult = await knex("companies")
                                .select("id")
                                .where({ companyId: buildingData.A.toUpperCase(), orgId: req.orgId });

                            if (companyIdResult && companyIdResult.length) {
                                companyId = companyIdResult[0].id;

                                let projectIdResult = await knex("projects")
                                    .select("id")
                                    .where({ project: buildingData.C.toUpperCase(), companyId: companyId, orgId: req.orgId });

                                if (projectIdResult && projectIdResult.length) {
                                    projectId = projectIdResult[0].id;
                                }

                            }


                            let propertyTypeIdResult = await knex("property_types")
                                .select("id")
                                .where({ propertyTypeCode: buildingData.E.toUpperCase(), orgId: req.orgId });


                            if (propertyTypeIdResult && propertyTypeIdResult.length) {
                                propertyTypeId = propertyTypeIdResult[0].id;
                            }


                            if (!companyId) {
                                console.log("breaking due to: null companyId");
                                fail++;
                                let values = _.values(buildingData)
                                values.unshift('Company ID does not exist')

                                //errors.push(header);
                                errors.push(values);
                                continue;
                            }
                            if (!projectId) {
                                fail++;
                                let values = _.values(buildingData)
                                values.unshift('Project ID does not exist')

                                //errors.push(header);
                                errors.push(values);
                                console.log("breaking due to: null projectId");
                                continue;
                            }
                            if (!propertyTypeId) {
                                fail++;
                                let values = _.values(buildingData)
                                values.unshift('Property Type code does not exist')

                                //errors.push(header);
                                errors.push(values);
                                console.log("breaking due to: null propertyTypeId");
                                continue;
                            }

                            console.log(
                                "^&&&&&&&&&&&&&&&&&&&&&&&&&&&& IDS &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&^",
                                companyId,
                                projectId,
                                propertyTypeId
                            );

                            const checkExistance = await knex("buildings_and_phases").where({
                                orgId: req.orgId,
                                buildingPhaseCode: buildingData.F.toUpperCase(),
                                // companyId:companyId,
                                projectId: projectId
                            });
                            if (checkExistance.length) {
                                fail++;
                                let values = _.values(buildingData)
                                values.unshift('Building/Phase Code already exist')
                                errors.push(values);
                                continue;
                            }

                            //if (i > 1) {
                            let currentTime = new Date().getTime();

                            success++;
                            let insertData = {
                                orgId: req.orgId,
                                companyId: companyId,
                                projectId: projectId,
                                buildingPhaseCode: buildingData.F.toUpperCase(),
                                propertyTypeId: propertyTypeId,
                                description: buildingData.G,
                                createdBy: req.me.id,
                                createdAt: currentTime,
                                updatedAt: currentTime
                            };

                            resultData = await knex
                                .insert(insertData)
                                .returning(["*"])
                                .into("buildings_and_phases");

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
                "[controllers][propertysetup][importbuildingData] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhaseAllListHavingPropertyUnits: async (req, res) => {
        try {
            let projectId = req.query.projectId;
            let orgId = req.orgId;
            console.log("projectId for building", projectId)

            let buildingData = {};
            //console.log(orgId);

            let companyHavingProjects = []
            let companyArr1 = []
            let rows = []

            if (req.query.areaName === 'common') {
                companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                companyArr1 = companyHavingProjects.map(v => v.companyId)
                rows = await knex("buildings_and_phases")
                    .innerJoin(
                        "projects",
                        "buildings_and_phases.projectId",
                        "projects.id"
                    )
                    .innerJoin(
                        "property_types",
                        "buildings_and_phases.propertyTypeId",
                        "property_types.id"
                    )
                    .innerJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                    .where({
                        "buildings_and_phases.isActive": true,
                        "buildings_and_phases.projectId": projectId,
                        "buildings_and_phases.orgId": orgId,
                        'property_units.type': 2
                    })
                    .select([
                        "buildings_and_phases.id as id",
                        "buildings_and_phases.buildingPhaseCode",
                        "property_types.propertyType",
                        "buildings_and_phases.description",
                        "property_types.propertyTypeCode",
                    ])
                    .whereIn('projects.companyId', companyArr1)
                    .groupBy(["buildings_and_phases.id",
                        "buildings_and_phases.buildingPhaseCode",
                        "property_types.propertyType",
                        "buildings_and_phases.description",
                        "property_types.propertyTypeCode",
                    ])


            } else
                if (req.query.areaName === 'all' && projectId === '') {
                    companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                    companyArr1 = companyHavingProjects.map(v => v.companyId)
                    rows = await knex("buildings_and_phases")
                        .innerJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .innerJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .innerJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                        .where({
                            "buildings_and_phases.isActive": true,
                            "buildings_and_phases.orgId": orgId,
                        })
                        .select([
                            "buildings_and_phases.id as id",
                            "buildings_and_phases.buildingPhaseCode",
                            "property_types.propertyType",
                            "buildings_and_phases.description",
                            "property_types.propertyTypeCode",
                        ])
                        .whereIn('projects.companyId', companyArr1)
                        .groupBy(["buildings_and_phases.id",
                            "buildings_and_phases.buildingPhaseCode",
                            "property_types.propertyType",
                            "buildings_and_phases.description",
                            "property_types.propertyTypeCode",
                        ])
                } else
                    if (req.query.areaName === 'all') {
                        companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyHavingProjects.map(v => v.companyId)
                        rows = await knex("buildings_and_phases")
                            .innerJoin(
                                "projects",
                                "buildings_and_phases.projectId",
                                "projects.id"
                            )
                            .innerJoin(
                                "property_types",
                                "buildings_and_phases.propertyTypeId",
                                "property_types.id"
                            )
                            .innerJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                            .where({
                                "buildings_and_phases.isActive": true,
                                //"buildings_and_phases.projectId": projectId,
                                "buildings_and_phases.orgId": orgId,
                            })
                            .where(qb => {
                                if (projectId == 'undefined') {

                                } else {

                                    qb.where('buildings_and_phases.projectId', projectId)

                                }
                            })
                            .select([
                                "buildings_and_phases.id as id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])
                            .whereIn('projects.companyId', companyArr1)
                            .groupBy(["buildings_and_phases.id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])
                    } else {
                        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyHavingProjects.map(v => v.companyId)
                        rows = await knex("buildings_and_phases")
                            .innerJoin(
                                "projects",
                                "buildings_and_phases.projectId",
                                "projects.id"
                            )
                            .innerJoin(
                                "property_types",
                                "buildings_and_phases.propertyTypeId",
                                "property_types.id"
                            )
                            .innerJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                            .where({
                                "buildings_and_phases.isActive": true,
                                "buildings_and_phases.projectId": projectId,
                                "buildings_and_phases.orgId": orgId,
                                'property_units.type': 1
                            })
                            .select([
                                "buildings_and_phases.id as id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])
                            .whereIn('projects.companyId', companyArr1)
                            .groupBy(["buildings_and_phases.id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])


                        console.log('BUILDING LIST:******************************************************************* ', rows)
                    }


            buildingData.data = rows;

            return res.status(200).json({
                data: {
                    buildingPhases: buildingData
                },
                message: "Building Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBuildingPhaseAllListHavingPropertyUnitsAndWithoutUnits: async (req, res) => {
        try {
            let projectId = req.query.projectId;
            let orgId = req.orgId;
            console.log("projectId for building", projectId)

            let buildingData = {};
            //console.log(orgId);

            let companyHavingProjects = []
            let companyArr1 = []
            let rows = []

            if (req.query.areaName === 'common') {
                companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                companyArr1 = companyHavingProjects.map(v => v.companyId)
                rows = await knex("buildings_and_phases")
                    .innerJoin(
                        "projects",
                        "buildings_and_phases.projectId",
                        "projects.id"
                    )
                    .innerJoin(
                        "property_types",
                        "buildings_and_phases.propertyTypeId",
                        "property_types.id"
                    )
                    .leftJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                    .where({
                        "buildings_and_phases.isActive": true,
                        "buildings_and_phases.projectId": projectId,
                        "buildings_and_phases.orgId": orgId,
                       // 'property_units.type': 2
                    })
                    .select([
                        "buildings_and_phases.id as id",
                        "buildings_and_phases.buildingPhaseCode",
                        "property_types.propertyType",
                        "buildings_and_phases.description",
                        "property_types.propertyTypeCode",
                    ])
                    .whereIn('projects.companyId', companyArr1)
                    .groupBy(["buildings_and_phases.id",
                        "buildings_and_phases.buildingPhaseCode",
                        "property_types.propertyType",
                        "buildings_and_phases.description",
                        "property_types.propertyTypeCode",
                    ])


            } else
                if (req.query.areaName === 'all' && projectId === '') {
                    companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                    companyArr1 = companyHavingProjects.map(v => v.companyId)
                    rows = await knex("buildings_and_phases")
                        .innerJoin(
                            "projects",
                            "buildings_and_phases.projectId",
                            "projects.id"
                        )
                        .innerJoin(
                            "property_types",
                            "buildings_and_phases.propertyTypeId",
                            "property_types.id"
                        )
                        .leftJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                        .where({
                            "buildings_and_phases.isActive": true,
                            "buildings_and_phases.orgId": orgId,
                        })
                        .select([
                            "buildings_and_phases.id as id",
                            "buildings_and_phases.buildingPhaseCode",
                            "property_types.propertyType",
                            "buildings_and_phases.description",
                            "property_types.propertyTypeCode",
                        ])
                        .whereIn('projects.companyId', companyArr1)
                        .groupBy(["buildings_and_phases.id",
                            "buildings_and_phases.buildingPhaseCode",
                            "property_types.propertyType",
                            "buildings_and_phases.description",
                            "property_types.propertyTypeCode",
                        ])
                } else
                    if (req.query.areaName === 'all') {
                        companyHavingProjects = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyHavingProjects.map(v => v.companyId)
                        rows = await knex("buildings_and_phases")
                            .innerJoin(
                                "projects",
                                "buildings_and_phases.projectId",
                                "projects.id"
                            )
                            .innerJoin(
                                "property_types",
                                "buildings_and_phases.propertyTypeId",
                                "property_types.id"
                            )
                            .leftJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                            .where({
                                "buildings_and_phases.isActive": true,
                                //"buildings_and_phases.projectId": projectId,
                                "buildings_and_phases.orgId": orgId,
                            })
                            .where(qb => {
                                if (projectId == 'undefined') {

                                } else {

                                    qb.where('buildings_and_phases.projectId', projectId)

                                }
                            })
                            .select([
                                "buildings_and_phases.id as id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])
                            .whereIn('projects.companyId', companyArr1)
                            .groupBy(["buildings_and_phases.id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])
                    } else {
                        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
                        companyArr1 = companyHavingProjects.map(v => v.companyId)
                        rows = await knex("buildings_and_phases")
                            .innerJoin(
                                "projects",
                                "buildings_and_phases.projectId",
                                "projects.id"
                            )
                            .innerJoin(
                                "property_types",
                                "buildings_and_phases.propertyTypeId",
                                "property_types.id"
                            )
                            .leftJoin('property_units', 'buildings_and_phases.id', 'property_units.buildingPhaseId')
                            .where({
                                "buildings_and_phases.isActive": true,
                                "buildings_and_phases.projectId": projectId,
                                "buildings_and_phases.orgId": orgId,
                               // 'property_units.type': 1
                            })
                            .select([
                                "buildings_and_phases.id as id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])
                            .whereIn('projects.companyId', companyArr1)
                            .groupBy(["buildings_and_phases.id",
                                "buildings_and_phases.buildingPhaseCode",
                                "property_types.propertyType",
                                "buildings_and_phases.description",
                                "property_types.propertyTypeCode",
                            ])


                        console.log('BUILDING LIST:******************************************************************* ', rows)
                    }


            buildingData.data = rows;

            return res.status(200).json({
                data: {
                    buildingPhases: buildingData
                },
                message: "Building Phases List!"
            });
        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    
    getBuildingPhaseById: async (req, res) => {
        try {
            let id = req.body.id
            let orgId = req.orgId
            let buildingPhaseResult = await knex("buildings_and_phases")
                .select([
                    "buildings_and_phases.id",
                    "buildings_and_phases.description",
                    "buildings_and_phases.buildingPhaseCode"
                ])
                .where("buildings_and_phases.id", id)
                .where("buildings_and_phases.orgId", orgId)

            return res.status(200).json({
                data: {
                    buildingPhases: buildingPhaseResult
                },
                message: "Building Phases List!"
            });

        } catch (err) {
            console.log(
                "[controllers][generalsetup][viewbuildingPhase] :  Error",
                err
            );
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }

    ,
    getUnitListByBuildingId: async (req, res) => {

        try {

            let rows;
            let companyHavingProjects;
            let companyArr1;
            let buildingId = req.query.buildingId;
            let orgId = req.orgId;

            if (req.query.buildingId == 'undefined' || req.query.buildingId == "all") {

                rows = await knex("property_units")
                    .where({
                        "property_units.isActive": true,
                        //"property_units.buildingPhaseId": projectId,
                        "property_units.orgId": orgId,
                        "type": 1
                    })
                    .select('*')

            } else {

                rows = await knex("property_units")
                    .where({
                        "property_units.isActive": true,
                        "property_units.buildingPhaseId": buildingId,
                        "property_units.orgId": orgId,
                        "type": 1
                    })
                    .select('*')

                console.log('BUILDING LIST:******************************************************************* ', rows)
            }

            return res.status(200).json({
                data: rows,
                message: "Building Phases List!"
            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },


};

module.exports = buildingPhaseController;
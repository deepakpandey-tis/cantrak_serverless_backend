const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const uuid = require('uuid/v4')
const emailHelper = require('../../helpers/email')
const XLSX = require("xlsx");
const fs = require('fs');

const userComponentController = {
    UserComponentDetail: async (req, res) => {

        let id = req.params.id;

        try {

            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid UserComponent Id' }
                    ],
                });
            }

            const userComponentDetails = await knex
            .from('user_component_master as ucm')
            .select(['r.resourceName', 'ucm.*'])
            .where("ucm.id", id)
            .leftJoin(
                "resources as r",
                "ucm.resourceId",
                "r.id"
            )
            .first();
            console.log(`[controllers][v1][v1][userComponent][userComponentDetails]: User Component Details:`, userComponentDetails);

            // let resources = await knex.raw(`select "resourceId", jsonb_array_elements(jsonb_agg("accessType")) as permissions 
            //                                     from role_resource_access_master where "roleId" = ${id} group by "resourceId";`);

            // resources = resources.rows;                                    

            // const Parallel = require('async-parallel');
            // resources = await Parallel.map(resources, async (res) => {
            //     let resource = await knex.from('resources').select(['id', 'resourceName', 'resourceKey'])
            //         .where({ id: res.resourceId })
            //         .first();

            //     res = { ...res, ...resource };
            //     return res;
            // });
            // applicationRole.resources = resources;
            return res.status(200).json({ data: userComponentDetails });

        } catch (err) {
            console.log('[controllers][v1][v1][userComponent][userComponentDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    list: async (req, res) => {

        try {

            console.log('[controllers][v1][UserComponent][list]');

            let reqData = req.query;

            //let filters = {}
            let total, rows;
            let { filter, sortFilter } = req.body;
            //console.log("=== filter ===", filter);
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            [total, rows] = await Promise.all([
                knex.count("r.* as count")
                    .from("user_component_master as ucm")
                    .leftJoin(
                        "resources as r",
                        "ucm.resourceId",
                        "r.id"
                    )
                    .first(),

                knex("user_component_master as ucm")
                    .leftJoin(
                        "resources as r",
                        "ucm.resourceId",
                        "r.id"
                    )
                    .select(['r.resourceName', 'ucm.*'])
                    .orderBy("ucm.id", "desc")
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

            // const Parallel = require('async-parallel');

            // pagination.data = await Parallel.map(rows, async pd => {

            //     let assocResPermissions = await knex.from('role_resource_access_master as rram')
            //         .join('resources as rs', 'rs.id', 'rram.resourceId')
            //         .where({ "rram.roleId": pd.id })
            //         .select(['rram.resourceId', 'rram.accessType as permissions', 'rs.resourceName']);

            //     return {
            //         ...pd,
            //         resources: assocResPermissions,
            //     };

            // });
            return res.status(200).json(pagination);

        } catch (err) {
            console.log('[controllers][v1][UserComponent][list] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    createUserComponent: async (req, res) => {

        try {

            const payload = req.body;
            // const payload = _.omit(req.body, ["icon"]);
            console.log('[controllers][v1][UserComponent][createUserComponent]:', req.body);
            const schema = Joi.object().keys({
                code: Joi.string().required().min(1).max(255),
                componentName: Joi.string().required().min(1).max(255),
                componentNameTh: Joi.string().required().min(1).max(255),
                resourceId: Joi.string().required().min(1).max(255),
                icon: Joi.string().required().min(1).max(255),
                uri: Joi.string().required().min(1).max(255)
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][uresultser][createUserComponent]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            
            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let newId;
                let addedUserComponent = await knex("user_component_master")
                    .insert({ ...req.body, createdAt: currentTime, updatedAt: currentTime })
                    .returning(["*"])
                    .transacting(trx);
                addedUserComponent = addedUserComponent && addedUserComponent[0] ? addedUserComponent[0] : addedUserComponent;
                newId = addedUserComponent?.id;
                if(newId){
                    
                    let organizations = await knex("organisations as o")
                    .select(['o.*'])
                    .orderBy("o.id", "desc");

                    console.log("=== organizations ===", organizations);

                    const Parallel = require("async-parallel");
                    await Parallel.map(
                        organizations,
                        async (o) => {

                            let addedComponentIcon = await knex("components_icon_master")
                            .insert({ componentId: newId, orgId: o.id, createdAt: currentTime, updatedAt: currentTime })
                            .returning(["*"])
                            .transacting(trx);
                        }
                    );
                }
            });

            console.log('[controllers][v1][UserComponent][createUserComponent]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'UserComponent Created Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][UserComponent][createUserComponent] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateUserComponent: async (req, res) => {

        try {

            let id = req.params.id;
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid UserComponent Id' }
                    ],
                });
            }

            // const payload = req.body;
            const payload = _.omit(req.body, ["icon"]);
            console.log('[controllers][v1][v1][UserComponent][updateUserComponent]:', req.body);
            
            const schema = Joi.object().keys({
                code: Joi.string().required().min(1).max(255),
                componentName: Joi.string().required().min(1).max(255),
                componentNameTh: Joi.string().required().min(1).max(255),
                resourceId: Joi.string().required().min(1).max(255),
                uri: Joi.string().required().min(1).max(255)
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][UserComponent][updateUserComponent]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedUserComponents = await knex("user_component_master")
                    .update({ ...req.body, updatedAt: currentTime })
                    .where({id})
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][UserComponent][updateUserComponent]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'UserComponent Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][UserComponent][updateUserComponent]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateUserComponentStatus: async (req, res) => {

        try {

            let id = req.params.id;
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid UserComponent Id' }
                    ],
                });
            }

            const payload = req.body;
            console.log('[controllers][v1][v1][UserComponent][updateUserComponentStatus]:', payload);

            const schema = Joi.object().keys({
                isActive: Joi.boolean().required(),
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][UserComponent][updateUserComponentStatus]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedUserComponents = await knex("user_component_master")
                    .update({ ...payload, updatedAt: currentTime })
                    .where({id})
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][UserComponent][updateUserComponentStatus]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'User Component Status Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][UserComponent][updateUserComponentStatus]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    
}
module.exports = userComponentController

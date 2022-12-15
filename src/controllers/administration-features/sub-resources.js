const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");


const SubResourcesController = {
    SubResourcesDetail: async (req, res) => {

        let id = req.params.id;

        try {

            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid SubResources Id' }
                    ],
                });
            }

            const subResourcesDetails = await knex
            .from('sub_resources as sr')
            .select(['r.resourceName', 'sr.*'])
            .where("sr.id", id)
            .leftJoin(
                "resources as r",
                "sr.resourceId",
                "r.id"
            )
            .first();
            console.log(`[controllers][v1][v1][SubResources][subResourcesDetails]:  SubResources Details:`, subResourcesDetails);

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
            return res.status(200).json({ data: subResourcesDetails });

        } catch (err) {
            console.log('[controllers][v1][v1][SubResources][subResourcesDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    list: async (req, res) => {

        try {

            console.log('[controllers][v1][SubResources][list]');

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
                    .from("sub_resources as sr")
                    .leftJoin(
                        "resources as r",
                        "sr.resourceId",
                        "r.id"
                    )
                    .first(),

                knex("sub_resources as sr")
                    .leftJoin(
                        "resources as r",
                        "sr.resourceId",
                        "r.id"
                    )
                    .select(['r.resourceName', 'r.resourceNameTh', 'sr.*'])
                    .orderBy("r.orderBy", "asc")
                    .orderBy('r.resourceName', "asc")
                    .orderBy("sr.orderBy", "asc")
                    .orderBy("sr.componentName", "asc")
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
            console.log('[controllers][v1][SubResources][list] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    createSubResources: async (req, res) => {

        try {

            // const payload = req.body;
            const payload = _.omit(req.body, ["icon", "iconCode"]);
            console.log('[controllers][v1][SubResources][createSubResources]:', req.body);
            const schema = Joi.object().keys({
                code: Joi.string().required().min(1).max(255),
                componentName: Joi.string().required().min(1).max(255),
                componentNameTh: Joi.string().required().min(1).max(255),
                resourceId: Joi.string().required().min(1).max(255),
                orderBy: Joi.number().required().min(1),
                uri: Joi.string().required().min(1).max(255),
                badgeName: Joi.string().required().min(1).max(255).allow(null),
                badgeBgColor: Joi.string().required().min(1).max(255).allow(null),
                badgeColor: Joi.string().required().min(1).max(255).allow(null),
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][uresultser][createSubResources]: Joi Validate Result', result);

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
                let addedSubResources = await knex("sub_resources")
                    .insert({ ...req.body, createdAt: currentTime, updatedAt: currentTime })
                    .returning(["*"])
                    .transacting(trx);
                addedSubResources = addedSubResources && addedSubResources[0] ? addedSubResources[0] : addedSubResources;
                newId = addedSubResources?.id;
                if(newId){
                    
                    let organizations = await knex("organisations as o")
                    .select(['o.*'])
                    .orderBy("o.id", "desc");

                    console.log("=== organizations ===", organizations);

                    const Parallel = require("async-parallel");
                    await Parallel.map(
                        organizations,
                        async (o) => {

                            let addedSubResourcesIcon = await knex("organisation_sub_resources_master")
                            .insert({ "subResourceId": newId, orgId: o.id, orderBy: req.body.orderBy, createdAt: currentTime, updatedAt: currentTime })
                            .returning(["*"])
                            .transacting(trx);
                        }
                    );
                }
            });

            console.log('[controllers][v1][SubResources][createSubResources]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'SubResources Created Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][SubResources][createSubResources] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateSubResources: async (req, res) => {

        try {

            let id = req.params.id;
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid SubResources Id' }
                    ],
                });
            }

            // const payload = req.body;
            const payload = _.omit(req.body, ["icon", "iconCode"]);
            console.log('[controllers][v1][v1][SubResources][updateSubResources]:', req.body);
            
            const schema = Joi.object().keys({
                code: Joi.string().required().min(1).max(255),
                componentName: Joi.string().required().min(1).max(255),
                componentNameTh: Joi.string().required().min(1).max(255),
                resourceId: Joi.string().required().min(1).max(255),
                orderBy: Joi.number().required().min(1),
                uri: Joi.string().required().min(1).max(255),
                badgeName: Joi.string().required().min(1).max(255).allow(null),
                badgeBgColor: Joi.string().required().min(1).max(255).allow(null),
                badgeColor: Joi.string().required().min(1).max(255).allow(null),
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][SubResources][updateSubResources]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedSubResourcess = await knex("sub_resources")
                    .update({ ...req.body, updatedAt: currentTime })
                    .where({id})
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][SubResources][updateSubResources]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'SubResources Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][SubResources][updateSubResources]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateSubResourcesStatus: async (req, res) => {

        try {

            let id = req.params.id;
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid SubResources Id' }
                    ],
                });
            }

            const payload = req.body;
            console.log('[controllers][v1][v1][SubResources][updateSubResourcesStatus]:', payload);

            const schema = Joi.object().keys({
                isActive: Joi.boolean().required(),
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][SubResources][updateSubResourcesStatus]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedSubResourcess = await knex("sub_resources")
                    .update({ ...payload, updatedAt: currentTime })
                    .where({id})
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][SubResources][updateSubResourcesStatus]: Payload:', payload);

            return res.status(200).json({ data: {}, message: ' SubResources Status Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][SubResources][updateSubResourcesStatus]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    
}
module.exports = SubResourcesController

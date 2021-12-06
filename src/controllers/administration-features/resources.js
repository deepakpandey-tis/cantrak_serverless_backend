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

const resourcesController = {
    resourceDetail: async (req, res) => {

        let id = req.params.id;

        try {

            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            const resourcesDetails = await knex
            .from('resources as r')
            .where("r.id", id)
            .first();
            console.log(`[controllers][v1][v1][Resource][ResourcesDetail]: Resources Details:`, resourcesDetails);

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
            return res.status(200).json({ data: resourcesDetails });

        } catch (err) {
            console.log('[controllers][v1][v1][Resource][ResourcesDetail] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    list: async (req, res) => {

        try {

            console.log('[controllers][v1][Resource][list]');

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
                    .from("resources as r")
                    .first(),

                knex("resources as r")
                    .select(['r.*'])
                    .orderBy("r.orderBy", "asc")
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
            console.log('[controllers][v1][Resource][list] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    createResource: async (req, res) => {

        try {

            const payload = _.omit(req.body, ["uri","icon"]);
            console.log('[controllers][v1][Resource][createResource]:', payload);

            const schema = Joi.object().keys({
                resourceName: Joi.string().required().min(1).max(255),
                resourceNameTh: Joi.string().required().min(1).max(255),
                code: Joi.string().required().min(1).max(255),
                orderBy: Joi.number().required().min(1),
                iconCode: Joi.string().required().min(1).max(255)
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][uresultser][createResource]: Joi Validate Result', result);

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
                let addedResource = await knex("resources")
                    .insert({ ...req.body, createdAt: currentTime, updatedAt: currentTime })
                    .returning(["*"])
                    .transacting(trx);
                addedResource = addedResource && addedResource[0] ? addedResource[0] : addedResource;
                newId = addedResource?.id;
                if(newId){
                    
                    let organizations = await knex("organisations as o")
                    .select(['o.*'])
                    .orderBy("o.id", "desc");

                    console.log("=== organizations ===", organizations);

                    const Parallel = require("async-parallel");
                    await Parallel.map(
                        organizations,
                        async (o) => {

                            let addedResourceRole = await knex("organisation_resources_master")
                            .insert({ resourceId : newId, orgId: o.id, orderBy: req.body.orderBy, isShow: false, isAuthorized: false, createdAt: currentTime, updatedAt: currentTime })
                            .returning(["*"])
                            .transacting(trx);
                        }
                    );
                }
            });

            console.log('[controllers][v1][Resource][createResource]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'Resource Created Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][Resource][createResource] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateResource: async (req, res) => {

        try {

            let id = req.params.id;
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            const payload = _.omit(req.body, ["icon", "uri"]);
            console.log('[controllers][v1][v1][Resource][updateResource]:', payload);

            const schema = Joi.object().keys({
                code: Joi.string().required().min(1).max(255),
                resourceName: Joi.string().required().min(1).max(255),
                resourceNameTh: Joi.string().required().min(1).max(255),
                orderBy: Joi.number().required().min(1),
                iconCode: Joi.string().required().min(1).max(255)
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][Resource][updateResource]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedResources = await knex("resources")
                    .update({ ...req.body, updatedAt: currentTime })
                    .where({id})
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][Resource][updateResource]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'Resource Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][Resource][updateResource]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateResourceStatus: async (req, res) => {

        try {

            let id = req.params.id;
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            const payload = req.body;
            console.log('[controllers][v1][v1][Resource][updateResourceStatus]:', payload);

            const schema = Joi.object().keys({
                isActive: Joi.boolean().required(),
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][Resource][updateResourceStatus]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedResources = await knex("resources")
                    .update({ ...payload, updatedAt: currentTime })
                    .where({id})
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][Resource][updateResourceStatus]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'Resource Status Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][Resource][updateResourceStatus]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    getResourceList: async (req, res) => {

        try {

            console.log('[controllers][v1][Resource][getResourceList]');
            
            const resourcesDetails = await knex
            .from('resources as r')
            .orderBy('r.id', 'desc');

            return res.status(200).json({data: resourcesDetails});

        } catch (err) {
            console.log('[controllers][v1][Resource][list] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    getResourceListWithSubResource: async (req, res) => {

        try {

            let id = req.params.id;

            console.log('[controllers][v1][Resource][getResourceListWithSubResource]');
            
            const resourcesDetails = await knex
            .select("orm.id","orm.resourceId","r.resourceName","r.resourceNameTh","r.code","r.iconCode","orm.isAuthorized","orm.isShow")
            .from('organisation_resources_master as orm')
            .leftJoin("resources as r","r.id","orm.resourceId")
            .where("orm.orgId", id)
            .where("r.isActive", true)
            .orderBy('r.id', 'desc' );

            let data = resourcesDetails;


            const Parallel = require("async-parallel");
            data = await Parallel.map(
                resourcesDetails,
                async (r) => {

                    let isSubResourceData = false;
                    let subResource = await knex("organisation_sub_resources_master as osrm")
                    .leftJoin("sub_resources as sr", "sr.id","osrm.subResourceId")
                    .select("sr.*")
                    .where({ "osrm.orgId": id, "sr.resourceId": r.resourceId, "sr.isActive": true });

                    if(subResource?.length > 0){
                        isSubResourceData = true;
                    }

                    return {...r, isSubResourceData: isSubResourceData, subResource: subResource}
                }
            );


            return res.status(200).json({data: data});

        } catch (err) {
            console.log('[controllers][v1][Resource][list] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    getActiveResourceListWithSubResource: async (req, res) => {

        try {

            let id = 0;
            let orderBy1 = Array('r.id', 'desc');
            let orderBy2 = Array('sr.id', 'desc');

            if(req.params?.id){

                id = req.params.id;
            }
            else{
                id = Number(req.me.orgId);
                orderBy1 = Array('orm.orderBy', 'asc');
                orderBy2 = Array('osrm.orderBy', 'asc');
            }
            

            console.log('[controllers][v1][Resource][getResourceListWithSubResource]', id);
            
            const resourcesDetails = await knex
            .select("orm.id","orm.orderBy","orm.resourceId","r.resourceName","r.resourceNameTh","r.code", "r.uri", "r.iconCode","orm.icon as iconFromOrg","orm.isAuthorized","orm.isShow")
            .from('organisation_resources_master as orm')
            .leftJoin("resources as r","r.id","orm.resourceId")
            .where("orm.orgId", id)
            .where("r.isActive", true)
            .where((qb)=>{
                qb.where("orm.isAuthorized", true);
                qb.orWhere("orm.isShow", true)
            })
            .orderBy(...orderBy1);

            let data = resourcesDetails;


            const Parallel = require("async-parallel");
            data = await Parallel.map(
                resourcesDetails,
                async (r) => {

                    let isSubResourceData = false;
                    let subResource = await knex("organisation_sub_resources_master as osrm")
                        .leftJoin("sub_resources as sr", "sr.id","osrm.subResourceId")
                        .select("sr.*","osrm.orderBy" , "osrm.icon as iconFromOrg")
                        .where({ "osrm.orgId": id, "sr.resourceId": r.resourceId, "sr.isActive": true })
                        .orderBy(...orderBy2);

                    if(subResource?.length > 0){
                        isSubResourceData = true;
                    }

                    return {...r, isSubResourceData: isSubResourceData, subResource: subResource}
                }
            );


            return res.status(200).json({data: data});

        } catch (err) {
            console.log('[controllers][v1][Resource][list] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    generateResourceAndSubResource: async (req, res) => {

        let id = req.params.id;
        let currentTime = new Date().getTime();

        try {

            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            let currentResourceData = [];
            let currentComponentData = [];
            await knex.transaction(async trx => {
                let resources = await knex("resources as r")
                .select(['r.*'])
                .orderBy("r.id", "desc");

                console.log("=== resources ===", resources);

                const Parallel = require("async-parallel");
                await Parallel.map(
                resources,
                    async (r) => {

                        let status = false;
                        let currentResource = await knex("organisation_resources_master as orm")
                            .count("orm.* as count")
                            .where({ "resourceId": r.id, "orgId": id })
                            .first();

                        if(currentResource.count == 0){
                            let addedComponentIcon = await knex("organisation_resources_master")
                            .insert({ resourceId: r.id, orgId: id, createdAt: currentTime, updatedAt: currentTime, isShow: false, isAuthorized: false })
                            .returning(["*"])
                            .transacting(trx);

                            status = true;
                        }

                        currentResourceData.push({ "resourceId": r.id, "orgId": id , count: currentResource.count, inserted: status});
                    }
                );


                let subResourceMaster = await knex("sub_resources as sr")
                .select(['sr.*'])
                .orderBy("sr.id", "desc");

                console.log("=== subResourceMaster ===", subResourceMaster);

                // const Parallel = require("async-parallel");
                await Parallel.map(
                subResourceMaster,
                    async (sr) => {
                        let status = false;
                        let currentComponent = await knex("organisation_sub_resources_master as osrm")
                            .count("osrm.* as count")
                            .where({ "subResourceId": sr.id, "orgId": id })
                            .first();
                        
                        
                        // data.push({currentComponent: currentComponent});
                        if(currentComponent.count == 0){
                            let addedComponentIcon = await knex("organisation_sub_resources_master")
                            .insert({ subResourceId: sr.id, orgId: id, createdAt: currentTime, updatedAt: currentTime })
                            .returning(["*"])
                            .transacting(trx); 

                            status = true;
                        }

                        currentComponentData.push({ "subResourceMaster": sr.id, "orgId": id , count: currentComponent.count, inserted: status});
                    }
                );
                trx.commit;
            });

            return res.status(200).json({ data: { currentResourceData: currentResourceData, currentComponentData: currentComponentData }});

        } catch (err) {
            console.log('[controllers][v1][v1][Resource][ResourcesDetail] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    
}
module.exports = resourcesController
const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require('bcryptjs');
const saltRounds = 10;
const uuid = require('uuid/v4')
const emailHelper = require('../../helpers/email')
const XLSX = require("xlsx");
const fs = require('fs');

const resourcesController = {
    resourceDetail: async (req, res) => {

        let id = req.params.id;
        let orgId = req.me.orgId;

        try {

            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            const resourcesDetails = await knex
            .select("orm.id","orm.orderBy","orm.resourceId","r.resourceName","r.resourceNameTh","r.code", "r.uri", "r.iconCode","orm.icon as iconFromOrg","orm.isAuthorized","orm.isShow")
            .from('organisation_resources_master as orm')
            .leftJoin("resources as r","r.id","orm.resourceId")
            .where("orm.id", id)
            .where("orm.orgId", orgId)
            .first();

            console.log(`[controllers][v1][v1][Org Resource][ResourcesDetail]: Resources Details:`, resourcesDetails);

            return res.status(200).json({ data: resourcesDetails });

        } catch (err) {
            console.log('[controllers][v1][v1][Org Resource][ResourcesDetail] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    list: async (req, res) => {

        try {

            console.log('[controllers][v1][Org Resource][list]');

            let reqData = req.query;
            let orgId = req.me.orgId;

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
                knex.count("orm.* as count")
                    .from('organisation_resources_master as orm')
                    .leftJoin("resources as r","r.id","orm.resourceId")
                    .where("orm.orgId", orgId)
                    .where("r.isActive", true)
                    .where((qb)=>{
                        qb.where("orm.isAuthorized", true);
                        qb.orWhere("orm.isShow", true)
                    })
                    .first(),

                knex.select("orm.id","orm.orderBy","orm.resourceId","r.resourceName","r.resourceNameTh","r.code", "r.uri", "r.iconCode","orm.icon as iconFromOrg","orm.isAuthorized","orm.isShow","orm.updatedAt")
                    .from('organisation_resources_master as orm')
                    .leftJoin("resources as r","r.id","orm.resourceId")
                    .where("orm.orgId", orgId)
                    .where("r.isActive", true)
                    .where((qb)=>{
                        qb.where("orm.isAuthorized", true);
                        qb.orWhere("orm.isShow", true)
                    })
                    .orderBy('orm.orderBy', 'asc')
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
            console.log('[controllers][v1][Org Resource][list] :  Error', err);
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
            let orgId = req.me.orgId;
            
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            const payload = _.omit(req.body, ["icon"]);
            console.log('[controllers][v1][v1][Org Resource][updateResource]:', payload);

            const schema = Joi.object().keys({
                orderBy: Joi.number().required().min(1).max(255)
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][Org Resource][updateResource]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedResources = await knex("organisation_resources_master as orm")
                    .update({ ...req.body, updatedAt: currentTime })
                    .where({id})
                    .where("orm.orgId", orgId)
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][Org Resource][updateResource]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'Resource Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][Org Resource][updateResource]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    resetResourcePosition: async (req, res) => {

        try {

            let orgId = req.me.orgId;
            
            if (!orgId) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            // const payload = _.omit(req.body, ["icon"]);
            // console.log('[controllers][v1][v1][Org Resource][updateResource]:', payload);

            // const schema = Joi.object().keys({
            //     orderBy: Joi.number().required().min(1).max(255)
            // });

            // const result = schema.validate(payload);
            // console.log('[controllers][v1][Org Resource][updateResource]: Joi Validate Result', result);

            // if (result && result.hasOwnProperty('error') && result.error) {
            //     return res.status(400).json({
            //         errors: [
            //             { code: 'VALIDATION_ERROR', message: result.error.message }
            //         ],
            //     });
            // }

            let currentTime = moment().valueOf();

            const rows = await knex('resources');

            const Parallel = require('async-parallel');

            let data = await Parallel.map(rows, async pd => {

                let updatedResources = await knex("organisation_resources_master as orm")
                    .update({ orderBy: pd.orderBy, updatedAt: currentTime })
                    .where({"orm.resourceId": pd.id})
                    .where("orm.orgId", orgId);

                return {
                    ...pd
                };

            });

            // console.log('[controllers][v1][v1][Org Resource][updateResource]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'Resource Position has been reseted Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][Org Resource][updateResource]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    
}
module.exports = resourcesController
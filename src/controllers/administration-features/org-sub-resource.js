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

const subResourcesController = {
    subResourcesDetail: async (req, res) => {

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

            const subResourcesDetails = await knex
            .select("osrm.id","osrm.orderBy", "osrm.subResourceId", "r.resourceName", "r.resourceNameTh","sr.componentName","sr.componentNameTh","sr.code", "sr.uri", "sr.iconCode","osrm.icon as iconFromOrg")
            .from('organisation_sub_resources_master as osrm')
            .leftJoin("sub_resources as sr","sr.id","osrm.subResourceId")
            .leftJoin("resources as r","r.id","sr.resourceId")
            .where("osrm.id", id)
            .where("osrm.orgId", orgId)
            .first();

            console.log(`[controllers][v1][v1][Org Resource][ResourcesDetail]: Resources Details:`, subResourcesDetails);

            return res.status(200).json({ data: subResourcesDetails });

        } catch (err) {
            console.log('[controllers][v1][v1][Org Resource][ResourcesDetail] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: ersr.message }
                ],
            });
        }
    },

    list: async (req, res) => {

        try {

            console.log('[controllers][v1][Org Sub Resource][list]');

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
                knex.count("osrm.* as count")
                    .from('organisation_sub_resources_master as osrm')
                    .leftJoin("sub_resources as sr","sr.id","osrm.subResourceId")
                    .leftJoin("resources as r","r.id","sr.resourceId")
                    .where("osrm.orgId", orgId)
                    .where("sr.isActive", true)
                    .where("r.isActive", true)
                    .first(),

                knex.select("osrm.id","osrm.orderBy","osrm.subResourceId","r.resourceName", "r.resourceNameTh","sr.componentName","sr.componentNameTh","sr.code", "sr.uri", "sr.iconCode","osrm.icon as iconFromOrg","osrm.updatedAt")
                    .from('organisation_sub_resources_master as osrm')
                    .leftJoin("sub_resources as sr","sr.id","osrm.subResourceId")
                    .leftJoin("resources as r","r.id","sr.resourceId")
                    .where("osrm.orgId", orgId)
                    .where("sr.isActive", true)
                    .where("r.isActive", true)
                    .orderBy('r.resourceName', 'asc')
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
            //         .join('sub_resources as srs', 'rs.id', 'rram.subResourceId')
            //         .where({ "rram.roleId": pd.id })
            //         .select(['rram.subResourceId', 'rram.accessType as permissions', 'rs.resourceName']);

            //     return {
            //         ...pd,
            //         resources: assocResPermissions,
            //     };

            // });
            return res.status(200).json(pagination);

        } catch (err) {
            console.log('[controllers][v1][Org Sub Resource][list] :  Error', err);
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
            let orgId = req.me.orgId;
            
            if (!id) {
                res.status(400).json({
                    errors: [
                        { code: 'BAD_REQUEST', message: 'Invalid Resource Id' }
                    ],
                });
            }

            const payload = _.omit(req.body, ["icon"]);
            console.log('[controllers][v1][v1][Org Resource][updateSubResources]:', payload);

            const schema = Joi.object().keys({
                orderBy: Joi.number().required().min(1).max(255)
            });

            const result = schema.validate(payload);
            console.log('[controllers][v1][Org Resource][updateSubResources]: Joi Validate Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.errosr.message }
                    ],
                });
            }

            let currentTime = moment().valueOf();

            await knex.transaction(async trx => {
                let updatedResources = await knex("organisation_sub_resources_master as osrm")
                    .update({ ...req.body, updatedAt: currentTime })
                    .where({id})
                    .where("osrm.orgId", orgId)
                    .returning(["*"])
                    .transacting(trx);

            });

            console.log('[controllers][v1][v1][Org Sub Resource][updateSubResources]: Payload:', payload);

            return res.status(200).json({ data: {}, message: 'Sub Resource Updated Successfully.' });

        } catch (err) {
            console.log('[controllers][v1][v1][Org Sub Resource][updateSubResources]:  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: ersr.message }
                ],
            });
        }
    },

    resetSubResourcePosition: async (req, res) => {

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

            const rows = await knex('sub_resources');

            const Parallel = require('async-parallel');

            let data = await Parallel.map(rows, async pd => {

                let updatedResources = await knex("organisation_sub_resources_master as orm")
                    .update({ orderBy: pd.orderBy, updatedAt: currentTime })
                    .where({"orm.subResourceId": pd.id})
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
module.exports = subResourcesController
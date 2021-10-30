const Joi = require("@hapi/joi");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const fs = require("fs");


const themePresetsController = {

    getAllThemePresetsList: async (req, res) => {

        // console.log("Superadmin test", req.body)
        try {
            
            [rows] = await Promise.all([
                knex("theme_presets")
                    .where('theme_presets.isActive', true)
                    .select('*')
                    .orderBy('theme_presets.id', 'DESC')
            ]);

            return res.status(200).json({
                data: {
                    themePresets: rows
                },
                message: "Theme Presets List!"
            });
        } catch (err) {
            console.log("[controllers][themePresetsController][getAllThemePresetsList] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    getThemePresetsList: async (req, res) => {

        // console.log("Superadmin test", req.body)
        try {
            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "theme_presets.id";
                sortPayload.orderBy = "DESC"
            }
            let orgId = req.body.orgId;
            let reqData = req.query;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let total, rows;
            let { companyName, organisation } = req.body;
            [total, rows] = await Promise.all([
                knex
                    .count("* as count")
                    .from("theme_presets")
                    .where('theme_presets.isActive', true)
                    .first(),
                knex("theme_presets")
                    .where('theme_presets.isActive', true)
                    .select('*')
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
            return res.status(200).json({
                data: {
                    themePresets: pagination
                },
                message: "Companies List!"
            });
        } catch (err) {
            console.log("[controllers][themePresetsController][getThemePresetsList] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

    
}
module.exports = themePresetsController;
const Joi = require("@hapi/joi");
const _ = require("lodash");

const knex = require("../db/knex");
const XLSX = require("xlsx");

const singupController = {
    getCompaniesList: async(req,res) => {
        let orgId = req.query.id;
        const companies = await knex('')
        return res.status(200).json({
            ok:true
        })
    }
}

module.exports = singupController;
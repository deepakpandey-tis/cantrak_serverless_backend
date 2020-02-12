const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");

const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const facilityBookingController = {
    addFacility: async(req,res) => {
        try {
            const payload = req.body;
            // const schem
        } catch(err) {

        }
    }

}


module.exports = facilityBookingController;
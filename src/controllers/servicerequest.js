const knex = require('../db/knex');
const Joi = require('@hapi/joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require('moment');
const trx = knex.transaction();
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
var arrayCompare = require("array-compare");



const serviceRequestController = {
    addServiceRequest: async (req, res) => {
        // const users = await knex.select().from('users');
        try {

            const addRequestPayload = req.body;           
            console.log('[controllers][servicerequest][addrequest]: Add Request', addRequestPayload);
            
            res.status(200).json({
                data: addRequestPayload,
                message: "Roles List"
            });

        } catch (err) {
            console.log('[controllers][usermanagement][roles] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
};

module.exports = serviceRequestController;
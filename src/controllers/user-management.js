const knex = require('../db/knex');
const Joi = require('@hapi/joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require('moment');
const trx = knex.transaction();
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const userManagementController = {
    roleList: async (req, res) => {
        // const users = await knex.select().from('users');
        try {

            let roleData = null;
            // check username & password not blank
            roleData = await knex('roles').where({ isActive: 'true' }).select('id', 'name');
            console.log('[controllers][usermanagement][roles]: RoleList', roleData);

            res.status(200).json({
                data: roleData,
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
    },

    updateUserRoles: async (req, res) => {
        // const users = await knex.select().from('users');
        try {

            const { userId, roleIds } = req.body;

            console.log('[controllers][usermanagement][updateroles]: UpdateUserRole', userId, roleIds);
            
            // res.status(200).json({
            //     data: roleData,
            //     message: "Roles List"
            // });


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

module.exports = userManagementController;
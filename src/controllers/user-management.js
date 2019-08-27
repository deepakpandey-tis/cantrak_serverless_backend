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
            let added = null;
            let roles = null;
          //  await knex.transaction(async (trx) => {
                const { userId, roleIds } = req.body;
                console.log('[controllers][usermanagement][updateroles]: UpdateUserRole', userId, roleIds);

                // get User Role List

                let userAssignedRole = await knex('user_roles').where({ userId: userId }).select('roleId');
                userAssignedRole = userAssignedRole.map(role => role.roleId);
                console.log('[controllers][usermanagement][updateroles]: DB', userAssignedRole);
                console.log('[controllers][usermanagement][updateroles]: Inputs', roleIds);


                const compareData = arrayCompare(userAssignedRole, roleIds);

                compareData.missing = compareData.missing.map(a => a.a);
                console.log('[controllers][usermanagement][updateroles]: Compare Missing', compareData.missing);

                compareData.added = compareData.added.map(b => b.b);
                console.log('[controllers][usermanagement][updateroles]: Compare Added', compareData.added);

                const Parallel = require('async-parallel');

                const currentTime = new Date().getTime();

                await Parallel.map(compareData.missing, async items => {
                    deletedRoles = await knex('user_roles').where({roleId:items, userId:userId}).del();
                    //let rolename = await knex('roles').where({ id: item.roleId }).select('name');
                    //rolename = rolename[0].name;
                    return deletedRoles;
                });

                await Parallel.map(compareData.added, async item => {
                    roles = await knex('user_roles').insert({roleId:item, userId:userId, createdAt: currentTime, updatedAt: currentTime}).returning(['*']);
                    //let rolename = await knex('roles').where({ id: item.roleId }).select('name');
                    //rolename = rolename[0].name;
                    return roles;
                });

                console.log('[controllers][usermanagement][updateroles]: results', compareData);
                //trx.commit;
           // });

            res.status(200).json({
                data: {
                    role: roles
                },
                message: "Update roles successfully"
            });

        } catch (err) {
            //trx.rollback;
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
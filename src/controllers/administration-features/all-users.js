const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require('fs');
const path = require('path');


const allUsersController = {

    /*GET USERS LIST */
    usersList: async (req, res) => {

        try {
            let { organisation, searchValue, role } = req.body;
            let reqData = req.query;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let total, rows;

            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "users.id";
                sortPayload.orderBy = "asc"
            }

            [total, rows] = await Promise.all([

                knex("users")
                    .distinct('users', 'users.id')
                    .leftJoin(
                        "organisations",
                        "users.orgId",
                        "organisations.id"
                    )
                    .leftJoin(
                        "application_user_roles",
                        "users.id",
                        "application_user_roles.userId"
                    )
                    .select([
                        "users.*",
                        "organisations.organisationName",
                    ])
                    .whereNot('users.id', 59)
                    .where(qb => {

                        if (organisation) {
                            qb.where('users.orgId', organisation);
                        }

                        if (role) {
                            qb.where('application_user_roles.roleId', role);
                        }

                        if (searchValue) {

                            qb.where('users.name', 'iLIKE', `%${searchValue}%`)
                            qb.orWhere('users.email', 'iLIKE', `%${searchValue}%`)
                            qb.orWhere('users.mobileNo', 'iLIKE', `%${searchValue}%`)
                            qb.orWhere('users.userName', 'iLIKE', `%${searchValue}%`)
                        }


                    }),
                knex("users")
                    .distinct('users', 'users.id')
                    .leftJoin(
                        "organisations",
                        "users.orgId",
                        "organisations.id"
                    )
                    .leftJoin(
                        "application_user_roles",
                        "users.id",
                        "application_user_roles.userId"
                    )
                    .select([
                        "users.*",
                        "organisations.organisationName",
                    ])
                    .orderBy(sortPayload.sortBy, sortPayload.orderBy)
                    .whereNot('users.id', 59)
                    .where(qb => {
                        if (organisation) {
                            qb.where('users.orgId', organisation);
                        }
                        if (role) {
                            qb.where('application_user_roles.roleId', role);
                        }
                        if (searchValue) {

                            qb.where('users.name', 'iLIKE', `%${searchValue}%`)
                            qb.orWhere('users.email', 'iLIKE', `%${searchValue}%`)
                            qb.orWhere('users.mobileNo', 'iLIKE', `%${searchValue}%`)
                            qb.orWhere('users.userName', 'iLIKE', `%${searchValue}%`)
                        }
                    })
                    .offset(offset)
                    .limit(per_page)
            ]);


            let count = total.length;
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
                    users: pagination
                }
            });
        } catch (err) {
            console.log(
                "[controllers][all-users][usersList] :  Error",
                err
            );
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    }
    ,
    /*GET ROLE LIST */
    getAllRoleList: async (req, res) => {

        try {
            let result = await knex.from('application_roles')
                .whereNot('id', 1)
                .where({ isActive: true });

            return res.status(200).json({
                data: result
            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET USER DETAILS*/
    userDetails: async (req, res) => {

        try {

            let payload = req.body;

            const schema = Joi.object().keys({
                id: Joi.string().required()
            })

            let result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let userResult = await knex.from('users')
                .leftJoin(
                    "organisations",
                    "users.orgId",
                    "organisations.id"
                )
                .select([
                    'users.*',
                    'organisations.organisationName'
                ])
                .where({ 'users.id': payload.id }).first();

            let roleResult = await knex.from('application_user_roles')
                .leftJoin('application_roles', 'application_user_roles.roleId', 'application_roles.id')
                .leftJoin('organisations', 'application_user_roles.orgId', 'organisations.id')
                .where({ 'application_user_roles.userId': payload.id })


            return res.status(200).json({
                data: {...userResult,roleResult}

            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }

}

module.exports = allUsersController;
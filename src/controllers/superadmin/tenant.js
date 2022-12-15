const Joi = require("@hapi/joi");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const fs = require("fs");
const moment = require("moment");
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const emailHelper = require('../../helpers/email')




const tenantController = {
    getTenantList: async (req, res) => {
        try {
            let orgId = req.body.orgId;

            console.log("request data", req.body)

            let queryData = req.query;

            let pagination = {};
            let per_page = queryData.per_page || 10;
            let page = queryData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let total, rows;

            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "users.id";
                sortPayload.orderBy = "asc"
            }

            let filters = {};
            let { name, organisation } = req.body;

            [total, rows] = await Promise.all([
                knex("users")
                    .leftJoin(
                        "application_user_roles",
                        "users.id",
                        "application_user_roles.userId"
                    )
                    .leftJoin(
                        "user_house_allocation",
                        "users.id",
                        "user_house_allocation.userId"
                    )
                    .leftJoin(
                        "property_units",
                        "user_house_allocation.houseId",
                        "property_units.id"
                    )
                    .select([
                        "users.name as name",
                        "users.email as email",
                        "user_house_allocation.houseId as houseId",
                        "users.id as userId",
                        "property_units.unitNumber",
                        "users.isActive",
                        "users.createdAt as signUpDate",
                        "users.activatedDate as activationDate",
                        "users.lastLogin as lastVisit"
                    ])
                    .where({
                        "application_user_roles.roleId": 4,
                        "users.emailVerified": true
                    })
                    .distinct(['users.id'])
                    .andWhere(qb => {
                        if (Object.keys(filters).length || name || organisation) {
                            if (name) {
                                qb.where('users.name', 'iLIKE', `%${name}%`)
                                qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                                qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                                qb.orWhere('property_units.unitNumber', 'iLIKE', `%${name}%`)
                            }
                            if (organisation) {
                                console.log("qb org", organisation)
                                qb.where('users.orgId', organisation)
                            }
                        }
                    })
                ,
                knex("users")
                    .leftJoin(
                        "application_user_roles",
                        "users.id",
                        "application_user_roles.userId"
                    )
                    .leftJoin(
                        "user_house_allocation",
                        "users.id",
                        "user_house_allocation.userId"
                    )
                    .leftJoin(
                        "property_units",
                        "user_house_allocation.houseId",
                        "property_units.id"
                    )
                    .select([
                        "users.name as name",
                        "users.email as email",
                        "user_house_allocation.houseId as houseId",
                        "users.id as userId",
                        "property_units.unitNumber",
                        "users.isActive",
                        "users.createdAt as signUpDate",
                        "users.activatedDate as activationDate",
                        "users.lastLogin as lastVisit"
                    ])
                    .orderBy(sortPayload.sortBy, sortPayload.orderBy)
                    .where({
                        "application_user_roles.roleId": 4,
                        "users.emailVerified": true
                    })
                    .andWhere(qb => {
                        if (Object.keys(filters).length || name || organisation) {
                            if (name) {
                                qb.where('users.name', 'iLIKE', `%${name}%`)
                                qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                                qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                                qb.orWhere('property_units.unitNumber', 'iLIKE', `%${name}%`)
                            }
                            if (organisation) {
                                qb.where('users.orgId', organisation)
                            }
                        }
                    })
                    // .groupBy(['users.id', 'property_units.id'])
                    .distinct(['users.id'])
                    .offset(offset)
                    .limit(per_page)
            ]);

            console.log("Data in rows", rows)
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
                    customers: pagination
                }
            });

        } catch (err) {

            console.log("[controllers][administration-features][getCustomers] :  Error", err);
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },
    resetPassword: async (req, res) => {

        try {
            let payload = req.body;
            let userId = payload.id;
            console.log("Payload data", payload)
            if (userId) {
                let hash = await bcrypt.hash(payload.newPassword, saltRounds);
                let resetResult = await knex.from('users').update({ password: hash, verifyToken: "" }).where({ id: userId }).returning(['*']);
                res.status(200).json({ message: "Password reset successfully!" })

                if (resetResult) {
                    let emailExistResult = await knex.from('users').where({ id: userId }).returning(['*']);

                    await emailHelper.sendTemplateEmail({
                        to: emailExistResult[0].email,
                        subject: 'Reset Password',
                        template: 'reset-password.ejs',
                        orgId: emailExistResult[0].orgId,
                        templateData: {
                            fullName: emailExistResult[0].name,
                            newPassword: payload.newPassword,
                            orgId: emailExistResult[0].orgId
                        }
                    })
                }

            } else {
                res.status(500).json({
                    errors: [{ code: "UNKNOWN_SERVER_ERROR", message: "Please use valid reset password url!" }]
                });
            }

        } catch (err) {
            console.log(
                "[controllers][signup][resetPassword] :  Error",
                err
            );
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },

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
                    .whereNot('application_user_roles.roleId', 4)
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
                    .whereNot('application_user_roles.roleId', 4)
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


}

module.exports = tenantController;
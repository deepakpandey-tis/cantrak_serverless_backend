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
                .select([
                    'application_roles.name as roleName',
                    'organisations.organisationName',
                    'organisations.id as orgId',
                    'application_roles.id as roleId',

                ])
                .where({ 'application_user_roles.userId': payload.id });

            let Parallel = require('async-parallel');
            roleResult = await Parallel.map(roleResult, async item => {

                let houseResult = await knex.from('user_house_allocation').where({ 'userId': payload.id });
                if (houseResult) {

                    return {
                        ...item,
                        houseIds: houseResult,
                    }

                } else {
                    return {
                        ...item,
                        houseIds: "",
                    }
                }

            })

            return res.status(200).json({
                data: { ...userResult, roleResult }

            });

        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
    ,
    /* LOGIN AS USER */
    loginAsUser: async (req, res) => {

        try {
            let login = null;
            let payload = req.body;
            let schema = Joi.object().keys({
                email: Joi.string().required()
            })

            let result = Joi.validate(payload, schema);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }

            let userResult = await knex.from('users').where({ email: payload.email }).first();
            let orgId = userResult.orgId;

            if (userResult) {

                const loginToken = jwt.sign({ id: userResult.id, orgId }, process.env.JWT_PRIVATE_KEY, { expiresIn: '7h' });

                login = { accessToken: loginToken, refreshToken: "" }
                login.user = _.omit(userResult,['password']);


                let userApplicationRole = await knex('application_user_roles').where({ userId: Number(userResult.id) }).select('roleId', 'orgId').first();

                switch (Number(userApplicationRole.roleId)) {
                    case 1:
                        login.user.isSuperAdmin = true;
                        login.user.roles = ['superAdmin'];
                        break;
                    case 2:
                        login.user.isOrgAdmin = true;
                        login.user.roles = ['orgAdmin'];
                        break;
                    case 3:
                        login.user.isOrgUser = true;
                        login.user.roles = ['orgUser'];
                        break;
                    case 4:
                        login.user.isCustomer = true;
                        login.user.roles = ['customer'];
                        break;
                }


                if (login.user.isOrgAdmin) {
                    console.log("this is orgAdmin");
                    // get all the projects of this admin
                    const projects = await knex("projects")
                        .select("id")
                        .where({ orgId });
                    const companies = await knex("companies")
                        .select("id")
                        .where({ orgId });
                    const resources = await knex(
                        "organisation_resources_master"
                    )
                        .select("resourceId as id")
                        .where({ orgId });
                    const userProjectResources = _.uniqBy(
                        resources,
                        "id"
                    ).map(v => ({
                        id: v.id,
                        projects: projects.map(v => v.id)
                    }));
                    const userCompanyResources = _.uniqBy(
                        resources,
                        "id"
                    ).map(v => ({
                        id: v.id,
                        companies: companies.map(v => v.id)
                    }));
                    //console.log(mappedProjects)
                    login.user.userCompanyResources = userCompanyResources;
                    login.user.userProjectResources = userProjectResources;
                    console.log(userCompanyResources, userProjectResources);
                }

                if (login.user.isOrgUser) {
                    const result = await knex("team_users")
                        .innerJoin(
                            "team_roles_project_master",
                            "team_users.teamId",
                            "team_roles_project_master.teamId"
                        )
                        .innerJoin(
                            "role_resource_master",
                            "team_roles_project_master.roleId",
                            "role_resource_master.roleId"
                        )
                        .select([
                            "team_roles_project_master.projectId as projectId",
                            "role_resource_master.resourceId as resourceId"
                        ])
                        .where({
                            "team_users.userId": userResult.id,
                            "team_users.orgId": orgId,
                            "team_roles_project_master.orgId": orgId
                        });

                    // let userProjectResources = result;
                    console.log('Result: ', result);

                    let userProjectResources = _.chain(result)
                        .groupBy("resourceId")
                        .map((value, key) => ({
                            id: key,
                            projects: value.map(a => a.projectId)
                        }))
                        .value();
                    login.user.userProjectResources = userProjectResources;

                }


                res.status(200).json(login)



            }





        } catch (err) {

            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    }

}

module.exports = allUsersController;
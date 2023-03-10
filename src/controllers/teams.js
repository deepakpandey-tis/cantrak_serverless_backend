const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
var arrayCompare = require("array-compare");

const knex = require('../db/knex');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const fs = require('fs')
const path = require('path')
const emailHelper = require('../helpers/email')



/* Define Controller */
const teamsController = {

    /* Define async function */
    addNewTeams: async (req, res) => {

        // Define try/catch block
        try {
            let teamsData = null;
            let teamRoleProject = null;
            let userAddTeam = null;
            let orgId = req.orgId;
            let roleProjectData = req.body.roleProjectData;
            let vendorTeam;
            await knex.transaction(async (trx) => {
                const teamsPayload = req.body;
                const payload = _.omit(req.body, ['roleProjectData'], ['roleId'], 'locationId', ['userIds'], ['vendorIds'],'filterTerm')

                console.log('[controllers][teams][addNewTeam]', teamsPayload);

                // validate keys
                const schema = Joi.object().keys({
                    teamCode: Joi.string().required(),
                    teamName: Joi.string().required(),
                    description: Joi.string().required(),
                });

                // validate params
                const result = Joi.validate(payload, schema);
                console.log('[controllers][teams][addNewTeam]: Joi Results', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATON ERRORS", message: result.error.message }
                        ]
                    });
                }

                /*CHECK DUPLICATE VALUES OPEN */
                let existValue = await knex('teams')
                    .where({ teamCode: payload.teamCode.toUpperCase(), orgId: orgId });
                if (existValue && existValue.length) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: "Team Code already exist!!" }
                        ]
                    });
                }
                /*CHECK DUPLICATE VALUES CLOSE */

                const currentTime = new Date().getTime();
                // Insert into teams table
                const insertData = { ...payload, teamCode: payload.teamCode.toUpperCase(), createdAt: currentTime, updatedAt: currentTime, createdBy: req.me.id, orgId: orgId };
                console.log('[controllers][teams][addNewTeams] : Insert Data ', insertData);

                const resultTeams = await knex.insert(insertData).returning(['*']).transacting(trx).into('teams');
                teamsData = resultTeams[0];


                /**TEAM ROLES PROJECT MASTER OPEN */
                if (roleProjectData) {

                    for (let i = 0; i < roleProjectData.length; i++) {


                        if (roleProjectData[i].locationId && roleProjectData[i].roleId) {

                            //for (let role of roleProjectData[i].roleId) {

                            let insertObject = {
                                teamId: teamsData.teamId,
                                roleId: roleProjectData[i].roleId,
                                locationId: roleProjectData[i].locationId,
                                orgId: orgId,
                                createdAt: currentTime,
                                updatedAt: currentTime
                            }


                            let checkProject = await knex.from('team_roles_project_master').where({
                                teamId: teamsData.teamId,
                                roleId: roleProjectData[i].roleId,
                                locationId: roleProjectData[i].locationId,
                                orgId: orgId,
                                createdBy: req.me.id
                            });

                            if (!checkProject.length) {

                                let insertProjectResult = await knex.insert(insertObject).returning(['*']).into('team_roles_project_master')
                                teamRoleProject = insertProjectResult
                            }
                            //}
                        } else {
                            // return res.status(400).json({
                            //     errors: [
                            //         { code: "VALIDATION_ERROR", message: "Select Project!! " }
                            //     ]
                            // });
                        }

                    }
                }
                /**TEAM ROLES PROJECT MASTER CLOSE */

                /**ADD TEAM USERS OPEN */

                for (let user of teamsPayload.userIds) {

                    let userAddTeamResult = await knex('team_users').insert({ userId: user, teamId: teamsData.teamId, createdAt: currentTime, updatedAt: currentTime, orgId: orgId }).returning(['*']);
                    userAddTeam = userAddTeamResult

                }
                /**ADD TEAM USERS CLOSE*/


                /*ADD VENDOR TO TEAM OPEN */
                for (let vendor of teamsPayload.vendorIds) {
                    let vendorAddTeam = await knex('assigned_vendors').insert({ userId: vendor, entityId: teamsData.teamId, entityType: 'teams', createdAt: currentTime, updatedAt: currentTime, orgId: orgId }).returning(['*']);
                    vendorTeam = vendorAddTeam;
                }
                /*ADD VENDOR TO TEAM CLOSE */


                /* Send email to users open */
                let Parallel = require('async-parallel')
                let users = await Parallel.map(teamsPayload.userIds, async userId => {
                    let user = await knex('users').select(['name', 'email']).where({ id: userId }).first()
                    return user
                })

                for (let user of users) {
                    // Send email now
                    await emailHelper.sendTemplateEmail({
                        to: user.email,
                        subject: 'Added to team ' + payload.teamName + ' at service mind',
                        template: 'message.ejs',
                        templateData: { fullName: user.name, message: 'You have been succesfully added to team ' + payload.teamName + ' at service mind.' ,orgId:req.orgId},
                    })
                }

                /* send email to users close */

                trx.commit;
            });


            res.status(200).json({
                data: {
                    teamsData: teamsData,
                    teamRoleProjectData: teamRoleProject,
                    userAddTeamData: userAddTeam
                },
                message: "Teams added successfully !"
            });

        } catch (err) {
            console.log('[controllers][teams][updateTeams] : Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    /* Update Teams */
    updateTeams: async (req, res) => {
        // Define try/catch block
        try {
            let teamsResponse = null;
            let upTeams = null;
            let teamRoleProject = null;
            let userAddTeam = null;
            let orgId = req.orgId;
            let roleProjectData = req.body.roleProjectData;
            let vendorTeam;
            await knex.transaction(async (trx) => {
                const upTeamsPayload = req.body;
                const payload = _.omit(req.body, ['roleId'], 'locationId', ['userIds'], ['roleProjectData'], ['vendorIds'],'filterTerm')
                console.log('[controllers][teams][updateTeams] : Request Body', upTeams);

                // validate keys
                const schema = Joi.object().keys({
                    teamId: Joi.number().required(),
                    teamName: Joi.string().required(),
                    description: Joi.string().required(),
                    teamCode: Joi.string().required(),
                });

                // validate params
                const result = Joi.validate(payload, schema);

                if (result && result.hasOwnProperty('error') && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATON ERRORS", message: result.error.message }
                        ]
                    });
                }


                /*CHECK DUPLICATE VALUES OPEN */
                let existValue = await knex('teams')
                    .where({ teamCode: payload.teamCode.toUpperCase(), orgId: req.orgId })
                    .whereNot({ teamId: upTeamsPayload.teamId });
                if (existValue && existValue.length) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: "Team Code already exist!!" }
                        ]
                    });
                }
                /*CHECK DUPLICATE VALUES CLOSE */


                const currentTime = new Date().getTime();
                // Update teams table
                updateTeams = await knex.update({ teamCode: upTeamsPayload.teamCode.toUpperCase(), teamName: upTeamsPayload.teamName, description: upTeamsPayload.description, updatedAt: currentTime }).where({ teamId: upTeamsPayload.teamId, orgId: req.orgId }).returning(['*']).transacting(trx).into('teams');
                teamsResponse = updateTeams;



                /**TEAM ROLES PROJECT MASTER OPEN */

                let deletedUsers = await knex('team_users').where({ teamId: upTeamsPayload.teamId }).del();


                if (roleProjectData) {
                    let deletedProject = await knex('team_roles_project_master').where({ teamId: upTeamsPayload.teamId }).del();
                    for (let i = 0; i < roleProjectData.length; i++) {

                        if (roleProjectData[i].roleId) {
                            //  for (let role of roleProjectData[i].roleId) {

                            let insertObject = {
                                teamId: upTeamsPayload.teamId,
                                roleId: roleProjectData[i].roleId,
                                locationId: roleProjectData[i].locationId,
                                orgId: orgId,
                                createdAt: currentTime,
                                updatedAt: currentTime
                            }


                            let checkProject = await knex.from('team_roles_project_master').where({
                                teamId: upTeamsPayload.teamId,
                                roleId: roleProjectData[i].locationId,
                                locationId: roleProjectData[i].locationId,
                                orgId: orgId
                            });

                            if (!checkProject.length) {

                                let insertProjectResult = await knex.insert(insertObject).returning(['*']).into('team_roles_project_master')
                                teamRoleProject = insertProjectResult;

                            }
                            // }
                        } else {
                            // return res.status(400).json({
                            //     errors: [
                            //         { code: "VALIDATION_ERROR", message: "Select Project & role!! " }
                            //     ]
                            // });
                        }
                    }
                }
                /**TEAM ROLES PROJECT MASTER CLOSE */

                /**ADD TEAM USERS OPEN */

                for (let user of upTeamsPayload.userIds) {

                    let userAddTeamResult = await knex('team_users').insert({ userId: user, teamId: upTeamsPayload.teamId, createdAt: currentTime, updatedAt: currentTime, orgId: orgId }).returning(['*']);
                    userAddTeam = userAddTeamResult

                }
                /**ADD TEAM USERS CLOSE*/


                let deletedTeam = await knex('assigned_vendors').where({ entityId: upTeamsPayload.teamId, entityType: 'teams' }).del();
                /*ADD VENDOR TO TEAM OPEN */
                for (let vendor of upTeamsPayload.vendorIds) {
                    let vendorAddTeam = await knex('assigned_vendors').insert({ userId: vendor, entityId: upTeamsPayload.teamId, entityType: 'teams', createdAt: currentTime, updatedAt: currentTime, orgId: orgId }).returning(['*']);
                    vendorTeam = vendorAddTeam;
                }
                /*ADD VENDOR TO TEAM CLOSE */

                trx.commit;
            });

            res.status(200).json({
                data: {
                    teamsResponse: teamsResponse,
                    teamRoleProjectData: teamRoleProject,
                    userAddTeamData: userAddTeam,
                    vendorTeam: vendorTeam,
                },
                message: "Teams updated successfully !"
            });

        } catch (err) {
            console.log('[controllers][teams][updateTeams] : Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    /* Get Teams List */
    getTeamList: async (req, res) => {
        // Define try/catch block
        try {

            let teamResult = null;

            teamResult = await knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId"  where "teams"."orgId" = ' + req.orgId + ' and "teams"."isActive"=true group by "teams"."teamId" order by "teams"."createdAt" desc');

            // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
            // teamResult = await knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" group by "teams"."teamId"');
            //console.log('[controllers][teams][getTeamList] : Team List', teamResult);
            // teamResult = { teams: teamResult.rows };


            res.status(200).json({
                data: {
                    teams: teamResult.rows
                },
                message: "Team list successfully !"
            })

        } catch (err) {
            console.log('[controllers][teams][getTeamList] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    getTeamAllList: async (req, res) => {
        // Define try/catch block
        try {
            let sortPayload = req.body;
            if (!sortPayload.sortBy && !sortPayload.orderBy) {
                sortPayload.sortBy = "teamName";
                sortPayload.orderBy = "asc"
            }
            let { teamName } = req.body;
            let teamResult = null;
            let reqData = req.query;
            let pagination = {}
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            if (teamName) {

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("teams")
                        .where({ "teams.orgId": req.orgId, })
                        .where(qb => {
                            if (teamName) {
                                qb.where('teams.teamName', 'iLIKE', `%${teamName}%`)
                            }
                        })
                        .first(),
                    // knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" where "teams"."orgId" = ' + req.orgId + ' and "teams"."teamName" = "' + String(teamName) + '" group by "teams"."teamId" limit ' + per_page + ' OFFSET ' + offset + '')
                    knex.raw(`select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" where "teams"."orgId" = '${req.orgId}' and "teams"."teamName" ilike '%${teamName}%' group by "teams"."teamId"  order by "` + sortPayload.sortBy + `"  ` + sortPayload.orderBy + `  limit '${per_page}' OFFSET '${offset}'`)
                ])

            } else {

                [total, rows] = await Promise.all([
                    knex
                        .count("* as count")
                        .from("teams")
                        .where({ "teams.orgId": req.orgId })
                        .first(),
                    knex.raw(
                        'select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" where "teams"."orgId" = ' +
                        req.orgId +
                        ' group by "teams"."teamId" order by "' + sortPayload.sortBy + '"  ' + sortPayload.orderBy + ' limit ' +
                        per_page +
                        " OFFSET " +
                        offset +
                        ""
                    )
                ]);
            }


            const Parallel = require('async-parallel');

            rows.rows = await Parallel.map(rows.rows, async st => {

                let people = 0;

                let vendorResult = await knex('assigned_vendors').count('*').where({ "entityId": st.teamId, "entityType": 'teams', orgId: req.orgId }).first();

                if (vendorResult) {
                    people = Number(st.people) + Number(vendorResult.count);
                } else {
                    people = st.people;
                }

                return {
                    ...st,
                    people: people
                }
            })


            // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
            // teamResult = await knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" group by "teams"."teamId"');
            //console.log('[controllers][teams][getTeamList] : Team List', teamResult);
            // teamResult = { teams: teamResult.rows };
            let count = total.count;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            pagination.data = rows.rows;

            res.status(200).json({
                data: {
                    teamData: pagination
                },
                message: "Team list successfully !"
            })

        } catch (err) {
            console.log('[controllers][teams][getTeamList] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    /* Update Team Users */
    addTeamUsers: async (req, res) => {
        // Define try/catch block
        try {
            let updateUser = null;
            let orgId = req.orgId
            const { teamId, userIds, locationId, roleId } = req.body;
            console.log('[controllers][teams][updateroles]: UpdateUserRole', userIds, teamId);

            // get User Id List

            let userAssignedTeam = await knex('team_users').where({ teamId: teamId }).select('userId');
            userAssignedTeam = userAssignedTeam.map(team => team.userId);
            console.log('[controllers][teams][updateteams]: DB', userAssignedTeam);
            console.log('[controllers][teams][updateteams]: Inputs', userIds);

            const compareData = arrayCompare(userAssignedTeam, userIds);

            compareData.missing = compareData.missing.map(a => a.a);
            console.log('[controllers][teams][updateteams]: Compare Missing', compareData.missing);

            compareData.added = compareData.added.map(b => b.b);
            console.log('[controllers][teams][updateteams]: Compare Added', compareData.added);

            const Parallel = require('async-parallel');

            const currentTime = new Date().getTime();

            await Parallel.map(compareData.missing, async items => {
                deletedUsers = await knex('team_users').where({ userId: items, teamId: teamId }).del();
                return deletedUsers;
            });

            await Parallel.map(compareData.added, async item => {
                console.log("response", item);
                updateUser = await knex('team_users').insert({ userId: item, teamId: teamId, createdAt: currentTime, updatedAt: currentTime, orgId: orgId }).returning(['*']);
                return updateUser;
            });


            console.log('[controllers][teams][updateteams]: results', compareData);

            res.status(200).json({
                data: updateUser,
                message: "Team users updated successfully"
            })


        } catch (err) {
            console.log('[controllers][teams][updateMembers] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOW_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

    /* Get Assigned Teams */
    getAssignedTeams: async (req, res) => {
        // Define try/catch block
        try {
            let assignedTeams = null;
            let teamResult = null;
            let requestId = req.query.id;
            let addtionalUsers = null;
            // Get assign teams & main user
            assignedTeams = await knex('assigned_service_team').leftJoin('teams', 'assigned_service_team.teamId', '=', 'teams.teamId').leftJoin('users', 'assigned_service_team.userId', '=', 'users.id').leftJoin('user_roles', 'assigned_service_team.userId', '=', 'user_roles.userId').leftJoin('roles', 'user_roles.roleId', '=', 'roles.id').select('assigned_service_team.id', 'teams.teamName as assignTeam', 'users.name as assignedMainUsers', 'roles.name as userRole').where({ 'assigned_service_team.entityId': requestId });
            console.log('[controllers][teams][getTeamList] : Team List', assignedTeams);
            assignedTeams = _.omit(assignedTeams[0], ['id']);
            // Get addtional User list
            addtionalUser = await knex('assigned_service_additional_users').leftJoin('team_users', 'assigned_service_additional_users.userId', '=', 'team_users.userId').leftJoin('users', 'assigned_service_additional_users.userId', '=', 'users.id').leftJoin('user_roles', 'assigned_service_additional_users.userId', '=', 'user_roles.userId').leftJoin('roles', 'user_roles.roleId', '=', 'roles.id').select('assigned_service_additional_users.id', 'users.name as addtionalUsers', 'roles.name as userRole').where({ 'assigned_service_additional_users.entityId': requestId });
            console.log('[controllers][teams][getTeamList] : Addtional Users List', addtionalUser);
            assignedTeams.addtinalUserList = addtionalUser;

            teamResult = { 'teams': assignedTeams };

            res.status(200).json({
                data: teamResult,
                message: "Assigned teams list successfully !"
            })

        } catch (err) {
            console.log('[controllers][teams][getAssignedTeams] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
        // Export Team Data 
    },

    getAssignedTeamAndUsers: async (req, res) => {
        try {
            const entityId = req.body.entityId;
            const entityType = req.body.entityType;

            console.log('entityId:', entityId, 'entityType:', entityType);

            const team = await knex('assigned_service_team').select(['teamId', 'userId as mainUserId']).where({ entityId: entityId, entityType: entityType })

            let additionalUsers = await knex('assigned_service_additional_users').select(['userId']).where({ entityId: entityId, entityType: entityType })


            return res.status(200).json({
                data: {
                    team,
                    additionalUsers
                }
            })

        } catch (err) {
            console.error('Error:', err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },


    getAssignedTeamAndUsersForOther: async (req, res) => {
        try {
            const entityId = req.body.entityId;
            const entityType = req.body.entityType;

            console.log('entityId:', entityId, 'entityType:', entityType);

            const team = await knex('assigned_service_team')
                .select(['assigned_service_team.teamId', 'teams.teamName as Team', 'users.name as MainUser', 'assigned_service_team.userId as mainUserId'])
                .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
                .leftJoin("users", "assigned_service_team.userId", "users.id")
                .where({ entityId: entityId, entityType: entityType })


            // let additionalUsers = await knex('assigned_service_additional_users')
            //   .select(['userId']).where({ entityId: entityId, entityType: entityType })

            let othersUserData = await knex.raw(`select "assigned_service_additional_users"."userId" as "userId","users"."name" as "addUsers","users"."email" as "email", "users"."mobileNo" as "mobileNo" from "assigned_service_additional_users" left join "users" on "assigned_service_additional_users"."userId" = "users"."id" where "assigned_service_additional_users"."orgId" = ${req.orgId} and "assigned_service_additional_users"."entityId" = ${entityId} and "assigned_service_additional_users"."entityType"='${entityType}'`)
            let additionalUsers = othersUserData.rows;


            return res.status(200).json({
                data: {
                    team,
                    additionalUsers
                }
            })

        } catch (err) {
            console.error('Error:', err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },


    exportTeams: async (req, res) => {

        try {
            let rows = null;
            let teamResult = null;
            let orgId = req.orgId;

            [rows] = await Promise.all([

                knex("teams")
                    .leftJoin("team_roles_project_master", "teams.teamId", "team_roles_project_master.teamId")
                    .leftJoin("projects", "team_roles_project_master.locationId", "projects.id")
                    .leftJoin("companies", "projects.companyId", "companies.id")
                    .leftJoin("users", "teams.createdBy", "users.id")
                    .leftJoin("organisation_roles", "team_roles_project_master.roleId", "organisation_roles.id")
                    .where({ "teams.orgId": orgId })
                    .select([
                        "teams.teamCode as TEAM_CODE",
                        "teams.teamName as TEAM_NAME",
                        "teams.description as TEAM_ALTERNATE_NAME",
                        //"companies.companyId as COMPANY_ID",
                        "projects.project as PROJECT_CODE",
                        "organisation_roles.name as ROLE_NAME"
                    ])
            ]);

            let tempraryDirectory = null;
            let bucketName = null;
            if (process.env.IS_OFFLINE) {
                bucketName = process.env.S3_BUCKET_NAME;
                tempraryDirectory = 'tmp/';
            } else {
                tempraryDirectory = '/tmp/';
                bucketName = process.env.S3_BUCKET_NAME;
            }
            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
            var ws;
            if (rows && rows.length) {
                ws = XLSX.utils.json_to_sheet(rows);
            } else {
                ws = XLSX.utils.json_to_sheet([{
                    TEAM_CODE: "",
                    TEAM_NAME: "",
                    TEAM_CODE: "",
                    TEAM_ALTERNATE_NAME: "",
                    PROJECT_CODE: "",
                    ROLE_NAME: ""
                }]);
            }
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: 'base64' })
            let filename = "TeamData-" + Date.now() + ".csv";
            let filepath = tempraryDirectory + filename;
            let check = XLSX.writeFile(wb, filepath);
            const AWS = require('aws-sdk');

            fs.readFile(filepath, function (err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/Team/" + filename,
                    Body: file_buffer,
                    ACL: 'public-read'
                }
                s3.putObject(params, function (err, data) {
                    if (err) {
                        console.log("Error at uploadCSVFileOnS3Bucket function", err);
                        res.status(500).json({
                            errors: [
                                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                            ]
                        });
                        //next(err);
                    } else {
                        console.log("File uploaded Successfully");
                        //next(null, filePath);
                        let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
                        let url = process.env.S3_BUCKET_URL + "/Export/Team/" +
                            filename;
                        //let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Team/" + filename;
                        res.status(200).json({
                            data: teamResult,
                            message: "Team Data Export Successfully",
                            url: url
                        })
                    }
                });
            })


        } catch (err) {
            console.log('[controllers][teams][getTeamList] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },
    getMainAndAdditionalUsersByTeamId: async (req, res) => {
        try {
            let vendorUsers = [];
            let teamId = req.body.teamId;
            let mainUsers = await knex('team_users').innerJoin('users', 'team_users.userId', 'users.id').select(['users.id as id', 'users.name as name']).where({ 'team_users.teamId': teamId, 'users.orgId': req.orgId })
            let additionalUsers = await knex('users').select(['id', 'name']).where({ orgId: req.orgId });
            vendorUsers = await knex('assigned_vendors')
                .innerJoin('users', 'assigned_vendors.userId', 'users.id')
                .select([
                    'users.id as id',
                    'users.name as name'
                ])
                .where({ "assigned_vendors.entityId": teamId, "assigned_vendors.entityType": 'teams', 'assigned_vendors.orgId': req.orgId });

            mainUsers = mainUsers.concat(vendorUsers);

            //additionalUsers = additionalUsers.map(user => _.omit(user, ['password','username']))

            // const Parallel = require('async-parallel')
            // const usersWithRoles = await Parallel.map(additionalUsers, async user => {
            //     const roles = await knex('organisation_user_roles').select('roleId').where({ userId: user.id, orgId: req.orgId });
            //     const roleNames = await Parallel.map(roles, async role => {
            //         const roleNames = await knex('organisation_roles').select('name').where({ id: role.roleId, orgId: req.orgId }).whereNotIn('name', ['superAdmin', 'admin', 'customer'])
            //         return roleNames.map(role => role.name).join(',')
            //     })
            //     return { ...user, roleNames: roleNames.filter(v => v).join(',') };
            // })

            res.status(200).json({
                data: {
                    mainUsers,
                    additionalUsers: mainUsers,
                }
            });

        } catch (err) {
            console.log('[controllers][teams][getAssignedTeams] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },
    // GET TEAM DETAILS
    getTeamDetails: async (req, res) => {
        try {
            let teamId = req.query.teamId;
            let teamResult = null;
            let userResult = null;
            let locationResult = null;
            let vendorResult = null;

            console.log("==== GROWINGLOCATION ====", req.GROWINGLOCATION);

            [teamResult, userResult, locationResult, vendorResult] = await Promise.all([

                knex('teams').select([
                    'teams.teamId',
                    'teams.teamName',
                    'teams.description',
                    'teams.teamCode',
                    'teams.isActive'
                ])
                    .where({ 'teams.teamId': teamId }).returning('*'),

                knex('team_users')
                    .leftJoin('users', 'team_users.userId', 'users.id')
                    .select([
                        'users.id',
                        'users.name',
                        'users.email',
                        'team_users.userId as userIds',
                    ])
                    .where({ 'team_users.teamId': teamId }).returning('*'),

                knex('team_roles_project_master')
                    .leftJoin('locations', 'team_roles_project_master.locationId', 'locations.id')
                    .leftJoin('organisation_roles', 'team_roles_project_master.roleId', 'organisation_roles.id')
                    .select([
                        'team_roles_project_master.locationId',
                        'team_roles_project_master.roleId',
                        'locations.name as locationName',
                        'organisation_roles.name as roleName',
                        'locations.description as locationDescription'
                    ])
                    .where({ 'team_roles_project_master.teamId': teamId }).returning('*'),
                knex('assigned_vendors')
                    .leftJoin('users', 'assigned_vendors.userId', 'users.id')
                    .select('assigned_vendors.userId', 'users.name', 'users.email')
                    .where({ 'entityId': teamId, 'entityType': 'teams' }).returning('*'),
            ])


            let locationsUpdateDetails = _.compact(locationResult.map((value, key) => ({ roleId: value.roleId, locationId: value.locationId })))

            let vendorIds = vendorResult.map(v => v.userId)

            //            let projectUpdateDetails = _.chain(projectResult).groupBy("locationId").map((value, key) => ({ roleId: value.map(a => a.roleId), locationId: key })).value();

            res.status(200).json({
                data: {
                    teamDetails: { ...teamResult[0], usersData: userResult, locationData: locationResult, locationsUpdateDetails: locationsUpdateDetails, vendorIds: vendorIds, vendorData: vendorResult },
                },
                message: "Team Details Successfully"
            })


        } catch (err) {
            console.log('[controllers][teams][getTeamDetails] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },
    removeTeam: async (req, res) => {
        try {
            let team = null;
            let message;
            await knex.transaction(async trx => {
                let peoplePayload = req.body;
                let id = req.body.id
                const schema = Joi.object().keys({
                    id: Joi.string().required()
                })
                const result = Joi.validate(peoplePayload, schema);
                console.log('[controllers][people][removePeople]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime();
                let checkStatus = await knex.from('teams').where({ teamId: id }).returning(['*']);

                if (checkStatus.length) {

                    if (checkStatus[0].isActive == true) {

                        let teamData = await knex.update({ isActive: false, updatedAt: currentTime }).where({ teamId: id }).returning(['*']).transacting(trx).into('teams');
                        team = teamData[0];
                        message = "Team Deactivate Successfully!";

                    } else {

                        let teamData = await knex.update({ isActive: true, updatedAt: currentTime }).where({ teamId: id }).returning(['*']).transacting(trx).into('teams');
                        team = teamData[0];
                        message = "Team Activate Successfully!";
                    }
                }

                trx.commit
            })
            res.status(200).json({
                data: {
                    team: team
                },
                message: message
            });
        } catch (err) {

        }
    },
    /**IMPORT TEAM DATA */
    importTeamData: async (req, res) => {

        try {

            let data = req.body;
            let totalData = data.length - 1;
            let fail = 0;
            let success = 0;
            let projectSuccess = 0;
            let projectFail = 0;
            console.log("=======", data[0], "+++++++++++++++")
            let result = null;
            let errors = []
            let header = Object.values(data[0]);
            header.unshift('Error');
            errors.push(header)

            if (data[0].A == "????????????TEAM_CODE" || data[0].A == "TEAM_CODE" &&
                data[0].B == "TEAM_NAME" &&
                data[0].C == "TEAM_ALTERNATE_NAME" &&
                data[0].D == "PROJECT_CODE" &&
                data[0].E == "ROLE_NAME"
            ) {

                if (data.length > 0) {

                    let i = 0;
                    let currentTime = new Date().getTime();
                    for (let teamData of data) {
                        i++;

                        if (i > 1) {


                            /**GET PROJECT ID OPEN */
                            let locationId = null;
                            if (teamData.D) {
                                let projectData = await knex('projects').select('id').where({ project: teamData.D.toUpperCase(), orgId: req.orgId });

                                if (projectData && projectData.length) {
                                    locationId = projectData[0].id
                                }
                            }
                            /**GET PROJECT ID CLOSE */


                            /**GET ROLE ID OPEN */
                            let roleId = null;
                            if (teamData.E) {
                                let roleData = await knex('organisation_roles').select('id').where({ name: teamData.E, orgId: req.orgId });
                                if (roleData && roleData.length) {
                                    roleId = roleData[0].id
                                }
                            }
                            /**GET ROLE ID CLOSE */


                            let checkExist = await knex('teams').select("teamId")
                                .where({ teamCode: teamData.A.toUpperCase(), orgId: req.orgId })
                            if (checkExist.length < 1) {
                                let insertData = {
                                    orgId: req.orgId,
                                    teamName: teamData.B,
                                    teamCode: teamData.A.toUpperCase(),
                                    description: teamData.C,
                                    createdAt: currentTime,
                                    updatedAt: currentTime,
                                    createdBy: req.me.id,
                                }
                                resultData = await knex.insert(insertData).returning(['*']).into('teams');

                                if (resultData && resultData.length) {
                                    success++;
                                }
                                let teamId = resultData[0].teamId;

                                if (locationId && roleId) {
                                    let checkRoleMaster = await knex('team_roles_project_master').select("id")
                                        .where({ teamId: teamId, locationId: locationId, orgId: req.orgId, roleId: roleId })

                                    if (!checkRoleMaster.length) {

                                        let insertProjectData = {
                                            orgId: req.orgId,
                                            teamId: teamId,
                                            locationId: locationId,
                                            createdAt: currentTime,
                                            updatedAt: currentTime,
                                            roleId: roleId,
                                            createdBy: req.me.id
                                        }
                                        resultProjectData = await knex.insert(insertProjectData).returning(['*']).into('team_roles_project_master');

                                        if (resultProjectData && resultProjectData.length) {
                                            //success++;
                                        }
                                    } else {
                                        // let values = _.values(teamData)
                                        // values.unshift('This project & team role already exists')
                                        // errors.push(values);
                                        // fail++;
                                    }
                                }


                            } else {


                                if (locationId && roleId) {


                                    let checkRoleMaster = await knex('team_roles_project_master').select("id")
                                        .where({ teamId: checkExist[0].teamId, locationId: locationId, orgId: req.orgId, roleId: roleId })
                                    if (!checkRoleMaster.length) {
                                        let insertProjectData = {
                                            orgId: req.orgId,
                                            teamId: checkExist[0].teamId,
                                            locationId: locationId,
                                            createdAt: currentTime,
                                            updatedAt: currentTime,
                                            roleId: roleId,
                                            createdBy: req.me.id
                                        }
                                        resultProjectData = await knex.insert(insertProjectData).returning(['*']).into('team_roles_project_master');
                                        if (resultProjectData && resultProjectData.length) {

                                            let values = _.values(teamData)
                                            values.unshift('Team Code already exists, added role project')
                                            errors.push(values);
                                            success++;
                                        }
                                    } else {

                                        let values = _.values(teamData)
                                        values.unshift('Team Code & project role already exists')
                                        errors.push(values);
                                        fail++;
                                    }
                                } else {
                                    let values = _.values(teamData)
                                    values.unshift('Team Code already exists')
                                    errors.push(values);
                                    fail++;
                                }
                            }
                        }

                    }

                    let message = null;
                    if (totalData == success) {
                        message = "System has processed ( " + totalData + " ) entries and added them successfully!";
                    } else {
                        message = "System has processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
                    }

                    return res.status(200).json({
                        message: message,
                        errors: errors
                    });

                }

            } else {

                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
                    ]
                });
            }

        } catch (err) {
            console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /* Get Teams List By Project */
    getTeamListByProject: async (req, res) => {

        try {

            let teamResult = null;
            let teamPayload = req.body;

            const schema = Joi.object().keys({
                locationId: Joi.number().required(),
                resourceId: Joi.number().required()
            })
            const result = Joi.validate(teamPayload, schema);

            console.log('[controllers][team][teamPeople]: JOi Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }


            let resourceData = await knex.from("role_resource_master")
                .select('roleId')
                .where("role_resource_master.resourceId", teamPayload.resourceId)

            let roleIds = resourceData.map(v => v.roleId) //


            teamResult = await knex('team_roles_project_master')
                .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
                .select([
                    'teams.teamName',
                    'teams.teamId'
                ])
                .where({ 'team_roles_project_master.locationId': teamPayload.locationId, 'teams.isActive': true })
                .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

            res.status(200).json({
                data: {
                    teams: teamResult
                },
                message: "Team list successfully !"
            })

        } catch (err) {
            console.log('[controllers][teams][getTeamList] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },
    getAssignedTeamByMultipleProjects: async (req, res) => {
        try {
            let locationId = req.body
            let orgId = req.orgId

            let teams = await knex("team_roles_project_master")
                .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
                .select(['teams.teamName',
                    'teams.teamId'
                ])
                .whereIn("team_roles_project_master.locationId", locationId)
                .distinct()

            res.status(200).json({
                data: {
                    teams: teams
                },
                message: "Team list successfully !"
            })


        } catch (err) {

            console.log('[controllers][teams][getTeamList] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });

        }
    },

    getTeamUsersByMultipleTeamId: async (req, res) => {
        try {
            let teamId = req.body

            let teamUser = await knex("team_users")
                .leftJoin("users", "team_users.userId", "users.id")
                .select(["team_users.id", "users.name", "users.id as userId"])
                .whereIn("team_users.teamId", teamId)
                .groupBy(["team_users.id", "users.id"])
                .distinct()

            let users = _.uniqBy(teamUser, "userId")

            res.status(200).json({
                data: {
                    teamUsers: users
                },
                message: "Team user list !"
            })

        } catch (err) {

            console.log('[controllers][teams][getTeamUser] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });


        }
    },

    getTeamByEntity: async (req, res) => {
        try {
            const { entityId, entityType } = req.body;
            let so
            let sr
            switch (entityType) {
                case 'service_requests':
                    sr = await knex('service_requests').select('projectId').where({ id: entityId }).first()
                    if (sr) {
                        let resourceData = await knex.from("role_resource_master")
                            .select('roleId')
                            .where("role_resource_master.resourceId", '2')

                        let roleIds = resourceData.map(v => v.roleId) //

                        teamResult = await knex('team_roles_project_master')
                            .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
                            .select([
                                'teams.teamName',
                                'teams.teamId'
                            ])
                            .where({ 'team_roles_project_master.locationId': sr.locationId, 'teams.isActive': true })
                            .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

                        return res.status(200).json({
                            data: {
                                teams: _.uniqBy(teamResult, "teamId")
                            }
                        })
                    } else {
                        return res.status(200).json({
                            data: {
                                teams: []
                            }
                        })
                    }
                case 'service_orders':
                    so = await knex('service_orders')
                        .innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                        .select('service_requests.projectId')
                        .where({ 'service_orders.id': entityId })
                        .first()


                    if (so) {
                        let resourceData = await knex.from("role_resource_master")
                            .select('roleId')
                            .where("role_resource_master.resourceId", '2')

                        let roleIds = resourceData.map(v => v.roleId) //

                        teamResult = await knex('team_roles_project_master')
                            .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
                            .select([
                                'teams.teamName',
                                'teams.teamId'
                            ])
                            .where({ 'team_roles_project_master.locationId': so.locationId, 'teams.isActive': true })
                            .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

                        return res.status(200).json({
                            data: {
                                teams: _.uniqBy(teamResult, "teamId")
                            }
                        })
                    } else {
                        return res.status(200).json({
                            data: {
                                teams: []
                            }
                        })
                    }
                case 'survey_orders':
                    so = await knex('survey_orders')
                        .innerJoin('service_requests', 'survey_orders.serviceRequestId', 'service_requests.id')
                        .select('service_requests.projectId')
                        .where({ 'survey_orders.id': entityId })
                        .first()

                    if (so) {
                        let resourceData = await knex.from("role_resource_master")
                            .select('roleId')
                            .where("role_resource_master.resourceId", '2')

                        let roleIds = resourceData.map(v => v.roleId) //

                        teamResult = await knex('team_roles_project_master')
                            .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
                            .select([
                                'teams.teamName',
                                'teams.teamId'
                            ])
                            .where({ 'team_roles_project_master.locationId': so.locationId, 'teams.isActive': true })
                            .whereIn("team_roles_project_master.roleId", roleIds).returning('*')

                        return res.status(200).json({
                            data: {
                                teams: _.uniqBy(teamResult, "teamId")
                            }
                        })
                    } else {
                        return res.status(200).json({
                            data: {
                                teams: []
                            }
                        })
                    }
                default:
                    return res.status(200).json({
                        data: {
                            teams: []
                        }
                    })
            }

        } catch (err) {
            console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    disableLogin: async (req, res) => {
        try {
            let team = null;
            let message;
            await knex.transaction(async trx => {
                let peoplePayload = req.body;
                let id = req.body.id
                const schema = Joi.object().keys({
                    id: Joi.string().required()
                })
                const result = Joi.validate(peoplePayload, schema);
                console.log('[controllers][team][disableLogin]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime();
                let checkStatus = await knex.from('teams').where({ teamId: id }).returning(['*']);

                if (checkStatus.length) {

                    if (checkStatus[0].disableLogin == true) {

                        let teamData = await knex.update({ disableLogin: false, updatedAt: currentTime }).where({ teamId: id }).returning(['*']).transacting(trx).into('teams');
                        team = teamData[0];
                        message = "Disable Login Deactivate Successfully!";

                    } else {

                        let teamData = await knex.update({ disableLogin: true, updatedAt: currentTime }).where({ teamId: id }).returning(['*']).transacting(trx).into('teams');
                        team = teamData[0];
                        message = "Disable Login Activate Successfully!";
                    }
                }

                trx.commit
            })
            res.status(200).json({
                data: {
                    team: team
                },
                message: message
            });
        } catch (err) {

        }
    },

    /*GET ADDITIONAL USER BY MAIN ID  */
    getAdditionalUsersByMainId: async (req, res) => {

        console.log("req.body for main user Id",req.body)
        try {
            let vendorUsers = [];
            let teamId = req.body.teamId;
            let mainId = req.body.mainId;
            let mainUsers = await knex('team_users').innerJoin('users', 'team_users.userId', 'users.id').select(['users.id as id', 'users.name as name'])
                .where({ 'team_users.teamId': teamId, 'users.orgId': req.orgId })
                .whereNot({ 'team_users.userId': mainId });
            vendorUsers = await knex('assigned_vendors')
                .innerJoin('users', 'assigned_vendors.userId', 'users.id')
                .select([
                    'users.id as id',
                    'users.name as name'
                ])
                .where({ "assigned_vendors.entityId": teamId, "assigned_vendors.entityType": 'teams', 'assigned_vendors.orgId': req.orgId })
                .whereNot({ 'assigned_vendors.userId': mainId });

            mainUsers = mainUsers.concat(vendorUsers);

            res.status(200).json({
                data: {
                    additionalUsers: mainUsers,
                }
            });

        } catch (err) {
            console.log('[controllers][teams][getAssignedTeams] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }
    },

}

module.exports = teamsController;
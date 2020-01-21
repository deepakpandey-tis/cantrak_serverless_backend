const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
var arrayCompare = require("array-compare");

const knex = require('../db/knex');
const XLSX = require('xlsx');
const bcrypt = require('bcrypt');
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
            await knex.transaction(async (trx) => {
                const teamsPayload = req.body;
                const payload = _.omit(req.body, ['roleProjectData'], ['roleId'], 'projectId', ['userIds'])

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
                    .where({ teamCode: payload.teamCode, orgId: orgId });
                if (existValue && existValue.length) {
                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: "Team Id already exist!!" }
                        ]
                    });
                }
                /*CHECK DUPLICATE VALUES CLOSE */

                const currentTime = new Date().getTime();
                // Insert into teams table
                const insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime, createdBy: 1, orgId: orgId };
                console.log('[controllers][teams][addNewTeams] : Insert Data ', insertData);

                const resultTeams = await knex.insert(insertData).returning(['*']).transacting(trx).into('teams');
                teamsData = resultTeams[0];


                /**TEAM ROLES PROJECT MASTER OPEN */
                if (roleProjectData) {

                    for (let i = 0; i < roleProjectData.length; i++) {


                        if (roleProjectData[i].projectId) {

                            for (let role of roleProjectData[i].roleId) {

                                let insertObject = {
                                    teamId: teamsData.teamId,
                                    roleId: role,
                                    projectId: roleProjectData[i].projectId,
                                    orgId: orgId,
                                    createdAt: currentTime,
                                    updatedAt: currentTime
                                }

                                let insertProjectResult = await knex.insert(insertObject).returning(['*']).into('team_roles_project_master')
                                teamRoleProject = insertProjectResult

                            }
                        } else {
                            return res.status(400).json({
                                errors: [
                                    { code: "VALIDATION_ERROR", message: "Select Project!! " }
                                ]
                            });
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
                        templateData: { fullName: user.name, message: 'You have been succesfully added to team ' + payload.teamName + ' at service mind.' },
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
            await knex.transaction(async (trx) => {
                const upTeamsPayload = req.body;
                const payload = _.omit(req.body, ['roleId'], 'projectId', ['userIds'], ['roleProjectData'])
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
                            { code: "VALIDATON ERRORS", message: result.message.error }
                        ]
                    });
                }

                const currentTime = new Date().getTime();
                // Update teams table
                updateTeams = await knex.update({ teamCode: upTeamsPayload.teamCode, teamName: upTeamsPayload.teamName, description: upTeamsPayload.description, updatedAt: currentTime }).where({ teamId: upTeamsPayload.teamId, orgId: req.orgId }).returning(['*']).transacting(trx).into('teams');
                teamsResponse = updateTeams;



                /**TEAM ROLES PROJECT MASTER OPEN */

                let deletedUsers = await knex('team_users').where({ teamId: upTeamsPayload.teamId }).del();


                if (roleProjectData) {
                    let deletedProject = await knex('team_roles_project_master').where({ teamId: upTeamsPayload.teamId }).del();
                    for (let i = 0; i < roleProjectData.length; i++) {

                        if (roleProjectData[i].projectId) {
                            for (let role of roleProjectData[i].roleId) {

                                let insertObject = {
                                    teamId: upTeamsPayload.teamId,
                                    roleId: role,
                                    projectId: roleProjectData[i].projectId,
                                    orgId: orgId,
                                    createdAt: currentTime,
                                    updatedAt: currentTime
                                }

                                let insertProjectResult = await knex.insert(insertObject).returning(['*']).into('team_roles_project_master')
                                teamRoleProject = insertProjectResult
                            }
                        } else {
                            return res.status(400).json({
                                errors: [
                                    { code: "VALIDATION_ERROR", message: "Select Project!! " }
                                ]
                            });
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

                trx.commit;
            });

            res.status(200).json({
                data: {
                    teamsResponse: teamsResponse,
                    teamRoleProjectData: teamRoleProject,
                    userAddTeamData: userAddTeam
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

            teamResult = await knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId"  where "teams"."orgId" = ' + req.orgId + ' group by "teams"."teamId" order by "teams"."createdAt" desc');



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
                    knex.raw(`select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" where "teams"."orgId" = '${req.orgId}' and "teams"."teamName" ilike '%${teamName}%' group by "teams"."teamId" limit '${per_page}' OFFSET '${offset}'`)
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
                        ' group by "teams"."teamId" limit ' +
                        per_page +
                        " OFFSET " +
                        offset +
                        ""
                    )
                ]);
            }

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
            const { teamId, userIds, projectId, roleId } = req.body;
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
    exportTeams: async (req, res) => {

        try {
            let rows = null;
            let teamResult = null;
            let orgId = req.orgId;

            [rows] = await Promise.all([

                knex("teams")
                    .leftJoin("team_roles_project_master", "teams.teamId", "team_roles_project_master.teamId")
                    .leftJoin("projects", "team_roles_project_master.projectId", "projects.id")
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
                bucketName = 'sls-app-resources-bucket';
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
                ws = XLSX.utils.json_to_sheet([
                    {
                        TEAM_CODE: "",
                        TEAM_NAME: "",
                        TEAM_CODE: "",
                        TEAM_ALTERNATE_NAME: "",
                        PROJECT_CODE: "",
                        ROLE_NAME: ""
                    }
                ]);
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
                        let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Team/" + filename;
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
            let teamId = req.body.teamId;
            let mainUsers = await knex('team_users').innerJoin('users', 'team_users.userId', 'users.id').select(['users.id as id', 'users.name as name']).where({ 'team_users.teamId': teamId, 'users.orgId': req.orgId })
            let additionalUsers = await knex('users').select(['id', 'name']).where({ orgId: req.orgId })
            //additionalUsers = additionalUsers.map(user => _.omit(user, ['password','username']))

            const Parallel = require('async-parallel')
            const usersWithRoles = await Parallel.map(additionalUsers, async user => {
                const roles = await knex('organisation_user_roles').select('roleId').where({ userId: user.id, orgId: req.orgId });
                const roleNames = await Parallel.map(roles, async role => {
                    const roleNames = await knex('organisation_roles').select('name').where({ id: role.roleId, orgId: req.orgId }).whereNotIn('name', ['superAdmin', 'admin', 'customer'])
                    return roleNames.map(role => role.name).join(',')
                })
                return { ...user, roleNames: roleNames.filter(v => v).join(',') };
            })

            res.status(200).json({
                data: {
                    mainUsers,
                    additionalUsers: mainUsers
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
            let projectResult = null;



            [teamResult, userResult, projectResult] = await Promise.all([

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
                    .leftJoin('projects', 'team_roles_project_master.projectId', 'projects.id')
                    .leftJoin('organisation_roles', 'team_roles_project_master.roleId', 'organisation_roles.id')
                    .select([
                        'team_roles_project_master.projectId',
                        'team_roles_project_master.roleId',
                        'projects.projectName',
                        'organisation_roles.name as roleName'
                    ])
                    .where({ 'team_roles_project_master.teamId': teamId }).returning('*')
            ])


            let projectUpdateDetails = _.chain(projectResult).groupBy("projectId").map((value, key) => ({ roleId: value.map(a => a.roleId), projectId: key })).value();

            res.status(200).json({
                data: {
                    teamDetails: { ...teamResult[0], usersData: userResult, projectData: projectResult, projectUpdateDetails: projectUpdateDetails },
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
                let checkStatus = await knex.from('teams').where({ teamId:id }).returning(['*']);

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
            if (req.file) {
                let tempraryDirectory = null;
                if (process.env.IS_OFFLINE) {
                    tempraryDirectory = 'tmp/';
                } else {
                    tempraryDirectory = '/tmp/';
                }
                let resultData = null;
                let file_path = tempraryDirectory + req.file.filename;
                let wb = XLSX.readFile(file_path, { type: 'binary' });
                let ws = wb.Sheets[wb.SheetNames[0]];
                let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });

                let totalData = data.length - 1;
                let fail = 0;
                let success = 0;
                let projectSuccess = 0;
                let projectFail = 0;
                console.log("=======", data[0], "+++++++++++++++")
                let result = null;

                if (data[0].A == "Ã¯Â»Â¿TEAM_CODE" || data[0].A == "TEAM_CODE" &&
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

                            /**GET COMPANY ID OPEN */
                            //let companyData = await knex('companies').select('id').where({companyId: teamData.E});
                            // let companyId   = null;
                            //   if(!companyData && !companyData.length){
                            //     continue;
                            //   } 
                            //if(companyData && companyData.length){
                            //companyId    = companyData[0].id
                            //}
                            /**GET COMPANY ID CLOSE */

                            /**GET PROJECT ID OPEN */
                            let projectId = null;
                            if (teamData.D) {
                                let projectData = await knex('projects').select('id').where({ project: teamData.D, orgId: req.orgId });

                                //   if(!projectData && !projectData.length){
                                //     continue;
                                //   } 
                                if (projectData && projectData.length) {
                                    projectId = projectData[0].id
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


                            if (i > 1) {

                                let checkExist = await knex('teams').select("teamId")
                                    .where({ teamCode: teamData.A, orgId: req.orgId })
                                if (checkExist.length < 1) {
                                    let insertData = {
                                        orgId: req.orgId,
                                        teamName: teamData.B,
                                        teamCode: teamData.A,
                                        description: teamData.C,
                                        createdAt: currentTime,
                                        updatedAt: currentTime,
                                    }
                                    resultData = await knex.insert(insertData).returning(['*']).into('teams');

                                    if (resultData && resultData.length) {
                                        success++;
                                    }
                                    let teamId = resultData[0].teamId;

                                    if (projectId && roleId) {
                                        let checkRoleMaster = await knex('team_roles_project_master').select("id")
                                            .where({ teamId: teamId, projectId: projectId, orgId: req.orgId, roleId: roleId })

                                        if (checkRoleMaster.length < 1) {

                                            let insertProjectData = {
                                                orgId: req.orgId,
                                                teamId: teamId,
                                                projectId: projectId,
                                                createdAt: currentTime,
                                                updatedAt: currentTime,
                                                roleId: roleId,
                                                createdBy: req.me.id
                                            }
                                            resultProjectData = await knex.insert(insertProjectData).returning(['*']).into('team_roles_project_master');

                                            if (resultProjectData && resultProjectData.length) {
                                                success++;
                                            }
                                        } else {
                                            fail++;
                                        }
                                    }


                                } else {


                                    if (projectId && roleId) {


                                        let checkRoleMaster = await knex('team_roles_project_master').select("id")
                                            .where({ teamId: checkExist[0].teamId, projectId: projectId, orgId: req.orgId, roleId: roleId })
                                        if (checkRoleMaster.length < 1) {
                                            let insertProjectData = {
                                                orgId: req.orgId,
                                                teamId: checkExist[0].teamId,
                                                projectId: projectId,
                                                createdAt: currentTime,
                                                updatedAt: currentTime,
                                                roleId: roleId,
                                                createdBy: req.me.id
                                            }
                                            resultProjectData = await knex.insert(insertProjectData).returning(['*']).into('team_roles_project_master');
                                            if (resultProjectData && resultProjectData.length) {
                                                success++;
                                            }
                                        } else {
                                            fail++;
                                        }
                                    }
                                    fail++;
                                }
                            }

                        }

                        let message = null;
                        if (totalData == success) {
                            message = "System has processed ( " + totalData + " ) entries and added them successfully!";
                        } else {
                            message = "System has processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
                        }

                        let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
                        return res.status(200).json({
                            message: message,
                        });

                    }

                } else {

                    return res.status(400).json({
                        errors: [
                            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
                        ]
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
                projectId: Joi.number().required()
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


            teamResult = await knex('team_roles_project_master')
            .leftJoin('teams', 'team_roles_project_master.teamId', 'teams.teamId')
            .select([
                'teams.teamName',
                'teams.teamId'
            ])
            .where({ 'team_roles_project_master.projectId': teamPayload.projectId }).returning('*')
           
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
    }

}

module.exports = teamsController;
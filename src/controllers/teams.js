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
//const trx = knex.transaction();

/* Define Controller */
const teamsController = {

    /* Define async function */
    addNewTeams: async (req, res) => {

        // Define try/catch block
        try {
            let teamsData = null;
            let orgId     = req.orgId
            await knex.transaction(async (trx) => {
                const teamsPayload = req.body;
                console.log('[controllers][teams][addNewTeam]', teamsPayload);

                // validate keys
                const schema = Joi.object().keys({
                    teamName: Joi.string().required(),
                    description: Joi.string().required()
                });

                // validate params
                const result = Joi.validate(teamsPayload, schema);
                console.log('[controllers][teams][addNewTeam]: Joi Results', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATON ERRORS", message: result.message.error }
                        ]
                    });
                }

                const currentTime = new Date().getTime();
                // Insert into teams table
                const insertData = { ...teamsPayload, createdAt: currentTime, updatedAt: currentTime, createdBy: 1 ,orgId:orgId};
                console.log('[controllers][teams][addNewTeams] : Insert Data ', insertData);

                const resultTeams = await knex.insert(insertData).returning(['*']).transacting(trx).into('teams');
                teamsData = resultTeams;
                trx.commit;
            });


            res.status(200).json({
                data: {
                    teamsData: teamsData
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
            await knex.transaction(async (trx) => {
                const upTeamsPayload = req.body;
                console.log('[controllers][teams][updateTeams] : Request Body', upTeams);

                // validate keys
                const schema = Joi.object().keys({
                    teamId: Joi.number().required(),
                    teamName: Joi.string().required(),
                    description: Joi.string().required()
                });

                // validate params
                const result = Joi.validate(upTeamsPayload, schema);

                if (result && result.hasOwnProperty('error') && result.error) {
                    res.status(400).json({
                        errors: [
                            { code: "VALIDATON ERRORS", message: result.message.error }
                        ]
                    });
                }

                const currentTime = new Date().getTime();
                // Update teams table
                updateTeams = await knex.update({ teamName: upTeamsPayload.teamName, description: upTeamsPayload.description, updatedAt: currentTime }).where({ teamId: upTeamsPayload.teamId,orgId:req.orgId }).returning(['*']).transacting(trx).into('teams');
                teamsResponse = updateTeams;
                trx.commit;
            });

            res.status(200).json({
                data: {
                    teamsResponse: teamsResponse
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
            
            let teamResult  = null;
            
            
            teamResult = await  knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId"  where "teams"."orgId" = '+req.orgId+' group by "teams"."teamId"');
            
        

            // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
           // teamResult = await knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" group by "teams"."teamId"');
            //console.log('[controllers][teams][getTeamList] : Team List', teamResult);
           // teamResult = { teams: teamResult.rows };
           
            
            res.status(200).json({
                data:{
                    teams:teamResult.rows
                } ,
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
            let {teamName}  = req.body;
            let teamResult  = null;
            let reqData     = req.query;
            let pagination  = {}
            let per_page    = reqData.per_page || 10;
            let page        = reqData.current_page || 1
            if(page<1) page = 1;
            let offset      = (page-1) * per_page;
  
             if(teamName){

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("teams")
                    .where({'teams.teamName':teamName})
                    .first(),
                    knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" where "teams.teamName" like %'+teamName+'% group by "teams"."teamId" limit '+per_page+' OFFSET '+offset+'')               
                ])

             } else{

            [total, rows] = await Promise.all([
                knex.count('* as count').from("teams")
                .first(),
                knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" group by "teams"."teamId" limit '+per_page+' OFFSET '+offset+'')               
            ])
        }

            // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
           // teamResult = await knex.raw('select "teams".*, count("team_users"."teamId") as People from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" group by "teams"."teamId"');
            //console.log('[controllers][teams][getTeamList] : Team List', teamResult);
           // teamResult = { teams: teamResult.rows };
           let count            = total.count;
           pagination.total     = count;
           pagination.per_page  = per_page;
           pagination.offset    = offset;
           pagination.to        = offset+rows.length;
           pagination.last_page = Math.ceil(count / per_page);
           pagination.current_page = page;
           pagination.from = offset;
           pagination.data = rows.rows;
            
            res.status(200).json({
                data:{
                teamData:pagination
                } ,
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
            let orgId      = req.orgId
            const { teamId, userIds } = req.body;
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
                updateUser = await knex('team_users').insert({ userId: item, teamId: teamId, createdAt: currentTime, updatedAt: currentTime,orgId: orgId }).returning(['*']);
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
    exportTeams: async (req,res)=>{

        try {
            let teamResult = null;

            // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
            teamResult = await knex.raw('select "teams".*, count("team_users"."userId") from "teams" left join "team_users" on "team_users"."teamId" = "teams"."teamId" group by "teams"."teamId"');
            teamResult = { teams: teamResult.rows };
            var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
            var ws = XLSX.utils.json_to_sheet(teamResult.teams);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
            let filename = "uploads/TeamData-"+Date.now()+".csv";
            let  check = XLSX.writeFile(wb,filename);

            res.status(200).json({
                data: teamResult,
                message: "Team Data Export Successfully"
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
    getMainAndAdditionalUsersByTeamId: async (req,res) => {
        try {
            let teamId = req.body.teamId;
            let mainUsers = await knex('team_users').innerJoin('users', 'team_users.userId', 'users.id').select(['users.id as id', 'users.name as name']).where({'team_users.teamId':teamId})
            let additionalUsers = await knex('users').select(['id','name'])
            //additionalUsers = additionalUsers.map(user => _.omit(user, ['password','username']))
            
            const Parallel = require('async-parallel')
            const usersWithRoles = await Parallel.map(additionalUsers, async user => {
                const roles = await knex('user_roles').select('roleId').where({userId:user.id});
                const roleNames = await Parallel.map(roles, async role => {
                    const roleNames = await knex('roles').select('name').where({ id: role.roleId }).whereNotIn('name', ['superAdmin','admin','customer'])
                    return roleNames.map(role => role.name).join(',')
                })
                return {...user,roleNames:roleNames.filter(v=>v).join(',')};
            })

            res.status(200).json({
                data :{

                    mainUsers,
                    additionalUsers: usersWithRoles.filter(v => v.roleNames !== "")
                }
            })

        } catch(err) {
            console.log('[controllers][teams][getAssignedTeams] : Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ]
            });
        }     
    },
    // GET TEAM DETAILS
    getTeamDetails:async (req,res)=>{
        try{
         let teamId = req.query.teamId;

         let result = await knex('teams')
                            .leftJoin('team_users','teams.teamId','team_users.teamId')
                            .leftJoin('users','team_users.userId','users.id')
                            .select([
                                'teams.teamId',
                                'teams.teamName',
                                'teams.description',
                                'users.id',
                                'users.name',
                               'users.email',
                               'teams.createdAt'
                             ])
                             .where({'teams.teamId':teamId}).returning('*')
        
                             res.status(200).json({
                                data :{
                                    teamDetails:result
                                },
                                message:"Team Details Successfully"
                            })


        }catch(err) {
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
                let teamData = await knex.update({ isActive: false, updatedAt: currentTime }).where({ teamId: id }).returning(['*']).transacting(trx).into('teams');
                team = teamData[0];

                trx.commit
            })
            res.status(200).json({
                data: {
                    team: team
                },
                message: "Team removed successfully !"
            });
        } catch (err) {

        }
    }
    
}

module.exports = teamsController;
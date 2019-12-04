const knex = require('../db/knex');
var jwt = require('jsonwebtoken');
var _ = require('lodash')
const createError = require('http-errors');

const roleMiddleware = {
    parseUserPermission: async(req,res,next) => {

        try {

            if (!req.headers || !req.headers.authorization) {
                next(createError(401));
            }

            let token = req.headers.authorization;
            token = token.replace('Bearer ', '');

            if (token && token != '') {

                // Very token using JWT
                console.log('[][auth]: Token', token);
                const decodedTokenData = await jwt.verify(token, process.env.JWT_PRIVATE_KEY);
                // console.log('[middleware][auth]: Token Decoded Data:', decodedTokenData);

                const userId = decodedTokenData.id;
                const orgId = decodedTokenData.orgId
                req.id = decodedTokenData.id;
                req.orgId = decodedTokenData.orgId
                console.log('****************MSG***************', userId,orgId);

                // Find which teams this user belongs
                const teamsResult = await knex('team_users').select('teamId').where({userId,orgId})
                let teams = teamsResult.map(v => v.teamId);
                console.log('Teams: ',teams)
                req.teams = teams;

                // Now find for these teams which role has access to which project
                let rolesOnProject = []
                for(let team of teams){
                    let result = await knex('team_roles_project_master').select('roleId', 'projectId').where({ teamId: team });
                    rolesOnProject.push(result)
                }
                rolesOnProject = _.flatten(rolesOnProject)

                let projects = _.flattenDeep(Object.entries(_.groupBy(rolesOnProject, (v) => {
                    return v.projectId
                })).map(([key, val]) => ({ [key]: val.map(v =>v.roleId) })))

                let projectAcccessToResources = {}
                for(let project of projects) {
                    console.log('Single Project: ',project)
                    let key = _.flatten(_.keys(project))[0]
                    let roles = _.flatten(_.entries(project).map(([key, v]) => {
                        return v
                    }))
                    // Get all the resources for all the roles assigned to this project
                    //let roles = Object.entries(project).map(([key,val]) => val)
                    //let key = Object.keys(project);
                    //key = key[0];
                    for(let role of roles){
                        // Get all resources for each role
                        let resourcesResult = await knex('role_resource_master').select('resourceId').where({roleId:role})
                        projectAcccessToResources[key] = resourcesResult.map(v=>Number(v.resourceId))
                    }
                }

                let finalResources = _.uniq(_.flatten(_.values(projectAcccessToResources)))
                req.projectsHavingAccessToSpecificResources = projectAcccessToResources
                console.log('************************Project access to resources: ************************', finalResources)
                req.resources = finalResources

                //console.log('Roles on Project: ', projects)

                // const rolesOnProjectResult = 
                //console.log('Roles on project: ',rolesOnProjectResult)

                //Now find which role has access to which resource
                // let roles = _.uniq(_.flatten(rolesOnProject).map(v => Number(v.roleId)))
                // console.log('After compact: ',roles)
                // let roleResourceAccess = []
                // for(let role of roles) {
                //     let res = await knex('role_resource_master').select('roleId','resourceId').where({roleId:role})
                //     roleResourceAccess.push(res)
                // }

                // let resourceAccessByRole = _.flattenDeep(Object.entries(_.groupBy(_.flatten(rolesOnProject), (v) => {
                //     return v.projectId
                // })).map(([key, val]) => ({ [key]: val })))
                //console.log('Role Resource Access: ', roleResourceAccess)

                let currentUser = await knex('users').where({ id: userId,orgId:orgId });
                currentUser = currentUser[0]; 
                // next(createError(401))
                next()
            } 
            } catch(err) {
                console.log(err)
                next(createError(401))
                return res.status(200).json({error:err})
            }
    },
    canAccessServiceRequest:  async (req,res,next) => {
        try {
            let cmId = 2;
            if(req.resources.includes(cmId)){
                next()
            } else {
                next(createError(401))
            }
        } catch(err) {
            //next(createError())
            next(createError(401))
        }
    }
}

module.exports = roleMiddleware
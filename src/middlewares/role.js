const knex = require("../db/knex");
var jwt = require("jsonwebtoken");
var _ = require("lodash");
const createError = require("http-errors");

const roleMiddleware = {
  parseUserPermission: async (req, res, next) => {
    try {
      if (!req.headers || !req.headers.authorization) {
        next(createError(401));
      }

      let token = req.headers.authorization;
      token = token.replace("Bearer ", "");

      if (token && token != "") {
        // Very token using JWT
        console.log("[][auth]: Token", token);
        const decodedTokenData = await jwt.verify(
          token,
          process.env.JWT_PRIVATE_KEY
        );
        // console.log('[middleware][auth]: Token Decoded Data:', decodedTokenData);

        const userId = decodedTokenData.id;
        const orgId = decodedTokenData.orgId;
        req.id = decodedTokenData.id;
        req.orgId = decodedTokenData.orgId;
        console.log("****************MSG***************", userId, orgId);

        if (req.orgAdmin) {
          console.log("this is orgAdmin");
          // get all the projects of this admin
          const projects = await knex("projects")
            .select("id")
            .where({ orgId: req.orgId });
          const companies = await knex("companies")
            .select("id")
            .where({ orgId: req.orgId });
          const resources = await knex("organisation_resources_master")
            .select("resourceId as id")
            .where({ orgId: req.orgId });
          const userProjectResources = _.uniqBy(resources, "id").map(v => ({
            id: v.id,
            projects: projects.map(v => v.id)
          }));
          const userCompanyResources = _.uniqBy(resources, "id").map(v => ({
            id: v.id,
            companies: companies.map(v => v.id)
          }));
          //console.log(mappedProjects)
          req.userCompanyResources = userCompanyResources;
          req.userProjectResources = userProjectResources;
          console.log(userCompanyResources, userProjectResources);
        }

        if (req.orgUser) {
          // Find which teams this user belongs
          const teamsResult = await knex("team_users")
            .select("teamId")
            .where({ userId, orgId });
          let teams = teamsResult.map(v => v.teamId);
          console.log("Teams: ", teams);
          req.teams = teams;

          // Now find for these teams which role has access to which project
          let rolesOnProject = [];
          for (let team of teams) {
            let result = await knex("team_roles_project_master")
              .select("roleId", "projectId")
              .where({ teamId: team });
            rolesOnProject.push(result);
          }
          rolesOnProject = _.flatten(rolesOnProject);

          let projects = _.flattenDeep(
            Object.entries(
              _.groupBy(rolesOnProject, v => {
                return v.projectId;
              })
            ).map(([key, val]) => ({
              [key]: val.map(v => v.roleId)
            }))
          );

          let projectAcccessToResources = {};
          for (let project of projects) {
            console.log("Single Project: ", project);
            let key = _.flatten(_.keys(project))[0];
            let roles = _.flatten(
              _.entries(project).map(([key, v]) => {
                return v;
              })
            );

            for (let role of roles) {
              // Get all resources for each role
              let resourcesResult = await knex("role_resource_master")
                .select("resourceId")
                .where({ roleId: role });
              projectAcccessToResources[key] = resourcesResult.map(v =>
                Number(v.resourceId)
              );
            }
          }

        //   req.userProjectResources = _.flattenDeep(
        //     Object.entries(
        //       _.groupBy(rolesOnProject, v => {
        //         return v.projectId;
        //       })
        //     ).map(([key, val]) => ({
        //       [key]: val.map(v => v.roleId)
        //     }))
        //   );

          console.log(
            "************************Project access to resources: ************************",
            projectAcccessToResources
          );
        }

        let currentUser = await knex("users").where({
          id: userId,
          orgId: orgId
        });
        currentUser = currentUser[0];
        next();
      }
    } catch (err) {
      console.log(err);
      next(createError(401));
      return res.status(200).json({ error: err });
    }
  },
  canAccessServiceRequest: async (req, res, next) => {
    try {
      let cmId = 2;
      if (req.resources.includes(cmId)) {
        next();
      } else {
        next(createError(401));
      }
    } catch (err) {
      //next(createError())
      next(createError(401));
    }
  }
};

module.exports = roleMiddleware;

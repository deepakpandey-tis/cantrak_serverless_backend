const knex = require("../db/knex");
const knexReader = require("../db/knex-reader");
var jwt = require("jsonwebtoken");
var _ = require("lodash");
const createError = require("http-errors");
const redisHelper = require('../helpers/redis');


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
        console.log('[middleware][role]: parseUserPermission:', userId, orgId);


        const projectsKey = `user_role_parse_permission-projects-${userId}`;
        const companieskey = `user_role_parse_permission-companies-${userId}`;

        let userProjectResources = await redisHelper.getValue(projectsKey);
        let userCompanyResources = await redisHelper.getValue(companieskey);

        if (req.orgAdmin) {

          console.log('[middleware][role]: parseUserPermission:', "User is orgAdmin");

          if (!userProjectResources || !userCompanyResources) {
            // get all the projects of this admin
            const projects = await knexReader("projects")
              .select("id")
              .where({ orgId: req.orgId });

            const companies = await knexReader("companies")
              .select("id")
              .where({ orgId: req.orgId });

            const resources = await knexReader("organisation_resources_master")
              .select("resourceId as id")
              .where({ orgId: req.orgId });

            userProjectResources = _.uniqBy(resources, "id").map(v => ({
              id: v.id,
              projects: projects.map(v => v.id)
            }));

            userCompanyResources = _.uniqBy(resources, "id").map(v => ({
              id: v.id,
              companies: companies.map(v => v.id)
            }));

            console.log('[middleware][role]: parseUserPermission: userCompanyResources (From DB) :: ', userCompanyResources);
            console.log('[middleware][role]: parseUserPermission: userProjectResources (From DB) :: ', userProjectResources);
            await redisHelper.setValueWithExpiry(projectsKey, userProjectResources, 180);
            await redisHelper.setValueWithExpiry(companieskey, userCompanyResources, 180);
          }

          if (userProjectResources.length === 0) {
            return next(createError(403))
          }

          req.userCompanyResources = userCompanyResources;
          req.userProjectResources = userProjectResources;
        }

        if (req.orgUser) {

          console.log('[middleware][role]: parseUserPermission:', "User is orgUser");

          if (!userProjectResources) {
            const result = await knexReader("team_users")
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
              ]).where({ 'team_users.userId': userId, 'team_users.orgId': req.orgId })//.whereIn('team_users.teamId',teams);

            // console.log(
            //   "result***********************************************************",
            //   result
            // );

            userProjectResources = _.chain(result).groupBy("resourceId").map((value, key) => ({ id: key, projects: value.map(a => a.projectId) })).value();

            console.log('[middleware][role]: parseUserPermission: userProjectResources (From DB) :: ', userProjectResources);

            await redisHelper.setValueWithExpiry(projectsKey, userProjectResources, 180);
          }

          if (userProjectResources.length === 0) {
            return next(createError(403))
          }

          req.userProjectResources = userProjectResources;
        }

        // console.log('[middleware][role]: parseUserPermission: userCompanyResources (From REDIS) :: ', userCompanyResources);
        // console.log('[middleware][role]: parseUserPermission: userProjectResources (From REDIS) :: ', userProjectResources);

        next();
      }
    } catch (err) {
      console.error(`'[middleware][role][parseUserPermission] Error:`, err);
      // next(createError(403));
      return res.status(200).json({ error: err });
    }
  }
};

module.exports = roleMiddleware;

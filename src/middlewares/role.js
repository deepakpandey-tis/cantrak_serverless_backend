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


        const plantationsKey = `user_role_parse_permission-plantations-${userId}`;
        const locationsKey = `user_role_parse_permission-locations-${userId}`;
        const companieskey = `user_role_parse_permission-companies-${userId}`;

        let userPlantationResources = await redisHelper.getValue(plantationsKey);
        let userGrowingLocationsResources = await redisHelper.getValue(locationsKey);
        let userCompanyResources = await redisHelper.getValue(companieskey);

        if (req.orgAdmin) {

          console.log('[middleware][role]: parseUserPermission:', "User is orgAdmin");

          if (!userPlantationResources || !userCompanyResources || !userGrowingLocationsResources) {
            // get all the plantations of this admin
            const plantations = await knexReader("plantations")
              .select("id")
              .where({ orgId: req.orgId });

            const locations = await knexReader("locations")
              .select("id")
              .where({ orgId: req.orgId });

            const companies = await knexReader("companies")
              .select("id")
              .where({ orgId: req.orgId });

            const resources = await knexReader("organisation_resources_master as orm")
              .leftJoin(
                "resources as r",
                "r.id",
                "orm.resourceId"
              )
              .select("r.id as id", "r.code")
              .where({ 'orm.orgId': req.orgId })
              .where({ 'orm.isAuthorized': true });

            userPlantationResources = _.uniqBy(resources, "id").map(v => ({
              id: v.id,
              code: v.code,
              plantations: plantations.map(v => v.id)
            }));

            userGrowingLocationsResources = _.uniqBy(resources, "id").map(v => ({
              id: v.id,
              code: v.code,
              locations: locations.map(v => v.id)
            }));

            // userGrowingLocationsResources = locations.map(v => v.id);

            userCompanyResources = _.uniqBy(resources, "id").map(v => ({
              id: v.id,
              code: v.code,
              companies: companies.map(v => v.id)
            }));

            console.log('[middleware][role]: parseUserPermission: userCompanyResources (From DB) :: ', userCompanyResources);
            console.log('[middleware][role]: parseUserPermission: userPlantationResources (From DB) :: ', userPlantationResources);
            console.log('[middleware][role]: parseUserPermission: userGrowingLocationsResources (From DB) :: ', userGrowingLocationsResources);
            await redisHelper.setValueWithExpiry(plantationsKey, userPlantationResources, 180);
            await redisHelper.setValueWithExpiry(locationsKey, userGrowingLocationsResources, 180);
            await redisHelper.setValueWithExpiry(companieskey, userCompanyResources, 180);
          }

          if (userPlantationResources.length === 0) {
            return next(createError(403))
          }


          // console.log('[middleware][role]: parseUserPermission: userCompanyResources (From Redis) :: ', userCompanyResources);
          // console.log('[middleware][role]: parseUserPermission: userPlantationResources (From Redis) :: ', userPlantationResources);
          // console.log('[middleware][role]: parseUserPermission: userGrowingLocationsResources (From Redis) :: ', userGrowingLocationsResources);

          req.userCompanyResources = userCompanyResources;
          req.userGrowingLocationsResources = userGrowingLocationsResources;
          req.userPlantationResources = userPlantationResources;
        }

        if (req.orgUser) {

          console.log('[middleware][role]: parseUserPermission:', "User is orgUser");

          if (!userPlantationResources || !userGrowingLocationsResources) {
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
              .leftJoin(
                "resources",
                "resources.id",
                "role_resource_master.resourceId"
              )
              .select([
                "team_roles_project_master.locationId as locationId",
                "role_resource_master.resourceId as resourceId",
                "resources.code as code"
              ]).where({ 'team_users.userId': userId, 'team_users.orgId': req.orgId })//.whereIn('team_users.teamId',teams);

            console.log(
              "result***********************************************************",
              result
            );

            let ids = {};

            result.map(e =>{
              ids[e.resourceId] = e.code
            });
            
            console.log("_.chain(result)", _.chain(result).groupBy("resourceId"));

            userPlantationResources = _.chain(result).groupBy("resourceId").map((value, key) => ({ id: key, code: ids[key], plantations: value.map(a => a.locationId) })).value();
            userGrowingLocationsResources = _.chain(result).groupBy("resourceId").map((value, key) => ({ id: key, code: ids[key], locations: value.map(a => a.locationId) })).value();

            console.log('[middleware][role]: parseUserPermission: userPlantationResources (From DB) :: ', userPlantationResources);
            console.log('[middleware][role]: parseUserPermission: userGrowingLocationsResources (From DB) :: ', userGrowingLocationsResources);

            await redisHelper.setValueWithExpiry(plantationsKey, userPlantationResources, 180);
            await redisHelper.setValueWithExpiry(locationsKey, userGrowingLocationsResources, 180);
          }

          if (userPlantationResources.length === 0) {
            return next(createError(403))
          }

          req.userPlantationResources = userPlantationResources;
          req.userGrowingLocationsResources = userGrowingLocationsResources;
        }

        // console.log('[middleware][role]: parseUserPermission: userCompanyResources (From REDIS) :: ', userCompanyResources);
        // console.log('[middleware][role]: parseUserPermission: userPlantationResources (From REDIS) :: ', userPlantationResources);

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

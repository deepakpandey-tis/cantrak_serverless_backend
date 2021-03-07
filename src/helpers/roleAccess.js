const Joi = require("@hapi/joi");
const _ = require("lodash");
const knex = require("../db/knex");
const moment = require("moment-timezone");


const roleAccessHelper = {
  getAllUsers: async ({ projectId, resourceId, orgId }) => {
    console.log("[getAllUsers][payload]", projectId, resourceId, orgId)

    try {
      let users = await knex
        .from("users")
        .leftJoin("team_users", "users.id", "team_users.userId")
        .leftJoin(
          "team_roles_project_master",
          "team_users.teamId",
          "team_roles_project_master.teamId"
        )
        .leftJoin(
          "role_resource_master",
          "team_roles_project_master.roleId",
          "role_resource_master.roleId"
        )
        .select(["users.*"])
        .where({
          "team_roles_project_master.projectId": projectId,
          "role_resource_master.resourceId": resourceId,
          "users.orgId": orgId
        });

      console.log("[helpers][roleAccess][getAllUsers]:  result", users);

      return users;
    } catch (err) {

      console.log("[helpers][roleAccess][getAllUsers]:  Error", err);
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    }
  },
};
module.exports = roleAccessHelper;

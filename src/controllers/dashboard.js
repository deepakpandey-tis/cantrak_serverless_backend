const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");
const trx = knex.transaction();
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const dashboardController = {

  getDashboardData: async (req, res) => {
    try {

      const [openRequests, openOrders, srhp, sohp] = await Promise.all([
        knex.count('service_requests.serviceStatusCode as count')
          .from('service_requests')
          .select('service_requests.serviceStatusCode as status')
          .groupBy(['service_requests.serviceStatusCode'])
          .where({ serviceStatusCode: 'O' })
        ,
        knex.count('service_orders.serviceOrderStatus as count')
          .from('service_orders')
          .select('service_orders.serviceOrderStatus as status')
          .groupBy(['service_orders.serviceOrderStatus'])
          .where({ serviceOrderStatus: 'O' })
        ,
        knex.count('service_requests.serviceStatusCode as count')
          .from('service_requests')
          .select('service_requests.serviceStatusCode as status')
          .groupBy(['service_requests.serviceStatusCode'])
          .where({ serviceStatusCode: 'O', priority: 'HIGH' })
        ,
        knex.count(
          'service_orders.serviceRequestId as count'
        ).from('service_orders').innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id').select([
          'service_orders.serviceRequestId as sr_id',
        ]).groupBy(['service_orders.serviceRequestId']).where({ 'service_requests.serviceStatusCode': 'O', 'service_requests.priority': 'HIGH' })
      ])

      let open_service_requests = openRequests.length ? openRequests[0].count : 0;
      let open_service_orders = openOrders.length ? openOrders[0].count : 0;
      let open_service_requests_high_priority = srhp.length ? srhp[0].count : 0;
      let open_service_orders_high_priority = sohp.length ? sohp[0].count : 0;


      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_service_requests_high_priority,
          open_service_orders_high_priority,
        },
        message: 'Dashboard data'
      })

    } catch (err) {
      console.log('[controllers][parts][getParts] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  getTopAssetProblem: async (req, res) => {
    // Define try/catch block
    try {
      let assestProbResult = null;

      // teamResult =  await knex('teams').leftJoin('team_users','team_users.teamId', '=', 'teams.teamId').select('teams.*').count("team_users.userId").groupByRaw('teams.teamId');
      assestProbResult = await knex.raw(`select "asset_master"."assetName","asset_master"."model", count("assigned_assets"."assetId") as "totalProblems" from "assigned_assets" inner join "asset_master" on "assigned_assets"."assetId" = "asset_master"."id" where "assigned_assets"."entityType"='service_requests'  group by "assigned_assets"."assetId","asset_master"."id" ORDER BY "totalProblems" DESC LIMIT 5`);

      console.log('[controllers][teams][getTeamList] : Team List', assestProbResult);
      assestProbResult = { assest: assestProbResult.rows };

      res.status(200).json({
          data: assestProbResult,
          message: "Top Assest & Problem Results !"
      })

    } catch (err) {
        console.log('[controllers][dashboard][getAssesList] : Error', err);
        res.status(500).json({
            errors: [
                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
            ]
        });
    }
  }
};

module.exports = dashboardController;

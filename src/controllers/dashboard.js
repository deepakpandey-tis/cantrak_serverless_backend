const knex = require('../db/knex');
const Joi = require('@hapi/joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const moment = require('moment');
const trx = knex.transaction();
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');

const dashboardController = {
  getDashboardData: async (req, res) => {
    try {
      // Get opened service requests
      const [openRequests, openOrders, srhp, sohp] = await Promise.all([
        knex('service_requests').select().where({ serviceStatusCode: 'O' }),
        knex('service_orders').select().where({ serviceOrderStatus: 'O' }),
        knex('service_requests').select().where({ serviceStatusCode: 'O', priority: 'HIGH' }),
        knex.from('service_orders').innerJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id').select([
          'service_orders.id as so_id',
          'service_requests.id as sr_id',
        ]).where({ 'service_requests.serviceStatusCode': 'O', 'service_requests.priority': 'HIGH' })
      ])

      let open_service_requests = openRequests.length;
      let open_service_orders = openOrders.length;
      let open_service_requests_high_priority = srhp.length;
      let open_service_orders_high_priority = sohp.length;

      return res.status(200).json({
        data: {
          open_service_requests,
          open_service_orders,
          open_service_requests_high_priority,
          open_service_orders_high_priority,
        },
        message: 'Dashboard data'
      })


      // Get opened service requests with high priority

      // Get opened service orders

      // Get opened service orders with high priority

    } catch (err) {
      console.log('[controllers][parts][getParts] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = dashboardController
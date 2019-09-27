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
      const [openRequests, openOrders,] = await Promise.all([
        knex('service_requests').select().where({ serviceStatusCode: 'O' }),
        knex('service_orders').select().where({ serviceOrderStatus: 'O' }),


      // Get opened service requests with high priority

      // Get opened service orders

      // Get opened service orders with high priority

    } catch (err) {

    }
  }
}

module.exports = dashboardController
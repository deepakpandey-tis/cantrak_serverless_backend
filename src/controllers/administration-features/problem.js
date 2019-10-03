const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();

const problemController = {
  getProblems: async (req, res) => {
    // List with filter and pagination
    try {

      let reqData = req.query;
      let filters = req.body;
      let total, rows

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex.count('* as count').from("incident_sub_categories").first(),
          knex.select("*").from("incident_sub_categories").offset(offset).limit(per_page)
        ])
      } else {
        filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
        try {
          [total, rows] = await Promise.all([
            knex.count('* as count').from("incident_sub_categories").where(filters).offset(offset).limit(per_page).first(),
            knex("incident_sub_categories").where(filters).offset(offset).limit(per_page)
          ])
        } catch (e) {
          // Error
          console.log('Error: ' + e.message)
        }
      }

      let count = total.count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;

      return res.status(200).json({
        data: {
          problems: pagination
        },
        message: 'Problems List!'
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = problemController
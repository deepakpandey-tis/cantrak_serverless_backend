const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');



const fileController = {
  deleteFile: async (req, res) => {
    try {

      const id = req.body.id
      const deletedFile = await knex.del().from('files').where({ id: id })
      return res.status(200).json({
          deletedFile: !!deletedFile
      })
    } catch (err) {
      console.log('[controllers][quotation][updateQuotation] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = fileController
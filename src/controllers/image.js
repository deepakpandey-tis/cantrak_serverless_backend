const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');



const imageController = {
  deleteImage: async (req, res) => {
    try {

      const id = req.body.id
      const deletedImage = await knex.del().from('images').where({ id: id })
      return res.status(200).json({
        deletedImage: !!deletedImage
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

module.exports = imageController
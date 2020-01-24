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
  },
  uploadImageByEntity:async (req,res) => {
    try {
      const payload = req.body;
      const uploadedImage = await knex('images').insert(payload).returning(['*']);
      return res.status(200).json({
        data: uploadedImage,
        message: 'Image uploaded!'
      })
    } catch(err) {
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
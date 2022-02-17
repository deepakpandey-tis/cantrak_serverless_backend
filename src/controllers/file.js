const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');
const imageHelper = require('../helpers/image');



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
  },

  getImageUploadUrl: async (req, res) => {
    const mimeType = req.body.mimeType;
    const filename = req.body.filename;
    const type = req.body.type;
    try {
      const uploadUrlData = await imageHelper.getUploadURL(
        mimeType,
        filename,
        type
      );

      res.status(200).json({
        data: {
          uploadUrlData: uploadUrlData,
        },
        message: "Upload Url generated successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][service][getImageUploadUrl] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [
          {
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message,
          },
        ],
      });
    }
  },
}

module.exports = fileController
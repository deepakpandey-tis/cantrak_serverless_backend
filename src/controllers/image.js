const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');
const AWS = require("aws-sdk");


if (process.env.IS_OFFLINE) {
  AWS.config.update({
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER"
  });
} else {
  AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  });
}

const imageController = {
  deleteImage: async (req, res) => {
    try {

      const s3 = new AWS.S3();
      const id = req.body.id
      let filename = await knex('images').select('s3Url').where({id}).first()
      let s3Url = filename.s3Url.split('/');
      let fileId = s3Url.pop()
      let path = s3Url.pop()
      const deletedImage = await knex.del().from('images').where({ id: id })
      // Remove it from S3
      var params = { Bucket: 'sls-app-resources-bucket', Key: path+'/'+fileId };
      s3.deleteObject(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);  // error
        }
        else {
          return res.status(200).json({
            deletedImage: !!deletedImage,
            data
          })
        }
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
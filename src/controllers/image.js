const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment")

const knex = require('../db/knex');
const AWS = require("aws-sdk");


AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "ap-southeast-1"
});

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
      var params = { Bucket: process.env.S3_BUCKET_NAME, Key: path+'/'+fileId };
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
      console.log('[controllers][image][deleteImage] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  uploadImageByEntity:async (req,res) => {
    try {
      const currentTime = new Date().getTime();
      const payload = req.body;
      const uploadedImage = await knex('images').insert({ ...payload, orgId: req?.me?.orgId, createdAt: currentTime }).returning(['*']);
      return res.status(200).json({
        data: uploadedImage,
        message: 'Image uploaded!'
      })
    } catch(err) {
      console.log('[controllers][image][uploadImageByEntity] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  uploadFiles:async (req,res) => {
    try {
      const payload = req.body;

      let insertedRecord = [];
      const currentTime = new Date().getTime();

      await knex.transaction(async (trx) => {
        let item;
        let itemRecNo;

        itemRecNo = 0;
        for (let rec of payload.files) {
            item = {
                orgId: req?.me?.orgId,
                ...rec,
                createdAt: currentTime,
            };
            console.log('item: ', item);

            const insertResult = await knex
                .insert(item)
                .returning(["*"])
                .transacting(trx)
                .into("images");

            insertedRecord[itemRecNo] = insertResult[0];
            itemRecNo += 1;
        }

        trx.commit;
      });

      return res.status(200).json({
          data: {
              records: insertedRecord,
          },
          message: 'Files(s) uploaded!'
      });

    } catch(err) {
      console.log('[controllers][image][uploadFiles] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  uploadImageTagsByEntity:async (req,res) => {
    try {
      const payload = req.body;

      // validate keys
      const schema = Joi.object().keys({
        entityId: Joi.string().required(),
        entityType: Joi.string().required(),
        tagData: Joi.object().required(),
      });
      // validate params
      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        console.log("result errors", result);
        res.status(400).json({
          errors: [
            { code: "VALIDATION ERRORS", message: result.message.error }
          ]
        });
      }

      const uploadedImageTags = await knex('image_tags').insert({ ...payload, orgId: req?.me?.orgId }).returning(['*']);
      return res.status(200).json({
        data: uploadedImageTags,
        message: 'Image Tags uploaded!'
      })
    } catch(err) {
      console.log('[controllers][image][uploadImageTagsByEntity] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = imageController
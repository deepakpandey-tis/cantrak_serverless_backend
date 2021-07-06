const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment");
const AWS = require('aws-sdk');

const knex = require('../db/knex');

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1"
});

const extractTextFromImage = async (imagePath) => {
  console.log('Going to Detect Text in Image at S3 Path:', imagePath);

  const rekognition = new AWS.Rekognition();

  let params = {
    Image: { /* required */
      S3Object: {
        Bucket: process.env.S3_BUCKET_NAME,
        Name: imagePath,
      }
    }
  };

  return new Promise((resolve, reject) => {
    rekognition.detectText(params, (err, data) => {
      if (err) { reject(err); }
      else { resolve(data); }
    });
  });

};

const imageRekognitionController = {
  addImageRekognition: async (req, res) => {
    try {

      let currentTime = new Date().getTime();

      const payload = { ...req.body, updatedAt: currentTime, createdAt: currentTime, createdBy: req.me.id, };

      let addedImageRekognition = await knex('image_rekognition').insert(payload).returning(['*']);
      addedImageRekognition = addedImageRekognition && addedImageRekognition[0] ? addedImageRekognition[0] : addedImageRekognition;

      return res.status(200).json({
        data: addedImageRekognition,
        message: 'Image Rekognition Added'
      })
    } catch (err) {
      console.log('[controllers][image-rekognition][addImageRekognition] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  detectTextInImage: async (req, res) => {
    try {

      let rekognitionId = req.params.rId;
      console.log('[controllers][image-rekognition][detectTextInImage] :  rekognitionId', rekognitionId);

      let addedImageRekognition = await knex('image_rekognition').where({ id: rekognitionId }).first();

      if (!addedImageRekognition) {
        return res.status(404).json({
          errors: [
            { code: 'Not Found', message: 'Rekognition Object not found' }
          ],
        });
      }

      let entityType = 'meter';
      let entityId = addedImageRekognition.id;

      let image = await knex('images').where({ entityId, entityType }).orderBy('id', 'desc').select('*').first();
      if (!image) {
        return res.status(404).json({
          errors: [
            { code: 'Not Found', message: 'Rekognition image not found or not uploaded.' }
          ],
        });
      }

      console.log('[controllers][image-rekognition][detectTextInImage] :  Image Obj:', image);
      let imagePath = image.s3Path;

      const extractedTextData = await extractTextFromImage(imagePath);
      await knex('image_rekognition').where({ id: rekognitionId }).update({ rekognizedText: extractedTextData, processed: true });

      addedImageRekognition = await knex('image_rekognition').where({ id: rekognitionId }).first();
      return res.status(200).json({
        data: addedImageRekognition,
        message: 'Text Extracted from Image Succesfully'
      });

    } catch (err) {
      console.log('[controllers][image-rekognition][detectTextInImage] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  checkMeterManagementAccess: async (req, res) => {
    try {
      return res.status(200).json({
        message: 'OK'
      })
    } catch (err) {
      console.log('[controllers][image-rekognition][Access] :  Error', err);
    }
  }
}

module.exports = imageRekognitionController
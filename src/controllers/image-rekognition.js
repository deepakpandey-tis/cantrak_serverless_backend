const Joi = require('@hapi/joi');
const _ = require('lodash');
const moment = require("moment");

const knex = require('../db/knex');

const imageRekognitionController = {
  addImageRekognition:async (req,res) => {
    try {
        
      let currentTime = new Date().getTime();
      
      const payload = {...req.body, updatedAt: currentTime, createdAt: currentTime, createdBy: req.me.id,};
      
      const addedImageRekognition = await knex('image_rekognition').insert(payload).returning(['*']);
      return res.status(200).json({
        data: addedImageRekognition,
        message: 'Image Rekognition Added'
      })
    } catch(err) {
      console.log('[controllers][image-rekognition][addImageRekognition] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  checkMeterManagementAccess: async (req,res) => {
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
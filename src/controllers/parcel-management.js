const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const multer = require("multer");
const multerS3 = require("multer-s3");

const knex = require("../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const AWS = require("aws-sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const https = require("https");

if (process.env.IS_OFFLINE) {
  AWS.config.update({
    accessKeyId: "S3RVER",
    secretAccessKey: "S3RVER",
  });
} else {
  AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  });
}

const parcelManagementController = {

  getStorageList:async(req,res)=>{
    try{
      
    }catch(err){}
  },

getCompanyListHavingPropertyUnit:async(req,res)=>{
  try{
    let pagination = {};
    let result;
    let companyHavingPU
    let companyArr = []

    let houseIds = req.me.houseIds;
    
    companyHavingPU = await knex('property_units').select(['companyId'])
          .where({ orgId: req.orgId, isActive: true })
          .whereIn('property_units.id', houseIds)

        companyArr = companyHavingPU.map(v => v.companyId)
        result = await knex("companies")
          .innerJoin('property_units', 'companies.id', 'property_units.companyId')
          .select("companies.id", "companies.companyId", "companies.companyName as CompanyName")
          .where({ 'companies.isActive': true, 'companies.orgId': req.orgId })
          .whereIn('companies.id', companyArr)
          .groupBy(['companies.id', 'companies.companyName', 'companies.companyId'])
          .orderBy('companies.companyName', 'asc')
      pagination.data = result;
      return res.status(200).json({
        data: {
          companies: pagination
        },
        message: "Companies List!"
      });
  }catch(err){
    console.log(
      "[controllers][propertysetup][getCompanyListHavingPropertyUnits] :  Error",
      err
    );
    //trx.rollback
    res.status(500).json({
      errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
    });
  }
},

/**ADD PARCEL */

addParcelRequest: async (req, res) => {
  try {
    let payLoad = _.omit(req.body, [
      "images",
      "reqName",
      "reqMobile",
      "reqEmail",
      "delvName",
      "delvMobile",
      "delvEmail",
    ]);
    await knex.transaction(async (trx) => {
      const schema = Joi.object().keys({
        addParcelId: Joi.number().required(),
        parcelName: Joi.string().required(),
        courierId: Joi.number().required(),
        storageId: Joi.number().required(),
        description: Joi.string().required(),
        areaName: Joi.string().allow("").optional(),
        company: Joi.string().required(),
        project: Joi.string().required(),
        building: Joi.string().required(),
        floor: Joi.string().required(),
        unit: Joi.string().required(),
        userId: Joi.string().allow("").optional(),
      });

      const result = Joi.validate(payLoad,schema)
      console.log("result",result)

      if(result && result.hasOwnProperty("error") && result.error){
          return res.status(400).json({
              errors:[
                  {code:"VALIDATION_ERROR",message:result.error.message}
              ]
          })
      }
      const currentTime = new Date().getTime();


    });
  } catch (error) {}
}
};
module.exports = parcelManagementController

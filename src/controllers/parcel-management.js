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

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1"
});

const parcelManagementController = {

  addParcel:async(req,res)=>{
    try{
      let addParcelResult = null
      let insertedImages = [];
      

      const schema = Joi.object.keys({
        
      })
      
    }catch(err){

    }
  },

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
    let orgId = req.orgId
    let payLoad = _.omit(req.body, [
      "pickedUpType",
      "parcelName",
      "courierId",
      "parcelType",
      "description",
      "parcelCondition",
      "companyId",
      "projectId",
      "buildingPhaseId",
      "florZoneId",
      "unitId",
      "recipient",
      "sender",
      "parcelStatus",
      "parcelPriority"
    ]);
    // let payload = req.body
    await knex.transaction(async (trx) => {
      const schema = Joi.object().keys({
        pickedUpType: Joi.string().required(),
        parcelName: Joi.string().required(),
        courierId: Joi.number().required(),
        parcelType: Joi.number().required(),
        description: Joi.string().required(),
        parcelCondition: Joi.string().required(),
        companyId: Joi.string().required(),
        projectId: Joi.string().required(),
        buildingPhaseId: Joi.string().required(),
        floorZoneId: Joi.string().required(),
        unitId: Joi.string().required(),
        recipient:Joi.string.required(),
        sender: Joi.string().required(),
        parcelStatus: Joi.number().required(),
        parcelPriority: Joi.number().required()
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


      const insertData = {
        ...payLoad,
        orgId:orgId,
        createdBy:req.me.id,
        createdAt:currentTime,
        updatedAt:currentTime
      }

      let addResult = await knex('parcel_management')
      .insert(insertData)
      .returning(['*'])

      res.status(200).json({
        data:addResult,
        message:"Parcel added"
      },
      
      )



    });
  } catch (error) {}
}
};
module.exports = parcelManagementController

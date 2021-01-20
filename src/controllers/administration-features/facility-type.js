const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const uuid = require("uuid/v4");
const emailHelper = require("../../helpers/email");
const XLSX = require("xlsx");
const fs = require("fs");

const FacilityTypeController = {
  addFacilityType: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;
      let facilityTypeResult = null
      let images = [];


      await knex.transaction(async (trx) => {
        let payload = req.body;
        payload = _.omit(req.body, [
          "iconUrl",
          "logoFile"
          
        ]);
        console.log("[Controllers][FacilityType][add]", payload);

        const schema = Joi.object().keys({
          facilityTypeCode: Joi.string().required(),
          facilityTypeName: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        console.log("[Controller][facilityType][add]:Joi result", result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existFacilityTypeCode = await knex("facility_type_master").where({
          facilityTypeCode: payload.facilityTypeCode.toUpperCase(),
          orgId: orgId,
        });
        console.log(
          "[controllers][facility type][add]: facilityTypeCode",
          existFacilityTypeCode
        );
        if (existFacilityTypeCode && existFacilityTypeCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Facility Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const insertData = {
          ...payload,
          orgId: orgId,
          createdBy: userId,
          facilityTypeCode: payload.facilityTypeCode.toUpperCase(),
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log(
          "[controllers][facilityType][add]: Insert Data",
          insertData
        );

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("facility_type_master");

        incident = incidentResult[0];
        facilityTypeResult = incidentResult[0]

        let imagesData = req.body.logoFile;
        if (imagesData && imagesData.length > 0) {
          for (let image of imagesData) {
            let d = await knex("images")
              .insert({
                entityType: "facility_type_image",
                entityId: facilityTypeResult.id,
                s3Url: image.s3Url,
                name: image.filename,
                title: image.title,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"]);
            // .transacting(trx)
            // .into("images");
            images.push(d[0]);
          }
        }

        let iconData = req.body.iconUrl
        console.log("iconData",iconData)

        if(iconData && iconData.length > 0){
          for (let icon of iconData){
            let d = await knex("images")
            .insert({
              entityType:"facility_type_icon",
              entityId: facilityTypeResult.id,
                s3Url: icon.s3Url,
                name: icon.filename,
                title: icon.title,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
            })
          }
        }

        trx.commit;
      });
      res.status(200).json({
        data: {
          category: incident,
        },
        message: "Facility type added successfully !",
      });
    } catch (err) {
      console.log("[controllers][facilityType][facilityTypeAdd] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  updateFacilityType: async (req, res) => {
    console.log("facility type req.body",req.body)
    try {
      let updatePayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;
      let images = [];

      await knex.transaction(async (trx) => {
        let statusPayload = req.body;
        statusPayload = _.omit(req.body, [
          "iconUrl",
          "logoFile"
          
        ]);

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          facilityTypeCode: Joi.string().required(),
          facilityTypeName: Joi.string().required(),
        });
        const result = Joi.validate(statusPayload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existStatusCode = await knex("facility_type_master")
          .where({
            facilityTypeCode: statusPayload.facilityTypeCode.toUpperCase(),
            orgId: orgId,
          })
          .whereNot({ id: statusPayload.id });
        console.log(
          "[controllers][status][updateStatus]: Facility Code",
          existStatusCode
        );
        if (existStatusCode && existStatusCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "STORAGE_EXIST_ERROR",
                message: "Facility Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const updateStatusResult = await knex
          .update({
            facilityTypeCode: statusPayload.facilityTypeCode.toUpperCase(),
            facilityTypeName: statusPayload.facilityTypeName,
            updatedAt: currentTime,
          })
          .where({ id: statusPayload.id,  orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("facility_type_master");

        console.log(
          "[controllers][status][updateStatus]: Update Data",
          updateStatusResult
        );
        updatePayload = updateStatusResult[0];

        let imagesData = req.body.logoFile;

        if (imagesData && imagesData.length > 0) {
          for (let image of imagesData) {
            let d;
           // Check If Image Already Exits
           const existFacilityTypeImage = await knex("images").where({
            entityType: "facility_type_image", entityId:req.body.id,
            orgId: req.orgId,
          });

          if(existFacilityTypeImage.length > 0){
              // Update If Image is already exits                                    
              d = await knex("images")
              .update({
                s3Url: image.s3Url,
                name: image.filename,
                title: image.title,
                // createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
              })
              .where({entityId : req.body.id,entityType:"facility_type_image"})
              .returning(["*"]);
          }else{

            // Insert If Image is not exits
            d = await knex("images")
            .insert({
              entityType: "facility_type_image",
              entityId: req.body.id,
              s3Url: image.s3Url,
              name: image.filename,
              title: image.title,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"]);
          }
            // .transacting(trx)
            // .into("images");
            images.push(d[0]);

          }
        }

        let iconData = req.body.iconUrl
        console.log("iconData",iconData)

        if(iconData && iconData.length > 0){
          for (let icon of iconData){
            let d;
           // Check If Icon Already Exits
           const existFacilityTypeImage = await knex("images").where({
            entityType: "facility_type_icon", entityId:req.body.id,
            orgId: req.orgId,
          });

          if(existFacilityTypeImage.length > 0){
              // Update If Icon is already exits                                    
             d = await knex("images")
              .update({
                  s3Url: icon.s3Url,
                  name: icon.filename,
                  title: icon.title,
                  updatedAt: currentTime,
              })
              .where({entityId : req.body.id,entityType:"facility_type_icon"})
          }else{

            // Insert If Icon is not exits
            d = await knex("images")
            .insert({
              entityType:"facility_type_icon",
              entityId: req.body.id,
                s3Url: icon.s3Url,
                name: icon.filename,
                title: icon.title,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
            })
          }
            // let d = await knex("images")
            // .update({
            //     s3Url: icon.s3Url,
            //     name: icon.filename,
            //     title: icon.title,
            //     updatedAt: currentTime,
            // })
            // .where({entityId : req.body.id,entityType:"facility_type_icon"})
          }
        }

        trx.commit;
      });
      res.status(200).json({
        data: {
          facilityType: updatePayload,
        },
        message: "Facility Type updated successfully !",
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getFacilityTypeList:async(req,res)=>{
      try{
        let sortPayload = req.body;
        if (!sortPayload.sortBy && !sortPayload.orderBy) {
          sortPayload.sortBy = "facility_type_master.facilityTypeName";
          sortPayload.orderBy = "asc";
        }

        let reqData = req.query;
        let pagination = {};
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;
        let { searchValue } = req.body;
        let orgId = req.query.orgId;
        let total, rows;

        [total,rows] = await Promise.all([
            knex
            .count("* as count")
            .from("facility_type_master")
            .leftJoin("users","users.id","facility_type_master.createdBy")
            .where({"facility_type_master.orgId":req.orgId})
            .where((qb)=>{
                if(searchValue){
                    qb.where("facility_type_master.facilityTypeCode","iLIKE",`%${searchValue}%`)
                    qb.orWhere("facility_type_master.facilityTypeName","iLIKE",`%${searchValue}%`)
                }
            })
            .first(),
            knex
            .from("facility_type_master")
            .leftJoin("users","users.id","facility_type_master.createdBy")
            .where({"facility_type_master.orgId":req.orgId})
            .select([
                "facility_type_master.id as id",
                "facility_type_master.facilityTypeCode",
                "facility_type_master.facilityTypeName",
                "facility_type_master.isActive as status",
                "facility_type_master.createdAt as Date Created",
                "users.name as created by"
            ])
            .where((qb)=>{
                if(searchValue){
                    qb.where("facility_type_master.facilityTypeCode","iLIKE",`%${searchValue}%`)
                    qb.orWhere("facility_type_master.facilityTypeName","iLIKE",`%${searchValue}%`)
                }
            })
            // .orderBy(sortPayload.sortBy,sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);
        let count = total.count;
        pagination.total = count;
        pagination.per_page = per_page;
        pagination.offset = offset;
        pagination.to = offset + rows.length;
        pagination.last_page = Math.ceil(count / per_page);
        pagination.current_page = page;
        pagination.from = offset;
        pagination.data = rows;

        return res.status(200).json({
            data: {
              facilityType: pagination,
            },
            message: "Facility Type List!",
          });
      }catch(err){
        console.log("[controllers][facility Type][get facility type],Error", err);
      }
  },
  getFacilityTypeDetail:async(req,res)=>{
    try{
      let facilityTypeDetail = null;
      let orgId = req.orgId;
      let images ;
      let icon;

      await knex.transaction(async(trx)=>{
        let payload = req.body
        const schema = Joi.object().keys({
          id: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        let [facilityTypeResult,facilityTypeImages,facilityTypeIcon] = await Promise.all([
        knex
        .from("facility_type_master")
        .select("facility_type_master.*")
        .where({ id: payload.id, orgId: orgId }),
        knex
        .from("images")
        .where({ entityId: payload.id, entityType: "facility_type_image" }),
        knex
        .from("images")
        .where({ entityId: payload.id, entityType: "facility_type_icon" })

      ])

        facilityTypeDetail = _.omit(facilityTypeResult[0],["createdAt", "updatedAt"]);
        images = facilityTypeImages
        icon = facilityTypeIcon
        trx.commit;
      
      })
      return res.status(200).json({
        data: {
          facilityTypeDetail: facilityTypeDetail,
          images,icon
        },
        message: "Facility Type Details !!",
      });
    }catch(err){
      console.log("[controllers][facilityType][facilityTypeDetails] :  Error", err);

    }
  },
  toggleFacilityType:async(req,res)=>{
    try{
      let facilityType = null
      let message;
      await knex.transaction(async(trx)=>{
        let payload = req.body;
        let orgId = req.orgId;
        const schema = Joi.object().keys({
          id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        let facilityTypeResult 
        let checkStatus = await knex.from('facility_type_master').where({ id: payload.id }).returning(['*'])

        if(checkStatus && checkStatus.length){
          if (checkStatus[0].isActive == true) {

            facilityTypeResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("facility_type_master");
            facilityType = facilityTypeResult[0];
            message = "Facility type deactivate successfully!"

          }else{
            facilityTypeResult = await knex
            .update({ isActive: true })
            .where({ id: payload.id })
            .returning(["*"])
            .transacting(trx)
            .into("facility_type_master");
          facilityType = facilityTypeResult[0];
          message = "facility type activate successfully!"
          }
        }
        trx.commit;

      })
      return res.status(200).json({
        data: {
          facilityType: facilityType
        },
        message: message
      });
    }catch(err){
      console.log(
        "[controllers][facilityType][toggleFacilityType] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },
  getFacilityTypeListForDropdown:async(req,res)=>{
    console.log("facility type")
    try{
      let orgId= req.orgId
      let facilityTypeList = await
      knex
      .from("facility_type_master")
      .select([
        "facility_type_master.id",
        "facility_type_master.facilityTypeName"
      ])
      .where({"facility_type_master.orgId":orgId,"facility_type_master.isActive":true})
      .groupBy(["facility_type_master.id","facility_type_master.facilityTypeName"])
      .orderBy("facility_type_master.facilityTypeName","asc")

      return res.status(200).json({
        data: {
          facilityType: facilityTypeList
        },
        message: "Facility type list"
      });

    }catch(err){
      console.log(
        "[controllers][facilityType][toggleFacilityType] :  Error",
        err
      );
      // res.status(500).json({
      //   errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      // });
    }
  }
};
module.exports = FacilityTypeController;

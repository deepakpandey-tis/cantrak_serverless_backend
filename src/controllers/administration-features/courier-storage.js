const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const serviceRequest = require("../servicerequest");
const fs = require("fs");
const request = require("request");
const path = require("path");

const courierStorageController = {
  addCourier: async (req, res) => {
    try {
      let courier = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        const courierPayLoad = req.body;
        console.log("[Controllers][Courier][add]", courierPayLoad);

        const schema = Joi.object().keys({
          courierCode: Joi.string().required(),
          courierName: Joi.string().required(),
          mobileNo: Joi.string().required(),
          website: Joi.string().optional(),
          address: Joi.string().required(),
        });
        const result = Joi.validate(courierPayLoad, schema);
        console.log("[Controller][Courier][add]:Joi result", result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existCourierCode = await knex("courier").where({
          courierCode: courierPayLoad.courierCode.toUpperCase(),
          orgId: orgId,
        });
        console.log(
          "[controllers][courier][add]: courierCode",
          existCourierCode
        );
        if (existCourierCode && existCourierCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Courier Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const insertData = {
          ...courierPayLoad,
          orgId: orgId,
          createdBy: userId,
          courierCode: courierPayLoad.courierCode.toUpperCase(),
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log("[controllers][courier][add]: Insert Data", insertData);

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("courier");

        incident = incidentResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          category: incident,
        },
        message: "Courier added successfully !",
      });
    } catch (err) {
      console.log("[controllers][courier][courierAdd] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  updateCourier: async (req, res) => {
    try {
      let updateStatusPayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          courierCode: Joi.string().required(),
          courierName: Joi.string().required(),
          mobileNo: Joi.string().optional(),
          website: Joi.string().optional(),
          address: Joi.string().required(),
        });
        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existStatusCode = await knex("courier")
          .where({
            courierCode: statusPaylaod.courierCode.toUpperCase(),
            orgId: orgId,
          })
          .whereNot({ id: statusPaylaod.id });
        console.log(
          "[controllers][status][updateStatus]: Status Code",
          existStatusCode
        );
        if (existStatusCode && existStatusCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "STORAGE_EXIST_ERROR",
                message: "Storage Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();

        const updateStatusResult = await knex
          .update({
            courierCode: statusPaylaod.courierCode.toUpperCase(),
            courierName: statusPaylaod.courierName,
            mobileNo: statusPaylaod.mobileNo,
            website: statusPaylaod.website,
            address: statusPaylaod.address,
            updatedAt: currentTime,
          })
          .where({ id: statusPaylaod.id, createdBy: userId, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .into("courier");
        console.log(
          "[controllers][status][updateStatus]: Update Data",
          updateStatusResult
        );
        updateStatusPayload = updateStatusResult[0];
        trx.commit;
      });
      res.status(200).json({
        data: {
          courier: updateStatusPayload,
        },
        message: "Courier updated successfully !",
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getCourierList: async (req, res) => {
    try {
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "courierName";
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

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("courier")
          .leftJoin("users", "users.id", "courier.createdBy")
          .where({ "courier.orgId": req.orgId })
          .where((qb) => {
            if (searchValue) {
              qb.where("courier.courierCode", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.courierName", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.mobileNo", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.website", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.address", "iLIKE", `%${searchValue}%`);
            }
          })
          .first(),
        knex
          .from("courier")
          .leftJoin("users", "users.id", "courier.createdBy")
          .where({ "courier.orgId": req.orgId })
          .select([
            "courier.id as id",
            "courier.courierCode as Courier Code",
            "courier.courierName as Courier Name",
            "courier.mobileNo as Mobile Number",
            "courier.website",
            "courier.address",
            "courier.isActive as Status",
            "users.name as Created By",
            "courier.createdAt as Date Created",
          ])
          .where((qb) => {
            if (searchValue) {
              qb.where("courier.courierCode", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.courierName", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.mobileNo", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.website", "iLIKE", `%${searchValue}%`);
              qb.orWhere("courier.address", "iLIKE", `%${searchValue}%`);
            }
          })
          .orderBy(sortPayload.sortBy, sortPayload.orderBy)
          .offset(offset)
          .limit(per_page),
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
          courier: pagination,
        },
        message: "Courier List!",
      });
    } catch (err) {
      console.log("[controllers][couriers][getCouriers],Error", err);
    }
  },
  getCourierDetailById: async (req, res) => {
    try {
      let courierDetail = null;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        let payload = req.body;
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
        let courierResult = await knex("courier")
          .select("courier.*")
          .where({ id: payload.id, orgId: orgId });

        courierDetail = _.omit(courierResult[0], ["createdAt", "updatedAt"]);
        trx.commit;
      });
      return res.status(200).json({
        data: {
          courierDetails: courierDetail,
        },
        message: "Courier Details !!",
      });
    } catch (err) {
      console.log("[controllers][courier][courierDetails] :  Error", err);
    }
  },
  importCourierData:async(req,res)=>{
    try{
      const userId = req.me.id;
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      console.log("=======", data[0], "+++++++++++++++")
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)
      
      if(
        data[0].A == "Ã¯Â»Â¿COURIER_CODE" ||
        (data[0].A == "COURIER_CODE" &&
          data[0].B == "COURIER_NAME" &&
          data[0].C == "MOBILE_NO" &&
          data[0].D == "WEBSITE" &&
          data[0].E == "ADDRESS"
          )
      ){
        if(data.length>0){
          let i =0 
          for(let courierData of data){
            i++
            if(i>1){
              if(!courierData.A){
                let values = _.values(courierData)
                values.unshift("Courier code can not be empty")
                errors.push(values)
                fail++
                continue
              }
              if(!courierData.B){
                let values = _.values(courierData)
                values.unshift("Courier Name can not be empty")
                errors.push(values)
                fail++
                continue

              }
              if(!courierData.C){
                let values = _.values(courierData)
                values.unshift("Mobile Number can not be empty")
                errors.push(values)
                fail++
                continue

              }
              if(!courierData.E){
                let values = _.values(courierData)
                values.unshift("Address can not be empty")
                errors.push(values)
                fail++
                continue

              }

              let checkList = await knex("courier")
              .select("id")
              .where({courierCode:courierData.A.toUpperCase(),orgId:req.orgId})
              if(checkList.length<1){
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  courierCode: courierData.A.toUpperCase(),
                  courierName: courierData.B,
                  mobileNo: courierData.C,
                  website:courierData.D,
                  address:courierData.E,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  createdBy: userId
                }
                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("courier");
                  if(resultData && resultData.length){
                    success++
                  }

              }else{
                let values = _.values(courierData)
                values.unshift('Courier code already exists')
                errors.push(values)
                fail++
              }

            }
          }

          let message = null;
          if (totalData == success) {
            message =
              "System have processed ( " +
              totalData +
              " ) entries and added them successfully!";
          } else {
            message =
              "System have processed ( " +
              totalData +
              " ) entries out of which only ( " +
              success +
              " ) are added and others are failed ( " +
              fail +
              " ) due to validation!";
          }

          return res.status(200).json({
            message: message,
            errors: errors
          });
        }

      }else{
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });
      }

    }catch(err){
      console.log("[controllers][propertysetup][importCourierData] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },
  exportCourierData:async(req,res)=>{
    try{
      let reqData = req.query;
      let rows;
      [rows] = await Promise.all([
        knex.from("courier")
        .where({"courier.orgId":req.orgId})
        .select([
          "courier.courierCode as COURIER_CODE",
          "courier.courierName as COURIER_NAME",
          "courier.mobileNo as MOBILE_NO",
          "courier.website as WEBSITE",
          "courier.address as ADDRESS"
        ])
      ])
      let tempraryDirectory = null;
      let bucketName = null;
      if(process.env.IS_OFFLINE){
        bucketName = process.env.S3_BUCKET_NAME;
        tempraryDirectory = 'tmp/';
      }else{
        tempraryDirectory = '/tmp/';
        bucketName = process.env.S3_BUCKET_NAME;
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws;

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      }else{
        ws = XLSX.utils.json_to_sheet([
          {
            COURIER_CODE: "",
            COURIER_NAME: "",
            MOBILE_NO: "",
            WEBSITE:"",
            ADDRESS:""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "CourierData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer){
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Courier/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            res.status(500).json({
              errors: [
                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
              ],
            });
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = process.env.S3_BUCKET_URL+"/Export/Courier/" +
            filename;
            // let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Courier/" + filename;
            res.status(200).json({
              data: rows,
              message: "Courier data export successfully!",
              url: url
            });
          }
        });
      })
    }catch(err){
      console.log("[controllers][generalsetup][viewCourier] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },
  toggleCourier:async(req,res)=>{
    try{
      let courier = null
      let message;
      await knex.transaction(async trx=>{
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
        let courierResult
        let checkStatus = await knex.from('courier').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            courierResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("courier");
            courier = courierResult[0];
            message = "Courier deactivate successfully!"

          } else {

            courierResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("courier");
            courier = courierResult[0];
            message = "Courier activate successfully!"
          }
        }
        trx.commit

      })
      return res.status(200).json({
        data: {
          courier: courier
        },
        message: message
      });
    }catch(err){
      console.log(
        "[controllers][Courier][toggleCourier] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },
  getCourierListForParcel:async(req,res)=>{
    try{
      let pagination = {};
      let role = req.me.roles[0];
      let name = req.me.name;
      let result;
      let orgId = req.query.orgId;

      if(role === "superAdmin" && name === "superAdmin"){
        if(orgId){
          [result] = await Promise.all([
            knex("courier")
            .select("id","courierName as CourierName")
            .where({isActive:true,orgId:orgId})
            .orderBy('courier.courierName','asc')
          ])

        }else{
          [result] =await Promise.all([
            knex("courier")
            .select("id","courierName as CourierName")
            .where({isActive:true})
            .orderBy('courier.courierName','asc')
          ])
        }
      }else{
        [result] = await Promise.all([
          knex("courier")
          .select("id","courierName as CourierName")
          .where({isActive:true,orgId:req.orgId})
          .orderBy('courier.courierName','asc')

        ])
      }
      pagination.data = result;
      return res.status(200).json({
        data: {
          courier: pagination
        },
        message: "Couriers List!"
      });
    }catch(err){
      console.log("[controllers][generalsetup][viewCourier] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // getCarrier:async(req,res)=>{
  //   try{
  //     let orgId = req.orgId
  //     let carrier = await knex
  //     .from("courier")
  //     .
  //   }catch(err){}
  // }
};
module.exports = courierStorageController;

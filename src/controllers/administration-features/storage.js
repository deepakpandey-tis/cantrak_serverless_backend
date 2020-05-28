const Joi = require("@hapi/joi");
const knex = require("../../db/knex");
const _ = require("lodash");
const fs = require("fs");
const XLSX = require("xlsx");
var jwt = require("jsonwebtoken");


const storageController = {
  addStorage: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        const storagePayload = req.body;
        console.log("[Controllers][Storage][add]", storagePayload);
        const schema = Joi.object().keys({
          storageCode: Joi.string().required(),
          storageName: Joi.string().required(),
          description: Joi.string().optional(),
        });
        const result = Joi.validate(storagePayload, schema);
        console.log("[Controller][storage][add]:Joi result", result);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existStorageCode = await knex("storage").where({
          storageCode: storagePayload.storageCode.toUpperCase(),
          orgId: orgId,
        });
        console.log(
          "[controllers][storage][add]: storageCode",
          existStorageCode
        );
        if (existStorageCode && existStorageCode.length) {
          return res.status(400).json({
            errors: [
              {
                code: "TYPE_CODE_EXIST_ERROR",
                message: "Storage Code already exist !",
              },
            ],
          });
        }
        const currentTime = new Date().getTime();
        const insertData = {
          ...storagePayload,
          orgId: orgId,
          createdBy: userId,
          storageCode: storagePayload.storageCode.toUpperCase(),
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        console.log("[controllers][storage][add]: Insert Data", insertData);

        const incidentResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("storage");

        incident = incidentResult[0];
        trx.commit;
      });
      res.status(200).json({
        data: {
          category: incident,
        },
        message: "Storage added successfully !",
      });
    } catch (err) {
      console.log("[controllers][storage][storageAdd] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  updateStorage: async (req, res) => {
    try {
      let updateStatusPayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;

      await knex.transaction(async (trx) => {
        let statusPaylaod = req.body;

        const schema = Joi.object().keys({
          id: Joi.number().required(),
          storageCode: Joi.string().required(),
          storageName: Joi.string().required(),
          description: Joi.string().optional(),
        });

        const result = Joi.validate(statusPaylaod, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }
        const existStatusCode = await knex("storage")
          .where({
            storageCode: statusPaylaod.storageCode.toUpperCase(),
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
            storageCode: statusPaylaod.storageCode.toUpperCase(),
            storageName: statusPaylaod.storageName,
            description: statusPaylaod.description,
            updatedAt: currentTime,
          })
          .where({
            id: statusPaylaod.id,
            createdBy: userId,
            orgId: orgId,
          })
          .returning(["*"])
          .transacting(trx)
          .into("storage");

        console.log(
          "[controllers][status][updateStatus]: Update Data",
          updateStatusResult
        );
        updateStatusPayload = updateStatusResult[0];
        trx.commit;
      });
      res.status(200).json({
        data: {
          storage: updateStatusPayload,
        },
        message: "Storage updated successfully !",
      });
    } catch (err) {
      console.log("[controllers][status][updateStatus] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getStorageList: async (req, res) => {
    try {
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "storageName";
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
          .from("storage")
          .leftJoin("users", "users.id", "storage.createdBy")
          .where({ "storage.orgId": req.orgId })
          .where((qb) => {
            if (searchValue) {
              qb.where("storage.storageCode", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.storageName", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.description", "iLIKE", `%${searchValue}%`);
            }
          })
          .first(),
        knex
          .from("storage")
          .leftJoin("users", "users.id", "storage.createdBy")
          .where({ "storage.orgId": req.orgId })
          .select([
            "storage.id as id",
            "storage.storageCode as Storage Code",
            "storage.storageName as Storage Name",
            "storage.description as Description",
            "storage.isActive as Status",
            "users.name as Created By",
            "storage.createdAt as Date Created",
          ])
          .where((qb) => {
            if (searchValue) {
              qb.where("storage.storageCode", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.storageName", "iLIKE", `%${searchValue}%`);
              qb.orWhere("storage.description", "iLIKE", `%${searchValue}%`);
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
          storage: pagination,
        },
        message: "storage List!",
      });
    } catch (err) {
      console.log("[controllers][storage][getStorage],Error", err);
    }
  },
  getStorageDetailsById: async (req, res) => {
    try {
      let storageDetail = null;
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
        let storageResult = await knex("storage")
          .select("storage.*")
          .where({ id: payload.id, orgId: orgId });

        storageDetail = _.omit(storageResult[0], ["createdAt", "updatedAt"]);
        trx.commit;
      });
      return res.status(200).json({
        data: {
          storageDetails: storageDetail,
        },
        message: "Storage Details !!",
      });
    } catch (err) {
      console.log("[controllers][storage][storageDetails] :  Error", err);
    }
  },
  importStorageData:async(req,res)=>{
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
        data[0].A == "Ã¯Â»Â¿STORAGE_CODE" ||
        (data[0].A == "STORAGE_CODE" &&
          data[0].B == "STORAGE_NAME" &&
          data[0].C == "DESCRIPTION"
         
          )
      ){
        if(data.length>0){
          let i =0
          for(let storageData of data){
            i++
            if(i>1){
              if(!storageData.A){
                let values = _.values(storageData)
                values.unshift("Storage code can not be empty")
                errors.push(values)
                fail++
                continue
              }
              if(!storageData.B){
                let values = _.values(storageData)
                values.unshift("Storage Name can not be empty")
                errors.push(values)
                fail++
                continue

              }
              let checkList = await knex("storage")
              .select("id")
              .where({storageCode:storageData.A.toUpperCase(),orgId:req.orgId})
              if(checkList.length<1){
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  storageCode: storageData.A.toUpperCase(),
                  storageName: storageData.B,
                  description: storageData.C,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  createdBy: userId

                }
                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("storage");
                  if(resultData && resultData.length){
                    success++
                  }

              }else{
                let values = _.values(storageData)
                values.unshift('Storage code already exists')
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
      console.log("[controllers][propertysetup][importStorageData] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportStorageData:async(req,res)=>{
    try{
      let reqData = req.query;
      let rows;
      [rows] = await Promise.all([
        knex.from("storage")
        .where({"storage.orgId":req.orgId})
        .select([
          "storage.storageCode as STORAGE_CODE",
          "storage.storageName as STORAGE_NAME",
          "storage.description as DESCRIPTION",
         
        ])
      ])
      let tempraryDirectory = null;
      let bucketName = null;
      if(process.env.IS_OFFLINE){
        bucketName = 'sls-app-resources-bucket';
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
            STORAGE_CODE: "",
            STORAGE_NAME: "",
            DESCRIPTION: "",
            
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "StorageData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer){
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Storage/" + filename,
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
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Storage/" + filename;
            res.status(200).json({
              data: rows,
              message: "Storage data export successfully!",
              url: url
            });
          }
        });
      })
    }catch(err){
      console.log("[controllers][generalsetup][viewStorage] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },
  toggleStorage:async(req,res)=>{
    try{
      let storage = null
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
        let storageResult
        let checkStatus = await knex.from('storage').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            storageResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("storage");
            storage = storageResult[0];
            message = "Storage deactivate successfully!"

          } else {

            storageResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("storage");
            storage = storageResult[0];
            message = "Storage activate successfully!"
          }
        }
        trx.commit

      })
      return res.status(200).json({
        data: {
          storage: storage
        },
        message: message
      });
    }catch(err){
      console.log(
        "[controllers][Storage][toggleStorage] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  }
};
module.exports = storageController;

const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");
const knex = require("../../db/knex");
const knexReader = require("../../db/knex-reader");
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const fs = require('fs');
const path = require('path');

const StrainController = {
  addStrain: async (req, res) => {
    try {
      let ab;
      let strain = null;
      let userId = req.me.id;

      const payload = req.body;

      const schema = Joi.object().keys({
        specieId: Joi.string().required(),
        name: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addStrain]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }

      // Check already exists
      const existStrain = await knex("strains")
        .where('name', 'iLIKE', payload.name)
        .where({ orgId: req.orgId, specieId: payload.specieId });

      console.log(
        "[controllers][administrationFeatures][addStrain]: ",
        existStrain
      );

      if (existStrain && existStrain.length) {

        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Strain already exist!" }
          ]
        });
      }

      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        createdBy: userId,
        createdAt: currentTime,
        updatedBy: userId,
        updatedAt: currentTime,
        orgId: req.orgId
      };

      console.log("Strain Payload: ", insertData);

      let insertResult = await knex
        .insert(insertData)
        .returning(["*"])
        .into("strains");
      strain = insertResult[0];

      return res.status(200).json({
        data: {
          strain: strain
        },
        message: "Strain added successfully."
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][addStrain] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updateStrain: async (req, res) => {
    try {
      let strain = null;
      let userId = req.me.id;

      const payload = req.body;

      const schema = Joi.object().keys({
        specieId: Joi.string().required(),
        id: Joi.string().required(),
        name: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updateStrain]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }

      // Check already exists
      const existStrain = await knex("strains")
        .where('name', 'iLIKE', payload.name)
        .where({ orgId: req.orgId, specieId: payload.specieId })
        .whereNot({ id: payload.id });

      console.log(
        "[controllers][administrationFeatures][updateStrain]: ",
        existStrain
      );

      if (existStrain && existStrain.length) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: "Strain already exist!"
            }
          ]
        });
      }

      let currentTime = new Date().getTime();
      let insertData = { ...payload, updatedBy: userId, updatedAt: currentTime };
      let insertResult = await knex
        .update(insertData)
        .where({ id: payload.id, orgId: req.orgId })
        .returning(["*"])
        .into("strains");
      strain = insertResult[0];

      return res.status(200).json({
        data: {
          strain: strain
        },
        message: "Strain updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][updateStrain] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  viewStrain: async (req, res) => {
    try {
      let strain = null;

      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required()
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }
      let current = new Date().getTime();
      let strainResult = await knexReader("strains")
        .select("strains.*")
        .where({ id: payload.id, orgId: req.orgId });

      strain = _.omit(strainResult[0], [
        "createdAt",
        "updatedAt",
        "isActive"
      ]);

      return res.status(200).json({
        data: {
          strain: strain
        },
        message: "Strain detail"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][viewStrain] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deleteStrain: async (req, res) => {
    try {
      let strain = null;
      let userId = req.me.id;
      let message;

      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required()
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }

      let currentTime = new Date().getTime();
      let check = await knexReader('strains').select('isActive').where({ id: payload.id, orgId: req.orgId }).first()
      let sqlResult
      if (check.isActive) {
        sqlResult = await knex
          .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
          .where({ id: payload.id, orgId: req.orgId })
          .returning(["*"])
          .into("strains");
        message = "Strain Deactivate successfully!"
      } else {
        sqlResult = await knex
          .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
          .where({ id: payload.id, orgId: req.orgId })
          .returning(["*"])
          .into("strains");
        message = "Strain Activate successfully!"
      }
      strain = sqlResult[0];

      return res.status(200).json({
        data: {
          strain: strain
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][deleteStrain] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getStrainList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "name";
        sortPayload.orderBy = "asc"
      }
      let reqData = req.query;
      let pagination = {};

      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let { name } = req.body;

      let [total, rows] = await Promise.all([
        knexReader
          .count("* as count")
          .from("strains")
          .leftJoin("users", "users.id", "strains.createdBy")
          .leftJoin("species", "species.id", "strains.specieId")
          .where({ "strains.orgId": req.orgId })
          .where({
            "species.isActive": true,
            "species.orgId": req.orgId
          })
          .where(qb => {
            if (name) {
              qb.where('strains.name', 'iLIKE', `%${name}%`)
              qb.orWhere('species.name', 'iLIKE', `%${name}%`)
            }
          })
          .first(),
        knexReader
          .from("strains")
          .leftJoin("users", "users.id", "strains.createdBy")
          .leftJoin("species", "species.id", "strains.specieId")
          .where({ "strains.orgId": req.orgId })
          .where({
            "species.isActive": true,
            "species.orgId": req.orgId
          })
          .select([
            "strains.id",
            "strains.name as name",
            "strains.isActive as Status",
            "users.name as Created By",
            "strains.createdAt as Date Created",
            "strains.specieId as specieId",
            "species.name as specieName",
          ])
          .where(qb => {
            if (name) {
              qb.where('strains.name', 'iLIKE', `%${name}%`)
              qb.orWhere('species.name', 'iLIKE', `%${name}%`)
            }
          })
          .orderBy(sortPayload.sortBy, sortPayload.orderBy)
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
          strains: pagination
        },
        message: "Strain List!"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getStrainList] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  exportStrain: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let orgId = req.orgId;
      let rows = null;
      if (!companyId) {
        [rows] = await Promise.all([
          knexReader("strains")
            .leftJoin("species", "species.id", "strains.specieId")
            .select([
              "strains.name as STRAIN_NAME",
              "species.name as SPECIE_NAME",
            ])
            .where({ "strains.orgId": orgId })
            .orderBy([{ column: 'species.name', order: 'asc' }, { column: 'strains.name', order: 'asc' }])
        ]);
      } else {
        [rows] = await Promise.all([
          knexReader("strains")
            .leftJoin("species", "species.id", "strains.specieId")
            .select([
              "strains.name as STRAIN_NAME",
              "species.name as SPECIE_NAME",
            ])
            .where({
              "strains.orgId": orgId,
            })
        ]);
      }
      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = process.env.S3_BUCKET_NAME;
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws

      if (rows && rows.length) {
        var ws = XLSX.utils.json_to_sheet(rows);

      } else {
        ws = XLSX.utils.json_to_sheet([{
          STRAIN_NAME: '',
          SPECIE_NAME: ''
        }]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "StrainData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Strain/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            // let deleteFile = fs.unlink(filepath, err => {
            //   console.log("File Deleting Error " + err);
            // });
            let url = process.env.S3_BUCKET_URL + "/Export/Strain/" +
              filename;
            // let url =
            //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Strain/" +
            //   filename;
            res.status(200).json({
              data: rows,
              message: "Strain Data Exported Successfully!",
              url: url
            });
          }
        });
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][exportStrain] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  importStrainData: async (req, res) => {
    try {
      // if (req.file) {
      //   console.log(req.file);
      //   let tempraryDirectory = null;
      //   if (process.env.IS_OFFLINE) {
      //     tempraryDirectory = "tmp/";
      //   } else {
      //     tempraryDirectory = "/tmp/";
      //   }
      //   let resultData = null;
      //   let file_path = tempraryDirectory + req.file.filename;
      //   let wb = XLSX.readFile(file_path, { type: "binary" });
      //   let ws = wb.Sheets[wb.SheetNames[0]];
      //   let data = XLSX.utils.sheet_to_json(ws, {
      //     type: "string",
      //     header: "A",
      //     raw: false
      //   });
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let currentTime = new Date().getTime();
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)


      if (
        data[0].A == "Ã¯Â»Â¿STRAIN_NAME" ||
        (data[0].A == "STRAIN_NAME" &&
          data[0].B == "SPECIE_NAME"
        )
      ) {
        if (data.length > 0) {
          let i = 0;
          console.log("Data[0]", data[0]);
          for (let strainData of data) {
            i++;
            if (i > 1) {
              if (!strainData.A) {
                let values = _.values(strainData)
                values.unshift('Strain can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!strainData.B) {
                let values = _.values(strainData)
                values.unshift('Specie can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              //  Get Specie Id
              let specieId;

              let recId = await knexReader("species")
                .select("id")
                .where('name', 'iLIKE', strainData.B)
                .where({ orgId: req.orgId });
              if (recId && recId.length) {
                specieId = recId[0].id;
              }

              if (!specieId) {
                console.log("breaking due to: null specieId");
                fail++;
                let values = _.values(strainData)
                values.unshift('Specie ID does not exist')

                errors.push(values);
                continue;
              }

              let checkExist = await knexReader("strains")
                .select("name")
                .where('name', 'iLIKE', strainData.A)
                .where({ orgId: req.orgId, specieId: specieId })
              if (checkExist.length < 1 && strainData.A) {
                success++;
                let insertData = {
                  orgId: req.orgId,
                  specieId: specieId,
                  name: strainData.A,
                  isActive: true,
                  createdBy: req.me.id,
                  createdAt: currentTime,
                  updatedBy: req.me.id,
                  updatedAt: currentTime
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("strains");
              } else {
                let values = _.values(strainData)
                values.unshift('Strain already exists')
                errors.push(values);
                fail++;
              }
            }
          }

          // let deleteFile = await fs.unlink(file_path, err => {
          //   console.log("File Deleting Error " + err);
          // });
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
      } else {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });
      }
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importStrainData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getAssetListForWorkOrderFilter: async (req, res) => {
    try {
      let assets = await knexReader
        .from('task_group_schedule_assign_assets')
        .leftJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
        .leftJoin('task_group_schedule', 'task_group_schedule_assign_assets.scheduleId', 'task_group_schedule.id')
        .select([
          // 'asset_master.id',
          'asset_master.assetName',
          'asset_master.description',
          'asset_master.displayId',
          'asset_master.assetSerial',
          'task_group_schedule_assign_assets.assetId as id'
        ])
        .where({ 'task_group_schedule_assign_assets.orgId': req.orgId, 'task_group_schedule.taskGroupId': req.body.id, 'asset_master.isActive': true })

      let assetList = _.uniqBy(assets, "id")

      return res.status(200).json({
        data: {
          assets: assetList
        },
        message: "Asset  List!"
      });
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
    }
  },
  getAssetListForWorkOrderList: async (req, res) => {
    try {
      let assets = await knexReader
        .from('task_group_schedule_assign_assets')
        .leftJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
        .leftJoin('task_group_schedule', 'task_group_schedule_assign_assets.scheduleId', 'task_group_schedule.id')
        .select([
          // 'asset_master.id',
          'asset_master.assetName',
          'asset_master.description',
          'asset_master.displayId',
          'asset_master.assetSerial',
          'task_group_schedule_assign_assets.assetId as id'
        ])
        .where({ 'task_group_schedule_assign_assets.orgId': req.orgId, 'asset_master.isActive': true })

      let assetList = _.uniqBy(assets, "id")

      return res.status(200).json({
        data: {
          assets: assetList
        },
        message: "Asset  List!"
      });
    } catch (err) {
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
    }
  },

  //
  getAllStrainList: async (req, res) => {
    try {

      let resourcePlantations = req.userPlantationResources[0].plantations;
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "strains.name";
        sortPayload.orderBy = "asc"
      }
      let orgId = req.orgId;

      let rows = await knexReader
        .from("strains")
        .leftJoin("species", "species.id", "strains.specieId")
        .where({ "strains.orgId": orgId })
        .where({
          "species.isActive": true,
          "species.orgId": orgId
        })
        .select([
          "strains.id",
          "strains.name as name",
          "strains.isActive as Status",
          "strains.specieId as specieId",
          "species.name as specieName",
        ])
        .orderBy(sortPayload.sortBy, sortPayload.orderBy)

      return res.status(200).json({
        data: {
          records: rows
        },
        message: "All Strain List!"
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][getAllStrainList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  //
};

module.exports = StrainController;

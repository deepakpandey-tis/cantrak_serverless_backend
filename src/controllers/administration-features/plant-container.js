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
const fs = require("fs");
const path = require("path");



const plantContainerController = {
  addPlantContainer: async (req, res) => {
    try {
      let orgId = req.orgId;
      let userId = req.me.id;

      let plantContainer = null;

      const payload = req.body;

      const schema = Joi.object().keys({
        companyId: Joi.string().required(),
        plantationId: Joi.string().required(),
        plantationPhaseId: Joi.string().required(),
        //createdBy: Joi.string().required(),
        plantationGroupId: Joi.string().required(),
        containerNumber: Joi.string().required(),
        description: Joi.string().allow("").optional(),
        productCode: Joi.string().allow("").optional(),
        area: Joi.string().allow("").optional(),
        containerTypeId: Joi.string().allow("").optional(),
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][addPlantContainer]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }

      /*CHECK DUPLICATE VALUES OPEN */
      let existValue = await knex('plant_containers')
        .where({
          //companyId:payload.companyId,
          //plantationId:payload.plantationId,
          plantationPhaseId: payload.plantationPhaseId,
          containerNumber: payload.containerNumber.toUpperCase(),
          orgId: orgId
        });
      if (existValue && existValue.length) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Plant Container Number already exist!" }
          ]
        });
      }
      /*CHECK DUPLICATE VALUES CLOSE */

      /*    plantationType is NOT saved in plant_containers   
            /*GET Plantation TYPE ID OPEN *
            let plantationPhaseData = await knexReader('plantation_phases')
              .select('plantationTypeId')
              .where({ id: payload.plantationPhaseId }).first();
            let propertyType = plantationPhaseData.plantationTypeId;
            /*GET Plantation TYPE ID OPEN *
       */
      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        containerNumber: payload.containerNumber.toUpperCase(),
        createdBy: userId,
        orgId: orgId,
        createdAt: currentTime,
        updatedBy: userId,
        updatedAt: currentTime,
        // plantationTypeId: propertyType,
      };
      let insertResult = await knex
        .insert(insertData)
        .returning(["*"])
        .into("plant_containers");
      plantContainer = insertResult[0];

      return res.status(200).json({
        data: {
          plantContainer: plantContainer
        },
        message: "Plant Container added successfully."
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][addPlantContainer] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updatePlantContainer: async (req, res) => {
    try {
      let plantContainer = null;
      let orgId = req.orgId;
      let userId = req.me.id;

      const payload = req.body;
      
      const schema = Joi.object().keys({
        id: Joi.string().required(),
        companyId: Joi.string().required(),
        plantationId: Joi.string().required(),
        plantationPhaseId: Joi.string().required(),
        plantationGroupId: Joi.string().required(),
        containerNumber: Joi.string().required(),
        description: Joi.string().allow("").allow(null).optional(),
        productCode: Joi.string().allow("").allow(null).optional(),
        area: Joi.string().allow("").allow(null).optional(),
        containerTypeId: Joi.string().allow("").allow(null).optional(),
      });

      const result = Joi.validate(payload, schema);
      console.log(
        "[controllers][administrationFeatures][updatePlantContainer]: JOi Result",
        result
      );

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: result.error.message }
          ]
        });
      }


      /*CHECK DUPLICATE VALUES OPEN */
      let existValue = await knex('plant_containers')
        .where({
          //companyId:payload.companyId,
          //plantationId:payload.plantationId,
          plantationPhaseId: payload.plantationPhaseId,
          containerNumber: payload.containerNumber.toUpperCase(),
          orgId: orgId
        });
      if (existValue && existValue.length) {

        if (existValue[0].id === payload.id) {

        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Plant Container Number already exist!" }
            ]
          });
        }
      }
      /*CHECK DUPLICATE VALUES CLOSE */


      /*    plantationType is NOT saved in plant_containers   
      /*GET PROPERTY TYPE ID OPEN *
      let buildingData = await knexReader('plantation_phases')
        .select('propertyTypeId')
        .where({ id: payload.plantationPhaseId }).first();
      let propertyType = buildingData.propertyTypeId;
      /*GET PROPERTY TYPE ID OPEN *
      */

      let currentTime = new Date().getTime();
      let insertData = {
        ...payload,
        containerNumber: payload.containerNumber.toUpperCase(),
        updatedBy: userId,
        updatedAt: currentTime,
        // propertyTypeId: propertyType
      };
      let insertResult = await knex
        .update(insertData)
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"])
        .into("plant_containers");
      plantContainer = insertResult[0];

      return res.status(200).json({
        data: {
          plantContainer: plantContainer
        },
        message: "Plant Container detail updated successfully."
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][updatePlantContainer] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  viewPlantContainer: async (req, res) => {
    try {
      let plantContainer = null;
      let orgId = req.orgId;
      let userId = req.me.id;

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
      let plantContainerResult = await knexReader
        .select()
        .where({ id: payload.id, orgId: orgId })
        .returning(["*"])
        .into("plant_containers");

      plantContainer = _.omit(plantContainerResult[0], [
        "createdAt",
        "updatedAt",
        "isActive"
      ]);

      //console.log('plant container: ', plantContainer);
      return res.status(200).json({
        data: {
          plantContainer: plantContainer
        },
        message: "Plant Container detail"
      });

    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][viewPlantContainer] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deletePlantContainer: async (req, res) => {
    try {
      let plantContainer = null;
      let orgId = req.orgId;
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
      let plantContainerResult;
      let currentTime = new Date().getTime();

      let checkStatus = await knex.from('plant_containers').where({ id: payload.id }).returning(['*'])
      if (checkStatus && checkStatus.length) {

        if (checkStatus[0].isActive == true) {

          plantContainerResult = await knex
            .update({ isActive: false, updatedBy: userId, updatedAt: currentTime})
            .where({ id: payload.id })
            .returning(["*"])
            .into("plant_containers");
          plantContainer = plantContainerResult[0];
          message = "Plant Container Deactivate successfully!"

        } else {

          plantContainerResult = await knex
            .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
            .where({ id: payload.id })
            .returning(["*"])
            .into("plant_containers");
          plantContainer = plantContainerResult[0];
          message = "Plant Container Activate successfully!"

        }
      }

      return res.status(200).json({
        data: {
          plantContainer: plantContainer
        },
        message: message
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][deletePlantContainer] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantContainerList: async (req, res) => {

    try {
      let resourcePlantations = req.userPlantationResources[0].plantations;

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "plant_containers.containerNumber";
        sortPayload.orderBy = "asc"
      }
      let { companyId,
        plantationPhaseId,
        plantationGroupId,
        plantationId,
        containerNumber
      } = req.body;
      let orgId = req.orgId;

      let reqData = req.query;
      let pagination = {};

      if (companyId || plantationId || plantationPhaseId || plantationGroupId || containerNumber) {

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plant_containers")
            .leftJoin('users', 'plant_containers.createdBy', 'users.id')
            .leftJoin('plantation_groups', 'plant_containers.plantationGroupId', 'plantation_groups.id')
            .where({ "plantation_groups.isActive": true })
            .where({ "plant_containers.orgId": orgId })
            .where(qb => {
              if (companyId) {
                qb.where('plant_containers.companyId', companyId)
              }

              if (plantationId) {
                qb.where('plant_containers.plantationId', plantationId)
              }

              if (plantationPhaseId) {
                qb.where('plant_containers.plantationPhaseId', plantationPhaseId)
              }

              if (plantationGroupId) {
                qb.where('plant_containers.plantationGroupId', plantationGroupId)
              }

              if (containerNumber) {
                qb.where('plant_containers.containerNumber', 'iLIKE', `%${containerNumber}%`)
              }
            })
            .whereIn('plant_containers.plantationId', resourcePlantations)
            .first(),
          knexReader
            .from("plant_containers")
            .leftJoin("companies", "plant_containers.companyId", "companies.id")
            .leftJoin('users', 'plant_containers.createdBy', 'users.id')
            .leftJoin('plantation_groups', 'plant_containers.plantationGroupId', 'plantation_groups.id')
            .where({ "plantation_groups.isActive": true })
            .select([
              "plant_containers.id as id",
              "plant_containers.containerNumber as containerNumber",
              "plant_containers.description as description",
              "plant_containers.area as area",
              "plant_containers.isActive as status",
              "users.name as Created By",
              "plant_containers.createdAt as Date Created"
            ])
            .where({ "plant_containers.orgId": orgId })
            .where(qb => {
              if (companyId) {
                qb.where('plant_containers.companyId', companyId)
              }

              if (plantationId) {
                qb.where('plant_containers.plantationId', plantationId)
              }

              if (plantationPhaseId) {
                qb.where('plant_containers.plantationPhaseId', plantationPhaseId)
              }

              if (plantationGroupId) {
                qb.where('plant_containers.plantationGroupId', plantationGroupId)
              }

              if (containerNumber) {
                qb.where('plant_containers.containerNumber', 'iLIKE', `%${containerNumber}%`)
              }

            })
            .whereIn('plant_containers.plantationId', resourcePlantations)
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
          //.orderBy('desc', 'plant_containers.containerNumber')

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

      } else {

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knexReader
            .count("* as count")
            .from("plant_containers")
            .leftJoin('users', 'plant_containers.createdBy', 'users.id')
            .leftJoin('plantation_groups', 'plant_containers.plantationGroupId', 'plantation_groups.id')
            .where({ "plantation_groups.isActive": true })
            .where({ "plant_containers.orgId": orgId })
            .whereIn('plant_containers.plantationId', resourcePlantations)
            .first(),
          knexReader("plant_containers")
            .leftJoin('users', 'plant_containers.createdBy', 'users.id')
            .leftJoin('plantation_groups', 'plant_containers.plantationGroupId', 'plantation_groups.id')
            .where({ "plantation_groups.isActive": true })
            .select([
              "plant_containers.id as id",
              "plant_containers.containerNumber as containerNumber",
              "plant_containers.description as description",
              "plant_containers.area as area",
              "plant_containers.isActive as status",
              "users.name as Created By",
              "plant_containers.createdAt as Date Created"
            ])
            .where({ "plant_containers.orgId": orgId })
            .whereIn('plant_containers.plantationId', resourcePlantations)
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
          // .orderBy('desc','plant_containers.containerNumber')
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

      }
      return res.status(200).json({
        data: {
          plantContainers: pagination
        },
        message: "Plant Container List!"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantContainerList] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  exportPlantContainer: async (req, res) => {
    try {
      let orgId = req.orgId;

      let companyId = req.query.companyId;
      let reqData = req.query;
      let rows = null;

      if (!companyId) {
        [rows] = await Promise.all([
          knexReader("plant_containers")
            .innerJoin("companies", "plant_containers.companyId", "companies.id")
            .innerJoin("plantations", "plant_containers.plantationId", "plantations.id")
/*             .innerJoin(
              "plantation_types",
              "plant_containers.plantationTypeId",
              "plantation_types.id"
            )
 */            
            .innerJoin(
              "plantation_phases",
              "plant_containers.plantationPhaseId",
              "plantation_phases.id"
            )
            .innerJoin(
              "plantation_groups",
              "plant_containers.plantationGroupId",
              "plantation_groups.id"
            )
            .innerJoin("users", "plant_containers.createdBy", "users.id")
            .leftJoin(
              "container_types",
              "plant_containers.containerTypeId",
              "container_types.id"
            )
            .select([
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "plantations.code as PLANTATION",
              "plantations.name as PLANTATION_NAME",
              // "plantation_types.code as PLANTATION_TYPE_CODE",
              "plantation_phases.code as PLANTATION_PHASE_CODE",
              "plantation_groups.code as PLANTATION_GROUP_CODE",
              "container_types.code as CONTAINER_TYPE_CODE",
              "plant_containers.containerNumber as CONTAINER_NUMBER",
              "plant_containers.description as DESCRIPTION",
              "plant_containers.area as AREA",
              "plant_containers.productCode as PRODUCT_CODE",

            ])
            .where({ "plant_containers.orgId": orgId })
            .where({ "plantation_groups.isActive": true })
        ]);
      } else {
        [rows] = await Promise.all([
          knexReader
            .from("plant_containers")
            .innerJoin("companies", "plant_containers.companyId", "companies.id")
            .innerJoin("plantations", "plant_containers.plantationId", "plantations.id")
/*             .innerJoin(
              "plantation_types",
              "plant_containers.plantationTypeId",
              "plantation_types.id"
            )
 */            
            .innerJoin(
              "plantation_phases",
              "plant_containers.plantationPhaseId",
              "plantation_phases.id"
            )
            .innerJoin(
              "plantation_groups",
              "plant_containers.plantationGroupId",
              "plantation_groups.id"
            )
            .innerJoin("users", "plant_containers.createdBy", "users.id")
            .leftJoin(
              "container_types",
              "plant_containers.containerTypeId",
              "container_types.id"
            )
            .select([
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "plantations.code as PLANTATION",
              "plantations.name as PLANTATION_NAME",
              // "plantation_types.code as PLANTATION_TYPE_CODE",
              "plantation_phases.code as PLANTATION_PHASE_CODE",
              "plantation_groups.code as PLANTATION_GROUP_CODE",
              "container_types.code as CONTAINER_TYPE_CODE",
              "plant_containers.containerNumber as CONTAINER_NUMBER",
              "plant_containers.description as DESCRIPTION",
              "plant_containers.area as AREA",
              "plant_containers.productCode as PRODUCT_CODE",
            ])
            .where({
              "plant_containers.companyId": companyId,
              "plant_containers.orgId": orgId,
            })
            .where({ "plantation_groups.isActive": true })
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
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            COMPANY: "",
            "COMPANY_NAME": "",
            PLANTATION: "",
            "PLANTATION_NAME": "",
            PLANTATION_TYPE_CODE: "",
            PLANTATION_PHASE_CODE: "",
            PLANTATION_GROUP_CODE: "",
            "CONTAINER_TYPE_CODE": "",
            CONTAINER_NUMBER: "",
            DESCRIPTION: "",
            "AREA": "",
            "PRODUCT_CODE": "",
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PlantContainerData-" + moment(Date.now()).format("YYYYMMDD") + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/PlantContainer/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);

          } else {
            console.log("File uploaded Successfully");
            let url = process.env.S3_BUCKET_URL + "/Export/PlantContainer/" +
              filename;
            //let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/PlantContainer/" + filename;

            return res.status(200).json({
              data: rows,
              message: "Plant Container Data Export Successfully!",
              url: url
            });
          }
        });
        // return res.status(200).json({
        //   data: rows,
        //   message: "Property Units Data Export Successfully!",
        //   // url: url
        // });

      });
      // let deleteFile = await fs.unlink(filepath, err => {
      //   console.log("File Deleting Error " + err);
      // });

    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][exportPlantContainer] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantContainerDetail: async (req, res) => {
    try {
      let orgId = req.orgId;

      let id = req.body.id;

      let resultData = await knexReader("plant_containers")
        .leftJoin("companies", "plant_containers.companyId", "companies.id")
        .leftJoin("plantations", "plant_containers.plantationId", "plantations.id")
/*         .leftJoin(
          "plantation_types",
          "plant_containers.plantationTypeId",
          "plantation_types.id"
        )

 */        .leftJoin(
          "plantation_phases",
          "plant_containers.plantationPhaseId",
          "plantation_phases.id"
        )
        .leftJoin(
          "plantation_groups",
          "plant_containers.plantationGroupId",
          "plantation_groups.id"
        )
        .leftJoin(
          "container_types",
          "plant_containers.containerTypeId",
          "container_types.id"
        )
        .leftJoin("users", "plant_containers.createdBy", "users.id")
        .select([
          "plant_containers.id as id",
          "plant_containers.description as description",
          "plant_containers.productCode as productCode",
          "plant_containers.area as area",
          "plant_containers.containerNumber as containerNumber",
          "companies.companyName as companyName",
          "companies.companyId as companyId",
          "plantations.code as plantationCode",
          "plantations.name as plantationName",
          // "plantation_types.name as plantationTypeName",
          // "plantation_types.code as plantationTypeCode",
          "plantation_phases.code as plantationPhaseCode",
          "plantation_groups.code as plantationGroupCode",
          "users.name as createdBy",
          "plant_containers.isActive",
          "plantation_phases.description as plantationPhaseDescription",
          "plantation_groups.description as plantationGroupDescription",
          "container_types.code as containerTypeCode",
          "container_types.descriptionEng as containerTypeDescriptionEng",

        ])
        .where({ "plant_containers.id": id });

      return res.status(200).json({
        data: {
          plantContainer: resultData[0]
        },
        message: "Plant Container Detail!"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantContainerDetail] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantContainerListByGroup: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { plantationGroupId, type } = req.body;
      const plantContainer = await knexReader("plant_containers")
        .select("*")
        .where({ plantationGroupId, orgId: orgId, isActive: true, type: type });
      return res.status(200).json({
        data: {
          plantContainer
        },
        message: "Plant Container list"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantContainerListByGroup] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantContainerAllList: async (req, res) => {
    try {
      let orgId = req.orgId;

      let floorId = req.query.floorId;
      let result = await knexReader("plant_containers")
        .select(["id", "containerNumber", "houseId"])
        .where({ plantationGroupId: floorId, orgId: orgId, type: 1 });

      return res.status(200).json({
        data: {
          plantContainers: result
        },
        message: "Plant Container List"
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /* pg888: not required
  checkHouseId: async (req, res) => {
    try {
      const id = req.body.id;
      const [houseId, houseIdData] = await Promise.all([
        knexReader("user_house_allocation")
          .where({ houseId: id })
          .select("userId"),
        knexReader("plant_containers")
          .where({ houseId: id })
          .select("*")
      ]);

      return res.status(200).json({
        data: {
          exists: houseId,
          houseIdData: houseIdData
        }
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  */
  importPlantContainerData: async (req, res) => {
    try {
      let data = req.body;
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)
      //console.log('DATA: ',data)
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;

      if (
        data[0].A == "Ã¯Â»Â¿COMPANY" ||
        (data[0].A == "COMPANY" &&
          data[0].B == "COMPANY_NAME" &&
          data[0].C == "PLANTATION" &&
          data[0].D == "PLANTATION_NAME" &&
          // data[0].E == "PLANTATION_TYPE_CODE" &&
          data[0].E == "PLANTATION_PHASE_CODE" &&
          data[0].F == "PLANTATION_GROUP_CODE" &&
          data[0].G == "CONTAINER_TYPE_CODE" &&
          data[0].H == "CONTAINER_NUMBER" &&
          data[0].I == "DESCRIPTION" &&
          data[0].J == "AREA" &&
          data[0].K == "PRODUCT_CODE"
        )
      ) {
        if (data.length > 0) {
          let i = 0;
          console.log("Data[0]", data[0]);
          for (let plantContainerData of data) {

            i++;

            if (i > 1) {


              if (!plantContainerData.A) {
                let values = _.values(plantContainerData)
                values.unshift('Company Id can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantContainerData.C) {
                let values = _.values(plantContainerData)
                values.unshift('Plantation Code can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }

/*               if (!plantContainerData.E) {
                let values = _.values(plantContainerData)
                values.unshift('Plantation Type Code can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }
 */
              if (!plantContainerData.E) {
                let values = _.values(plantContainerData)
                values.unshift('Plantation Phase Code can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantContainerData.F) {
                let values = _.values(plantContainerData)
                values.unshift('Plantation Group Code can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantContainerData.G) {
                let values = _.values(plantContainerData)
                values.unshift('Container Type Code can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!plantContainerData.H) {
                let values = _.values(plantContainerData)
                values.unshift('Container number can not be empty!')
                errors.push(values);
                fail++;
                continue;
              }

              // Query from different tables and get data
              let companyId = null;
              let plantationId = null;
              let plantationTypeId = null;
              let plantationPhaseId = null;
              let plantationGroupId = null;
              let containerTypeId = null;
              console.log({ plantContainerData });
              let companyIdResult = await knexReader("companies")
                .select("id")
                .where({ companyId: plantContainerData.A.toUpperCase(), orgId: req.orgId });

              if (companyIdResult && companyIdResult.length) {
                companyId = companyIdResult[0].id;

                let plantationIdResult = await knexReader("plantations")
                  .select("id")
                  .where({ project: plantContainerData.C.toUpperCase(), companyId: companyId, orgId: req.orgId });

                if (plantationIdResult && plantationIdResult.length) {
                  plantationId = plantationIdResult[0].id;

                  let plantationPhaseIdResult = await knexReader("plantation_phases")
                    .select("id")
                    .where({
                      code: plantContainerData.E.toUpperCase(),
                      plantationId: plantationId,
                      companyId: companyId,
                      orgId: req.orgId
                    });

                  if (plantationPhaseIdResult && plantationPhaseIdResult.length) {
                    plantationPhaseId = plantationPhaseIdResult[0].id;

                    let plantationGroupIdResult = await knexReader("plantation_groups")
                      .select("id")
                      .where({
                        code: plantContainerData.F.toUpperCase(),
                        plantationPhaseId: plantationPhaseId,
                        orgId: req.orgId,
                        plantationId: plantationId,
                        companyId: companyId,
                      });

                    if (plantationGroupIdResult && plantationGroupIdResult.length) {
                      plantationGroupId = plantationGroupIdResult[0].id;

                    }
                  }
                }
              }

/*               let plantationTypeIdResult = await knexReader("plantation_types")
                .select("id")
                .where({
                  propertyTypeCode: plantContainerData.E.toUpperCase(),
                  orgId: req.orgId
                });


              // console.log({ plantationPhaseIdResult, plantationGroupIdResult });


              if (plantationTypeIdResult.length) {
                plantationTypeId = plantationTypeIdResult[0].id;
              }
 */

              if (plantContainerData.G) {

                let containerTypeResult = await knexReader("container_types")
                  .select("id")
                  .where({
                    code: plantContainerData.G.toUpperCase(),
                    isActive: true,
                    orgId: req.orgId
                  }).first();


                if (containerTypeResult) {
                  containerTypeId = containerTypeResult.id;
                }

                if (!containerTypeId) {
                  fail++;
                  let values = _.values(plantContainerData)
                  values.unshift('Container Type does not exists or Inactive')

                  //errors.push(header);
                  errors.push(values);
                  continue;
                }

              }


              console.log(
                "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&",
                {
                  companyId,
                  plantationId,
                  // plantationTypeId,
                  plantationPhaseId,
                  plantationGroupId,
                  containerTypeId
                }
              );

              if (!companyId) {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Company ID does not exists')

                //errors.push(header);
                errors.push(values);
                continue;
              }

              if (!plantationId) {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Project ID does not exists')

                //errors.push(header);
                errors.push(values);
                continue;
              }

/*               if (!plantationTypeId) {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Plantation Type does not exists')

                //errors.push(header);
                errors.push(values);
                continue;
              }
 */              
              if (!plantationPhaseId) {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Plantation Phase ID does not exists')

                //errors.push(header);
                errors.push(values);
                continue;
              }

              if (!plantationGroupId) {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Plantation Group ID does not exists')

                //errors.push(header);
                errors.push(values);
                continue;
              }
              
              if (!containerTypeId) {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Container Type ID does not exists')

                //errors.push(header);
                errors.push(values);
                continue;
              }


              console.log()
              let checkExist = await knexReader("plant_containers")
                .select("id")
                .where({
                  //companyId: companyId,
                  //plantationId: plantationId,
                  plantationPhaseId: plantationPhaseId,
                  //plantationGroupId: plantationGroupId,
                  //containerTypeId: containerTypeId,
                  // plantationTypeId: plantationTypeId,
                  orgId: req.orgId,
                  containerNumber: plantContainerData.H.toUpperCase(),
                });
              if (checkExist.length < 1) {
                let insertData = {
                  orgId: req.orgId,
                  companyId,
                  plantationId,
                  // plantationTypeId,
                  plantationPhaseId,
                  plantationGroupId,
                  containerTypeId: containerTypeId,
                  containerNumber: plantContainerData.H.toUpperCase(),
                  description: plantContainerData.I,
                  productCode: plantContainerData.K,
                  area: plantContainerData.J,
                  isActive: true,
                  createdBy: req.me.id,
                  createdAt: new Date().getTime(),
                  updatedBy: req.me.id,
                  updatedAt: new Date().getTime(),
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("plant_containers");
                success++;
              } else {
                fail++;
                let values = _.values(plantContainerData)
                values.unshift('Plant Container already exists in the same Plantation Phase.')
                errors.push(values);
              }
            }
          }
          //fail = fail - 1;
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
            errors
          });
        }
      } else {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });
      }
      // } else {
      //   return res.status(400).json({
      //     errors: [
      //       { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
      //     ]
      //   });
      // }
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][importPlantContainerData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getAllPlantContainer: async (req, res) => {
    try {

      let orgId = req.orgId;
      let result = await knexReader.from('plant_containers')
        .select('id', "containerNumber", 'description')
        .where({ orgId })
      return res.status(200).json({
        data: result,
        message: "All Plant Container list"
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  toggleStatus: async (req, res) => {
    try {
      let id = req.body.id;
      let userId = req.me.id;
      let currentTime = new Date().getTime();
      let message;

      let check = await knexReader('plant_containers').select('isActive').where({ orgId: req.orgId, id: id })
      if (check && check.length && Boolean(check[0].isActive)) {
        await knex('plant_containers').update({ isActive: false, updatedBy: userId, updatedAt: currentTime }).where({ id, orgId: req.orgId })

        message = "Plant Container Inactive Successfully!"
      } else {
        await knex('plant_containers').update({ isActive: true, updatedBy: userId, updatedAt: currentTime }).where({ id, orgId: req.orgId })

        message = "Plant Container Active Successfully!"
      }

      return res.status(200).json({
        data: {
          message: message
        }
      })
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getPlantContainersByMultipleGroup: async (req, res) => {
    try {
      let plantationGroupId = req.body
      let orgId = req.orgId

      let plantContainers = await knexReader("plant_containers")
        .where({ "plant_containers.isActive": true, "plant_containers.orgId": orgId })
        .whereIn("plant_containers.plantationGroupId", plantationGroupId)
        // .where("plant_containers.type", 1)
        .select("*")
        .orderBy("plant_containers.description", "asc")

      return res.status(200).json({
        data: {
          plantContainers
        },
        message: "Plant Container list"
      });

    } catch (err) {
      console.log("[controllers][administrationFeatures][getPlantContainersByMultipleGroup] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });

    }
  },

  getPlantContainerCommonAreaByGroup: async (req, res) => {
    try {
      let orgId = req.orgId;

      const { plantationGroupId, type } = req.body;
      const plantContainers = await knexReader("plant_containers")
        .select("*")
        // .whereIn('plant_containers.type', [1, 2])
        .where({ plantationGroupId, orgId: orgId, isActive: true });
      return res.status(200).json({
        data: {
          plantContainers
        },
        message: "Plant Container list"
      });
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getPlantContainerCommonAreaByGroup] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  getUnitAndBuildingByUserId: async (req, res) => {
    try {

      let orgId = req.orgId

      let userBuildingInfo = await knexReader('user_house_allocation')
        .leftJoin('plant_containers', 'user_house_allocation.houseId', 'plant_containers.id')
        .leftJoin('plantation_phases', 'plant_containers.plantationPhaseId', 'plantation_phases.id')
        .leftJoin('plantations', "plant_containers.plantationId", "plantations.id")
        .leftJoin("plantation_groups", "plant_containers.plantationGroupId", "plantation_groups.id")
        .select([
          'plant_containers.containerNumber',
          'plantation_phases.code as plantationPhaseCode',
          'plantation_phases.description as plantationPhaseDescription',
          'plantations.name as plantationName',
          'plantation_groups.code as plantationCode'
        ])
        .where({ 'user_house_allocation.userId': req.body.id, 'user_house_allocation.orgId': orgId })

      return res.status(200).json({
        data: {
          userBuildingInfo
        }
      })
    } catch (err) {
      console.log(
        "[controllers][administrationFeatures][getUnitAndBuildingByUserId] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = plantContainerController;

const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const fs = require('fs');
const path = require('path')


const ProjectController = {
  addProject: async (req, res) => {
    try {
      let Project = null;
      let userId = req.me.id;
      await knex.transaction(async trx => {
        const payload = req.body;
        let orgId;
        if (payload.orgId) {
          orgId = payload.orgId;
        } else {
          orgId = req.orgId;
        }


        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          project: Joi.string().required(),
          projectName: Joi.string().required(),
          projectLocationThai: Joi.string().allow('').allow(null).optional(),
          projectLocationEng: Joi.string().allow('').allow(null).optional(),
          currency: Joi.string().allow('').allow(null).optional(),
          orgId: Joi.string().allow('').allow(null).optional()
          // projectStartDate: Joi.string().allow('').optional(),
          // projectEndDate: Joi.string().allow('').optional(),
          // branchId: Joi.string().allow('').optional(),
          // ownerCode: Joi.string().allow('').optional(),
          // customerCode: Joi.string().allow('').optional(),
          // ventureType: Joi.string().allow('').optional(),
          // locationFlag: Joi.string().allow('').optional(),
          // projectType: Joi.string().allow('').optional(),
          // biddingDate: Joi.string().allow('').optional(),
          // projectPeriod: Joi.string().allow('').optional(),
          // budgetValue: Joi.string().allow('').optional(),
          // secondCurrency: Joi.string().allow('').optional(),
          // addressFlag: Joi.string().allow('').optional()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addProject]: JOi Result",
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
        let existValue = await knex('projects')
          .where({ project: payload.project, companyId: payload.companyId, orgId: orgId });
        if (existValue && existValue.length) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Project Id already exist!!" }
            ]
          });
        }
        /*CHECK DUPLICATE VALUES CLOSE */

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: orgId
        };

        console.log('Project Payload: ', insertData)

        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("projects");
        Project = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          project: Project
        },
        message: "Project added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateProject: async (req, res) => {
    try {
      let Project = null;
      await knex.transaction(async trx => {
        const payload = req.body;
        let orgId;
        if (payload.orgId) {
          orgId = payload.orgId;
        } else {
          orgId = req.orgId;
        }

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          project: Joi.string().required(),
          projectName: Joi.string().required(),
          projectLocationThai: Joi.string().allow('').allow(null).optional(),
          projectLocationEng: Joi.string().allow('').allow(null).optional(),
          currency: Joi.string().allow('').allow(null).optional(),
          orgId: Joi.string().allow('').allow(null).optional()
          // projectStartDate: Joi.string().allow('').optional(),
          // projectEndDate: Joi.string().allow('').optional(),
          // branchId: Joi.string().allow('').optional(),
          // ownerCode: Joi.string().allow('').optional(),
          // customerCode: Joi.string().allow('').optional(),
          // ventureType: Joi.string().allow('').optional(),
          // locationFlag: Joi.string().allow('').optional(),
          // projectType: Joi.string().allow('').optional(),
          // biddingDate: Joi.string().allow('').optional(),
          // projectPeriod: Joi.string().allow('').optional(),
          // budgetValue: Joi.string().allow('').optional(),
          // secondCurrency: Joi.string().allow('').optional(),
          // addressFlag: Joi.string().allow('').optional()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updateProject]: JOi Result",
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
        let existValue = await knex('projects')
          .where({ project: payload.project, companyId: payload.companyId, orgId: orgId });
        if (existValue && existValue.length) {

          if (existValue[0].id === payload.id) {

          } else {
            return res.status(400).json({
              errors: [
                { code: "VALIDATION_ERROR", message: "Project Id already exist!!" }
              ]
            });
          }
        }
        /*CHECK DUPLICATE VALUES CLOSE */


        let currentTime = new Date().getTime();
        let insertData = { ...payload, orgId: orgId, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id })
          .returning(["*"])
          .transacting(trx)
          .into("projects");
        Project = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "Project details updated successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][updateProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewProject: async (req, res) => {
    try {
      let Project = null;
      await knex.transaction(async trx => {
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


        let role = req.me.roles[0];
        let name = req.me.name;
        let ProjectResult
        if (role === "superAdmin" && name === "superAdmin") {

          ProjectResult = await knex("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .select("projects.*", "companies.companyId as compId", "companies.companyName")
            .where({ "projects.id": payload.id })

          Project = _.omit(ProjectResult[0], [
            "createdAt",
            "updatedAt"
          ]);

        } else {

          ProjectResult = await knex("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .select("projects.*", "companies.companyId as compId", "companies.companyName")
            .where({ "projects.id": payload.id, 'projects.orgId': req.orgId })

          Project = _.omit(ProjectResult[0], [
            "createdAt",
            "updatedAt"
          ]);

        }


        trx.commit;
      });


      return res.status(200).json({
        data: {
          Project: Project
        },
        message: "Project details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteProject: async (req, res) => {
    try {
      let Project = null;
      let message;
      await knex.transaction(async trx => {
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
        let ProjectResult;
        let checkStatus = await knex.from('projects').where({ id: payload.id }).returning(['*']);

        if (checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            ProjectResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("projects");
            Project = ProjectResult[0];
            message = "Project Inactive Successfully!"

          } else {
            ProjectResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("projects");
            Project = ProjectResult[0];
            message = "Project Active Successfully!"
          }
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          Project: Project
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectList: async (req, res) => {
    try {

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "projects.projectName";
        sortPayload.orderBy = "asc"
      }
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows
      let { organisation, company, project } = req.body;
      let role = req.me.roles[0];
      let name = req.me.name;

      if (role === "superAdmin" && name === "superAdmin") {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .leftJoin("users", "users.id", "projects.createdBy")
            .where('companies.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('projects.orgId', organisation)
              }
              if (company) {
                qb.where('projects.companyId', company)
              }
              if (project) {
                qb.where('projects.projectName', 'iLIKE', `%${project}%`)
              }
            })
            .first(),
          knex("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .leftJoin("users", "users.id", "projects.createdBy")
            .where('companies.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('projects.orgId', organisation)
              }
              if (company) {
                qb.where('projects.companyId', company)
              }
              if (project) {
                qb.where('projects.projectName', 'iLIKE', `%${project}%`)
              }
            })
            .select([
              "projects.id as id",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created",
              "projects.project as projectId",
              "companies.companyId"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .leftJoin("users", "users.id", "projects.createdBy")
            .where({ "projects.orgId": req.orgId })
            .where('companies.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('projects.orgId', organisation)
              }
              if (company) {
                qb.where('projects.companyId', company)
              }
              if (project) {
                qb.where('projects.projectName', 'iLIKE', `%${project}%`)
              }
            })
            .first(),
          knex("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .leftJoin("users", "users.id", "projects.createdBy")
            .where('companies.isActive', true)
            .where({ "projects.orgId": req.orgId })
            .where(qb => {
              if (organisation) {
                qb.where('projects.orgId', organisation)
              }
              if (company) {
                qb.where('projects.companyId', company)
              }
              if (project) {
                qb.where('projects.projectName', 'iLIKE', `%${project}%`)
              }
            })
            .select([
              "projects.id as id",
              "projects.projectName as Project Name",
              "companies.companyName as Company Name",
              "projects.isActive as Status",
              "users.name as Created By",
              "projects.createdAt as Date Created",
              "projects.project as projectId",
              "companies.companyId"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);
      }

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
          projects: pagination
        },
        message: "projects List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  exportProject: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let rows = null;
      let orgId = req.orgId;

      if (!companyId) {

        [rows] = await Promise.all([

          knex("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .leftJoin("users", "users.id", "projects.createdBy")
            .where('companies.isActive', true)
            .where({ "projects.orgId": orgId })
            .select([
              // "projects.orgId as ORGANIZATION_ID",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT_NAME",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "projects.projectLocationEng as PROJECT_LOCATION",
              "projects.projectLocationThai as PROJECT_LOCATION_ALTERNATE_LANGUAGE",
              "projects.currency as CURRENCY"
              // "users.name as CREATED BY",
              // "projects.createdBy as CREATED BY ID",
              // "projects.createdAt as DATE CREATED"
            ])
        ]);

      } else {

        [rows] = await Promise.all([
          knex
            .from("projects")
            .leftJoin("companies", "projects.companyId", "companies.id")
            .leftJoin("users", "users.id", "projects.createdBy")
            .where('companies.isActive', true)
            .where({ "projects.companyId": companyId, "projects.orgId": orgId })
            .select([
              // "projects.orgId as ORGANIZATION_ID",
              "projects.project as PROJECT",
              "projects.projectName as PROJECT_NAME",
              "companies.companyId as COMPANY",
              "companies.companyName as COMPANY_NAME",
              "projects.projectLocationEng as PROJECT_LOCATION",
              "projects.projectLocationThai as PROJECT_LOCATION_ALTERNATE_LANGUAGE",
              "projects.currency as CURRENCY"
              // "users.name as CREATED BY",
              // "projects.createdBy as CREATED BY ID",
              // "projects.createdAt as DATE CREATED"
            ])
        ]);
      }

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = 'sls-app-resources-bucket';
        tempraryDirectory = 'tmp/';
      } else {
        tempraryDirectory = '/tmp/';
        bucketName = process.env.S3_BUCKET_NAME;
      }
      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws;
      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            PROJECT: "",
            PROJECT_NAME: "",
            COMPANY: "",
            COMPANY_NAME: "",
            PROJECT_LOCATION: "",
            PROJECT_LOCATION_ALTERNATE_LANGUAGE: "",
            CURRENCY: ""
          }
        ]);
      }
      //var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ProjectData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Project/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Project/" + filename;
            return res.status(200).json({
              data: rows,
              message: "Project Data Export Successfully!",
              url: url
            });
          }
        });
      })

    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectByCompany: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let projects = _.flatten(
        req.userProjectResources.map(v => v.projects)
      ).map(v => Number(v));

      console.log("==========", projects, "==========")

      let pagination = {}
      console.log("companyId", companyId);

      let rows = await knex("projects")
        .innerJoin("companies", "projects.companyId", "companies.id")
        .where({ "projects.companyId": companyId, "projects.isActive": true })
        .whereIn('projects.id', projects)
        .select([
          "projects.id as id",
          "projects.projectName",
          "companies.companyName",
          "companies.id as cid",
          "companies.companyId",
          "projects.project as projectId"
        ])
        .orderBy('projects.projectName','asc')

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          projects: pagination
        },
        message: "projects List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectAllList: async (req, res) => {
    try {

      let orgId = req.orgId

      let rows = await knex("projects")
        .select([
          "projects.id as id",
          "projects.projectName",
          "projects.project as projectId",
        ]).where({ orgId: req.orgId })

      return res.status(200).json({
        data: {
          projects: rows
        },
        message: "Projects all List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /**IMPORT PROJECT DATA */
  importProjectData: async (req, res) => {
    try {

      // if (req.file) {
      // let tempraryDirectory = null;
      // if (process.env.IS_OFFLINE) {
      //   tempraryDirectory = 'tmp/';
      // } else {
      //   tempraryDirectory = '/tmp/';
      // }
      // let resultData = null;
      // let file_path = tempraryDirectory + req.file.filename;
      // let wb = XLSX.readFile(file_path, { type: 'binary' });
      // let ws = wb.Sheets[wb.SheetNames[0]];
      // let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      console.log("=======", data, "+++++++++++++++")
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)


      if (data[0].B == "PROJECT_NAME" &&
          data[0].C == "COMPANY" &&
          data[0].D == "COMPANY_NAME" &&
          data[0].E == "PROJECT_LOCATION" &&
          data[0].F == "PROJECT_LOCATION_ALTERNATE_LANGUAGE" &&
          data[0].G == "CURRENCY" &&
          data[0].A == "PROJECT" || data[0].A == "Ã¯Â»Â¿PROJECT"
      ) {
        if (data.length > 0) {
          let i = 0;
          for (let projectData of data) {
            i++;

            if (i > 1) {

              if(!projectData.A){
                let values = _.values(projectData)
                values.unshift('Project Code can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if(!projectData.B){
                let values = _.values(projectData)
                values.unshift('Project name can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if(!projectData.C){
                let values = _.values(projectData)
                values.unshift('Company Id can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              if(!projectData.E){
                let values = _.values(projectData)
                values.unshift('Project location can not empty!')
                errors.push(values);
                fail++;
                continue;
              }

              let companyData = await knex("companies")
                .select("id")
                .where({ companyId: projectData.C, orgId: req.orgId });
              let companyId = null;
              if (!companyData.length) {
                let values = _.values(projectData)
                values.unshift('Company ID does not exists')
                errors.push(values);
                fail++;
                continue;
              }
              if (companyData && companyData.length) {
                companyId = companyData[0].id;
              }

              let checkExist = await knex("projects")
                .select("projectName")
                .where({ project: projectData.A, companyId: companyId, orgId: req.orgId });
              if (checkExist.length < 1) {
                let currentTime = new Date().getTime();
                let insertData = {
                  orgId: req.orgId,
                  companyId: companyId,
                  projectName: projectData.B,
                  project: projectData.A,
                  projectLocationEng: projectData.E,
                  projectLocationThai: projectData.F,
                  currency: projectData.G,
                  isActive: true,
                  createdBy: req.me.id,
                  createdAt: currentTime,
                  updatedAt: currentTime
                };

                resultData = await knex
                  .insert(insertData)
                  .returning(["*"])
                  .into("projects");
                if (resultData && resultData.length) {
                  success++;
                }
              } else {
                fail++;
                let values = _.values(projectData)
                values.unshift('Project Code already exists')
                errors.push(values);
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
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getUserProjectByCompany: async (req, res) => {
    try {
      let companyId = req.query.companyId;
    

      let pagination = {}
      console.log("companyId", companyId);

      let rows = await knex("projects")
        .innerJoin("companies", "projects.companyId", "companies.id")
        .where({ "projects.companyId": companyId, "projects.isActive": 'true' })
        .select([
          "projects.id as id",
          "projects.projectName",
          "companies.companyName",
          "companies.id as cid",
          "companies.companyId",
          "projects.project as projectId"
        ])

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          projects: pagination
        },
        message: "projects List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewProject] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getProjectListHavingPropertyUnits:async(req,res) =>{
    try {
      let companyId = req.query.companyId;
      let projects = _.flatten(
        req.userProjectResources.map(v => v.projects)
      ).map(v => Number(v));

      console.log("==========", projects, "==========")

      let pagination = {}
      console.log("companyId", companyId);
      let companyHavingProjects = []
      let companyArr1 = []
      let rows = []

      if(req.query.areaName === 'common'){
       
        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingProjects.map(v => v.companyId)
        rows = await knex("projects")
          .innerJoin('companies', 'projects.companyId', 'companies.id')
          .innerJoin('property_units', 'projects.id', 'property_units.projectId')
          .where({ "projects.companyId": companyId, "projects.isActive": true,'property_units.type':2 })
          .whereIn('projects.id', projects)
          .whereIn('projects.companyId', companyArr1)
          .select([
            "projects.id as id",
            "projects.projectName",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "projects.project as projectId"
          ]).groupBy(["projects.id",
            "projects.projectName",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "projects.project"])
          .orderBy('projects.projectName', 'asc')
      } else {
        
        companyHavingProjects = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
        companyArr1 = companyHavingProjects.map(v => v.companyId)
        rows = await knex("projects")
          .innerJoin('companies','projects.companyId','companies.id')
          .innerJoin('property_units', 'projects.id', 'property_units.projectId')
          .where({ "projects.companyId": companyId, "projects.isActive": true,'property_units.type':1 })
          .whereIn('projects.id', projects)
          .whereIn('projects.companyId',companyArr1)
          .select([
            "projects.id as id",
            "projects.projectName",
            "companies.companyName",
            "companies.id as cid",
            "companies.companyId",
            "projects.project as projectId"
          ]).groupBy(["projects.id",
            "projects.projectName",
            "companies.companyName",
            "companies.id",
            "companies.companyId",
            "projects.project"])
            .orderBy('projects.projectName','asc')
      }

      console.log("rows", rows);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          projects: pagination
        },
        message: "projects List!"
      });
    } catch(err) {
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }

};

module.exports = ProjectController;

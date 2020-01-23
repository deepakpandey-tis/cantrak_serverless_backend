const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const XLSX = require('xlsx');
const knex = require('../../db/knex');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const fs = require('fs');


const problemController = {
  getProblems: async (req, res) => {
    // List with filter and pagination
    try {

      let reqData = req.query;
      let filters = req.body;
      let total, rows

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (_.isEmpty(filters)) {
        [total, rows] = await Promise.all([
          knex.count('* as count').from("incident_sub_categories")
            .leftJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
            .leftJoin('users', 'incident_categories.createdBy', 'users.id')
            .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
            .where({ 'incident_sub_categories.orgId': req.orgId })
          ,
          knex("incident_sub_categories")
            .leftJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
            .leftJoin('users', 'incident_categories.createdBy', 'users.id')
            .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
            .select([
              'incident_sub_categories.id as ID',
              'incident_categories.categoryCode as Problem Code',
              'incident_sub_categories.descriptionEng as Description(Eng)',
              'incident_sub_categories.descriptionThai as Description(Thai)',
              'incident_categories.descriptionEng as Category',
              'incident_sub_categories.isActive as Status',
              'users.name as Created By',
              'incident_sub_categories.createdAt as Date Created',
              'incident_type.typeCode as problem_type_code',
              'incident_type.descriptionEng as problem_type_description',
            ])
            .orderBy('incident_sub_categories.id','desc')
            .where({ 'incident_sub_categories.orgId': req.orgId })
            .offset(offset).limit(per_page)
        ])
      } else {
        filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
        try {
          [total, rows] = await Promise.all([
            knex.count('* as count').from("incident_sub_categories")
              .leftJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
              .leftJoin('users', 'incident_categories.createdBy', 'users.id')
              .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
              .where({ 'incident_sub_categories.orgId': req.orgId })
              .where(filters).offset(offset).limit(per_page),
            knex("incident_sub_categories")
              .innerJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
              .leftJoin('users', 'incident_categories.createdBy', 'users.id')
              .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
              .select([
                'incident_sub_categories.id as ID',
                'incident_categories.categoryCode as Problem Code',
                'incident_sub_categories.descriptionEng as Description(Eng)',
                'incident_sub_categories.descriptionThai as Description(Thai)',
                'incident_categories.descriptionEng as Category',
                'incident_sub_categories.isActive as Status',
                'users.name as Created By',
                'incident_sub_categories.createdAt as Date Created',
                'incident_type.typeCode as problem_type_code',
                'incident_type.descriptionEng as problem_type_description',
              ])
              .orderBy('incident_sub_categories.id','desc')
              .where({ 'incident_sub_categories.orgId': req.orgId })
              .where(filters).offset(offset).limit(per_page)
          ])
        } catch (e) {
          // Error
          console.log('Error: ' + e.message)
        }
      }

      let count = total[0].count;
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
          problems: pagination
        },
        message: 'Problems List!'
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  /**EXPORT PROBLEM SUB CATEGORY DATA */
  exportProblem: async (req, res) => {
    try {

      let reqData = req.query;
      let filters = req.body;
      let rows = null;
      let orgId = req.orgId;

      if (_.isEmpty(filters)) {

        [rows] = await Promise.all([
          knex("incident_sub_categories")
            .leftJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
            .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
            .select([
              'incident_categories.categoryCode as PROBLEM_CATEGORY_CODE',
              'incident_sub_categories.descriptionEng as DESCRIPTION',
              'incident_sub_categories.descriptionThai as ALTERNATE_DESCRIPTION',
              'incident_sub_categories.remark as REMARK',
              'incident_type.typeCode as PROBLEM_TYPE_CODE',
            ])
            .where({ 'incident_sub_categories.orgId': orgId })
        ])
      } else {
        filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)

        [rows] = await Promise.all([
          knex("incident_sub_categories")
            .leftJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
            .leftJoin('incident_type', 'incident_sub_categories.incidentTypeId', 'incident_type.id')
            .select([
              'incident_categories.categoryCode as PROBLEM_CATEGORY_CODE',
              'incident_sub_categories.descriptionEng as DESCRIPTION',
              'incident_sub_categories.descriptionThai as ALTERNATE_DESCRIPTION',
              'incident_sub_categories.remark as REMARK',
              'incident_type.typeCode as PROBLEM_TYPE_CODE',
            ])
            .where({ 'incident_sub_categories.orgId': orgId })
            .where(filters)
        ])
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
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "ProblemSubcategoryData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Problem_Subcategory/" + filename,
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
            // let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Problem_Subcategory/" + filename;
            res.status(200).json({
              data: rows,
              message: "Problem Subcategory data export successfully!",
              url: url
            });
          }
        });
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }

  },
  getIncidentCategories: async (req, res) => {
    try {
      let orgId = req.orgId
      //const incidentCategoryId = req.body.incidentCategoryId;
      const categories = await knex.from('incident_categories').where({ orgId: orgId })
      return res.status(200).json({
        data: {
          categories
        },
        message: 'Categories list'
      })
    } catch (err) {
      console.log('[controllers][quotation][list] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getSubcategories: async (req, res) => {
    try {
      let incidentCategoryId = req.body.incidentCategoryId;
      const subCategories = await knex('incident_sub_categories').select('*').where({ incidentCategoryId })
      return res.status(200).json({
        data: {
          subCategories
        },
        message: 'List of sub categories'
      })
    } catch (err) {
      console.log('[controllers][subcategory][subcategoryList] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getProblemDetails: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};
      let problemId = reqData.problemId;

      let [rows] = await Promise.all([
        knex("incident_sub_categories")
          .leftJoin('incident_categories', 'incident_sub_categories.incidentCategoryId', 'incident_categories.id')
          .select([
            'incident_sub_categories.id',
            'incident_categories.categoryCode as problemCode',
            'incident_sub_categories.descriptionEng',
            'incident_sub_categories.descriptionThai',
            'incident_categories.descriptionEng as Category',
            'incident_sub_categories.isActive as Status',
            'incident_sub_categories.createdAt as DateCreated',
            'incident_sub_categories.remark',
            "incident_sub_categories.incidentCategoryId",
            "incident_sub_categories.incidentTypeId"
          ]).where('incident_sub_categories.id', problemId)
      ])
      pagination.problems = rows;
      return res.status(200).json({
        data: pagination,
        message: 'Problem Data Details!'
      })
    } catch (err) {
      console.log('[controllers][problem][details] :  Error', err);
      return res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },

  /**IMPORT PROBLEM SUBCATEGORY DATA */
  importProblemSubCategoryData: async (req, res) => {
    try {

      if (req.file) {
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = 'tmp/';
        } else {
          tempraryDirectory = '/tmp/';
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: 'binary' });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });

        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        console.log("=======", data[0], "+++++++++++++++")
        let result = null;

        if (
          data[0].A == "Ã¯Â»Â¿PROBLEM_CATEGORY_CODE" ||
          (data[0].A == "PROBLEM_CATEGORY_CODE" &&
            data[0].B == "DESCRIPTION" &&
            data[0].C == "ALTERNATE_DESCRIPTION" &&
            data[0].D == "REMARK" && data[0].E == "PROBLEM_TYPE_CODE")
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let problemData of data) {
              i++;

              let categoryData = await knex("incident_categories")
                .select("id")
                .where({ categoryCode: problemData.A, orgId: req.orgId });
              let categoryId = null;
              if (!categoryData.length) {
                fail++;
                continue;
              }
              if (categoryData && categoryData.length) {
                categoryId = categoryData[0].id;
              }

              let problemTypeData = await knex("incident_type")
                .select("id")
                .where({typeCode: problemData.E, orgId: req.orgId });
              let problemTypeId = null;
              if(!problemTypeData.length){
                fail++;
                continue;
              }

              if(problemTypeData.length){
                problemTypeId = problemTypeData[0].id;
              }


              if (i > 1) {
                let checkExist = await knex("incident_sub_categories")
                  .select("id")
                  .where({ incidentCategoryId: categoryId, descriptionEng: problemData.B, orgId: req.orgId });
                if (checkExist.length < 1) {
                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    incidentCategoryId: categoryId,
                    descriptionEng: problemData.B,
                    descriptionThai: problemData.C,
                    remark: problemData.D,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    incidentTypeId:problemTypeId
                  };

                  resultData = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into("incident_sub_categories");
                  if (resultData && resultData.length) {
                    success++;
                  }
                } else {
                  fail++;
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

            let deleteFile = await fs.unlink(file_path, err => {
              console.log("File Deleting Error " + err);
            });
            return res.status(200).json({
              message: message
            });
          }
        } else {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            ]
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
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*INACTIVE & ACTIVE PROBLEM */
  deleteProblem: async (req, res) => {
    try {
      let problem = null;
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
        let problemResult;
        let checkStatus = await knex.from('incident_sub_categories').where({ id: payload.id }).returning(['*']);

        if (checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            problemResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("incident_sub_categories");
            problem = problemResult[0];
            message = "Problem Inactive Successfully!"

          } else {
            problemResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("incident_sub_categories");
            problem = problemResult[0];
            message = "Problem Active Successfully!"
          }
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          problem: problem
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][serviceCode][deleteProblem] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
}

module.exports = problemController
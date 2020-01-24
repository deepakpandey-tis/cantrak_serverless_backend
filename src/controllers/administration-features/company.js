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

const companyController = {
  addCompany: async (req, res) => {
    try {
      let company = null;
      await knex.transaction(async trx => {

        console.log("===============", req.body, "Payload========")


        const payload = _.omit(req.body, ["logoFile"]);
        let orgId;
        if(payload.orgId){
           orgId = payload.orgId;
        } else{
          orgId = req.orgId;
        }
        
        const userId = req.me.id;

        if (payload.taxId) {

          // if(payload.taxId.length==13 && Number.isInteger(payload.taxId)){

          // } else{
          //   return res.status(400).json({
          //     errors: [
          //       { code: "VALIDATION_ERROR", message: "Enter Valid Tax Id" }
          //     ]
          //   });
          // }
        }

        const schema = Joi.object().keys({
          companyName: Joi.string().required(),
          companyId: Joi.string().required(),
          descriptionEng: Joi.string()
            .allow("")
            .optional(),
          description1: Joi.string()
            .allow("")
            .optional(),
          contactPerson: Joi.string()
            .allow("")
            .optional(),
          companyAddressEng: Joi.string()
            .allow("")
            .optional(),
          companyAddressThai: Joi.string()
            .allow("")
            .optional(),
          logoFile: Joi.string()
            .allow("")
            .optional(),
          taxId: Joi.number()
            .allow("")
            .optional(),
            orgId: Joi.number()
            .allow("")
            .optional()
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addCompany]: JOi Result",
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
        let existValue = await knex('companies')
          .where({ companyId: payload.companyId, orgId: orgId });
        if (existValue && existValue.length) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Company Id already exist!!" }
            ]
          });
        }
        /*CHECK DUPLICATE VALUES CLOSE */



        console.log("ORG ID: ", orgId);
        let logo = "";
        if (req.body.logoFile) {
          for (image of req.body.logoFile) {
            logo = image.s3Url;
          }
        }
        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          logoFile: logo,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: orgId
        };
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("companies");
        company = insertResult[0];

        trx.commit;
      });

      return res.status(200).json({
        data: {
          company: company
        },
        message: "Company added successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][addCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateCompany: async (req, res) => {
    try {
      let company = null;
      await knex.transaction(async trx => {
        
        const payload = _.omit(req.body, ["logoFile"]);
        let orgId;
        if(payload.orgId){
         orgId = payload.orgId;
        }else {
          orgId = req.orgId;
        }
        
        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyName: Joi.string().required(),
          companyId: Joi.string().required(),
          descriptionEng: Joi.string().allow("").allow(null)
            .optional(),
          description1: Joi.string().allow("").allow(null)
            .optional(),
          contactPerson: Joi.string().allow("").allow(null)
            .optional(),
          companyAddressEng: Joi.string().allow("").allow(null)
            .optional(),
          companyAddressThai: Joi.string().allow("").allow(null)
            .optional(),
          country: Joi.string().allow("")
            .optional(),
          state: Joi.string().allow("")
            .optional(),
          city: Joi.string().allow("")
            .optional(),
          zipCode: Joi.string()
            .allow("")
            .optional(),
          telephone: Joi.string()
            .allow("")
            .optional(),
          fax: Joi.string()
            .allow("")
            .optional(),
          provinceCode: Joi.string()
            .allow("")
            .optional(),
          amphurCode: Joi.string()
            .allow("")
            .optional(),
          tumbonCode: Joi.string()
            .allow("")
            .optional(),
          flag: Joi.string()
            .allow("")
            .optional(),
          logoFile: Joi.string()
            .allow("")
            .optional(),
          taxId: Joi.number()
            .allow("").allow(null)
            .optional(),
            orgId: Joi.number()
            .allow("")
            .optional()

        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][updateCompany]: JOi Result",
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
        let existValue = await knex('companies')
          .where({ companyId: payload.companyId, orgId: orgId });
        if (existValue && existValue.length) {

          if (existValue[0].id === payload.id) {

          } else {
            return res.status(400).json({
              errors: [
                { code: "VALIDATION_ERROR", message: "Company Id already exist!!" }
              ]
            });
          }
        }
        /*CHECK DUPLICATE VALUES CLOSE */

        let currentTime = new Date().getTime();
        let logo;
        if (req.body.logoFile) {
          for (image of req.body.logoFile) {
            logo = image.s3Url;
          }
        }
        console.log("==============", req.body.logoFile)
        let insertData;
        if (req.body.logoFile.length) {
          insertData = { ...payload,orgId, logoFile: logo, updatedAt: currentTime };
        } else {
          insertData = { ...payload, orgId,updatedAt: currentTime };
        }
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id})
          .returning(["*"])
          .transacting(trx)
          .into("companies");
        company = insertResult[0];


        trx.commit;
      });

      return res.status(200).json({
        data: {
          company: company
        },
        message: "Company details updated successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][updateCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewCompany: async (req, res) => {
    try {
      let company = null;
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
        let companyResult
        if (role === "superAdmin" && name === "superAdmin") {

          companyResult = await knex
            .select()
            .where({ id: payload.id })
            .returning(["*"])
            .transacting(trx)
            .into("companies");

          company = _.omit(companyResult[0], [
            "createdAt",
            "updatedAt"
          ]);
        } else {

          companyResult = await knex
            .select()
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .transacting(trx)
            .into("companies");

          company = _.omit(companyResult[0], [
            "createdAt",
            "updatedAt"
          ]);

        }

        trx.commit;
      });
      return res.status(200).json({
        data: {
          company: company
        },
        message: "Company details"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  deleteCompany: async (req, res) => {
    try {
      let company = null;
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
        let companyResult;
        let checkStatus = await knex.from('companies').where({ id: payload.id }).returning(['*']);

        if (checkStatus.length) {

          if (checkStatus[0].isActive == true) {

            companyResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("companies");
            company = companyResult[0];
            message = "Company Inactive Successfully!"
          } else {
            companyResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("companies");
            company = companyResult[0];
            message = "Company Active Successfully!"
          }
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          company: company
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getCompanyList: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows;
      let { companyName, organisation } = req.body;
      let role = req.me.roles[0];
      let name = req.me.name;
      if (role === "superAdmin" && name === "superAdmin") {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("companies")
            .leftJoin("users", "users.id", "companies.createdBy")
            .leftJoin("organisations", "companies.orgId", "organisations.id")
            .where('organisations.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('companies.orgId', organisation)
              }
              if (companyName) {
                qb.where('companies.companyName', 'iLIKE', `%${companyName}%`)
              }
            })
            .first(),
          knex("companies")
            .leftJoin("users", "users.id", "companies.createdBy")
            .leftJoin("organisations", "companies.orgId", "organisations.id")
            .where('organisations.isActive', true)
            .where(qb => {
              if (organisation) {
                qb.where('companies.orgId', organisation)
              }
              if (companyName) {
                qb.where('companies.companyName', 'iLIKE', `%${companyName}%`)
              }
            })
            .select([
              "companies.id as id",
              "companies.companyName as Company Name",
              "companies.contactPerson as Contact Person",
              "companies.telephone as Contact Number",
              "companies.isActive as Status",
              "users.name as Created By",
              "companies.createdAt as Date Created",
              "companies.companyId",
            ])
            .orderBy('companies.id', 'desc')
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("companies")
            .leftJoin("users", "users.id", "companies.createdBy")
            .leftJoin("organisations", "companies.orgId", "organisations.id")
            .where('organisations.isActive', true)
            .where({ "companies.orgId": req.orgId })

            .where(qb => {
              if (organisation) {
                qb.where('companies.orgId', organisation)
              }
              if (companyName) {
                qb.where('companies.companyName', 'iLIKE', `%${companyName}%`)
              }
            })
            .first(),
          knex("companies")
            .leftJoin("users", "users.id", "companies.createdBy")
            .leftJoin("organisations", "companies.orgId", "organisations.id")
            .where('organisations.isActive', true)
            .where({ "companies.orgId": req.orgId })
            .where(qb => {
              if (organisation) {
                qb.where('companies.orgId', organisation)
              }
              if (companyName) {
                qb.where('companies.companyName', 'iLIKE', `%${companyName}%`)
              }
            })
            .select([
              "companies.id as id",
              "companies.companyName as Company Name",
              "companies.contactPerson as Contact Person",
              "companies.telephone as Contact Number",
              "companies.isActive as Status",
              "users.name as Created By",
              "companies.createdAt as Date Created",
              "companies.companyId",
            ])
            .orderBy('companies.id', 'desc')
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
          companies: pagination
        },
        message: "Companies List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /* * Export csv Company Data */
  exportCsvCompanyData: async (req, res) => {
    try {
      let reqData = req.query;
      let payload = req.body;

      let [rows] = await Promise.all([
        knex("companies")
          .leftJoin("users", "users.id", "companies.createdBy")
          .leftJoin("organisations", "companies.orgId", "organisations.id")
          .where('organisations.isActive', true)
          .where({ "companies.orgId": req.orgId })
          .select([
            "companies.companyId as COMPANY",
            "companies.companyName as COMPANY_NAME",
            "companies.description1 as COMPANY_ALTERNATE_NAME",
            "companies.companyAddressEng as ADDRESS",
            "companies.companyAddressThai as ALTERNATE_ADDRESS",
            "companies.taxId as TAX_ID",
            "companies.contactPerson as CONTACT_PERSON",
            "companies.descriptionEng as DESCRIPTION"
            // "companies.isActive as STATUS",
            //"companies.telephone as CONTACT_NUMBER",
            //"users.name as CREATED BY",
            //"companies.createdBy as CREATED BY ID",
            //"companies.createdAt as DATE CREATED"
          ])
      ]);

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = "sls-app-resources-bucket";
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws;

      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            COMPANY: "",
            COMPANY_NAME: "",
            COMPANY_ALTERNATE_NAME: "",
            ADDRESS: "",
            ALTERNATE_ADDRESS: "",
            TAX_ID: "",
            CONTACT_PERSON: ""
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "CompanyData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Company/" + filename,
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
            let deleteFile = fs.unlink(filepath, err => {
              console.log("File Deleting Error " + err);
            });
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Company/" +
              filename;
            return res.status(200).json({
              data: rows,
              message: "Companies Data Export Successfully!",
              url: url
            });
          }
        });
      });

      //})
    } catch (err) {
      console.log("[controllers][generalsetup][exoportCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }, // Get Company List For Project Add/Edit Form
  getCompanyListForProject: async (req, res) => {
    try {
      let pagination = {};
      let role = req.me.roles[0];
      let name = req.me.name;
      let result;
      if (role === "superAdmin" && name === "superAdmin") {
        [result] = await Promise.all([
          knex("companies")
            .select("id", "companyId", "companyName as CompanyName")
            .where({ isActive: "true" })
        ]);
      } else {

        [result] = await Promise.all([
          knex("companies")
            .select("id", "companyId", "companyName as CompanyName")
            .where({ isActive: "true", orgId: req.orgId })
        ]);
      }

      pagination.data = result;
      return res.status(200).json({
        data: {
          companies: pagination
        },
        message: "Companies List!"
      });
    } catch (err) {
      console.log("[controllers][generalsetup][viewCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // Company List Data
  importCompanyData: async (req, res) => {
    try {
      if (req.file) {
        console.log(req.file);
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = "tmp/";
        } else {
          tempraryDirectory = "/tmp/";
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: "binary" });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, {
          type: "string",
          header: "A",
          raw: false
        });
        //data         = JSON.stringify(data);
        console.log("+++++++++++++", data, "=========");
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let result = null;
        let userId = req.me.id;
        if (
          data[0].A == "COMPANY" ||
          (data[0].A == "Ã¯Â»Â¿COMPANY" &&
            data[0].B == "COMPANY_NAME" &&
            data[0].C == "COMPANY_ALTERNATE_NAME" &&
            data[0].D == "ADDRESS" &&
            data[0].E == "ALTERNATE_ADDRESS" &&
            data[0].F == "TAX_ID" &&
            data[0].G == "CONTACT_PERSON" &&
            data[0].H == "DESCRIPTION"
          )
          //&&
          // data[0].H == "STATUS"
        ) {
          if (data.length > 0) {
            let i = 0;
            for (let companyData of data) {
              i++;

              if (i > 1) {
                let taxIdExists = await knex("companies")
                  .select("taxId")
                  .where({ taxId: companyData.F, orgId: req.orgId });
                let checkExist = await knex("companies")
                  .select("companyName")
                  .where({ companyId: companyData.A, orgId: req.orgId });
                console.log("Check list company: ", checkExist);

                if (!taxIdExists.length) {


                  if (checkExist.length < 1) {

                    let taxId = companyData.F;
                    if (taxId) {
                      taxId = taxId.toString();
                    }
                    let currentTime = new Date().getTime();
                    let insertData = {
                      orgId: req.orgId,
                      companyId: companyData.A,
                      companyName: companyData.B,
                      description1: companyData.C,
                      companyAddressEng: companyData.D,
                      companyAddressThai: companyData.E,
                      taxId: taxId,
                      contactPerson: companyData.G,
                      descriptionEng: companyData.H,
                      createdBy: req.me.id,
                      isActive: true,
                      createdAt: currentTime,
                      updatedAt: currentTime,
                      createdBy: userId
                    };

                    resultData = await knex
                      .insert(insertData)
                      .returning(["*"])
                      .into("companies");

                    if (resultData && resultData.length) {
                      success++;
                    }
                  } else {
                    fail++;
                  }

                } else {
                  fail++;
                }

              }
            }
            let message = null;
            if (totalData == success) {
              message =
                "System has processed processed ( " +
                totalData +
                " ) entries and added them successfully!";
            } else {
              message =
                "System has processed processed ( " +
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
      console.log(
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = companyController;

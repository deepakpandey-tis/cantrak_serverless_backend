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

        const payload = _.omit(req.body, ["logoFile"], ["orgLogoFile"]);
        let orgId;
        if (payload.orgId) {
          orgId = payload.orgId;
        } else {
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
          descriptionEng: Joi.string().allow("").optional(),
          description1: Joi.string().allow("").optional(),
          contactPerson: Joi.string().allow("").optional(),
          companyAddressEng: Joi.string().allow("").optional(),
          companyAddressThai: Joi.string().allow("").optional(),
          logoFile: Joi.string().allow("").optional(),
          taxId: Joi.number().allow("").optional(),
          orgId: Joi.number().allow("").optional(),
          telephone: Joi.number().allow("").allow(null).optional(),
          fax: Joi.string().allow("").allow(null).optional(),
          orgLogoFile: Joi.string().allow("").optional(),
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
          .where({ companyId: payload.companyId.toUpperCase(), orgId: orgId });
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

        /*For Organisation Logo Use*/
        let orgLogo = "";
        if (req.body.orgLogoFile) {
          for (image of req.body.orgLogoFile) {
            orgLogo = image.s3Url;
          }
        }


        let taxId = null;
        taxId = payload.taxId ? payload.taxId : null;

        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          companyId: payload.companyId.toUpperCase(),
          createdBy: userId,
          logoFile: logo,
          orgLogoFile: orgLogo,
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

        const payload = _.omit(req.body, ["logoFile"], ["orgLogoFile"]);
        let orgId;
        if (payload.orgId) {
          orgId = payload.orgId;
        } else {
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
            .allow(null)
            .optional(),
          state: Joi.string().allow("")
            .allow(null)
            .optional(),
          city: Joi.string().allow("")
            .allow(null)
            .optional(),
          zipCode: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          telephone: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          fax: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          provinceCode: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          amphurCode: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          tumbonCode: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          flag: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          logoFile: Joi.string()
            .allow("")
            .allow(null)
            .optional(),
          taxId: Joi.number()
            .allow("").allow(null)
            .allow(null)
            .optional(),
          orgId: Joi.number()
            .allow("")
            .allow(null)
            .optional(),
          orgLogoFile: Joi.string().allow("").optional(),

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
          .where({ companyId: payload.companyId.toUpperCase(), orgId: orgId });
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
        /*For Organisation Logo Use*/
        let orgLogo = "";
        if (req.body.orgLogoFile) {
          for (image of req.body.orgLogoFile) {
            orgLogo = image.s3Url;
          }
        }
        console.log("==============", req.body.orgLogoFile)

        let taxId = null;
        taxId = payload.taxId ? payload.taxId : null;
        let insertData;

        if (req.body.orgLogoFile.length) {
          insertData = { ...payload, companyId: payload.companyId.toUpperCase(), orgId, taxId, orgLogoFile: orgLogo, updatedAt: currentTime };
        }

        // let insertResult2 = await knex
        //   .update(insertData)
        //   .where({ id: payload.id })
        //   .returning(["*"])
        //   .transacting(trx)
        //   .into("companies");


        if (req.body.logoFile.length) {
          insertData = { ...payload, companyId: payload.companyId.toUpperCase(), orgId, taxId, logoFile: logo, updatedAt: currentTime };
        } else if (req.body.orgLogoFile.length) {
          insertData = { ...payload, companyId: payload.companyId.toUpperCase(), orgId, taxId, orgLogoFile: orgLogo, updatedAt: currentTime };

        } else {
          insertData = { ...payload, companyId: payload.companyId.toUpperCase(), orgId, taxId, updatedAt: currentTime };
        }
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id })
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
      let sortPayload = req.body;
      //if(sortPayload.sortBy && sortPayload.orderBy){

      //} else{
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "companies.companyName";
        sortPayload.orderBy = "asc"
      }

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
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
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
        bucketName = process.env.S3_BUCKET_NAME;
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
            CONTACT_PERSON: "",
            DESCRIPTION: ""
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
            let url = process.env.S3_BUCKET_URL + "/Export/Company/" +
              filename;
            // let url =
            //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Company/" +
            //   filename;
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
      let orgId = req.query.orgId;
      if (role === "superAdmin" && name === "superAdmin") {

        if (orgId) {

          [result] = await Promise.all([
            knex("companies")
              .select("id", "companyId", "companyName as CompanyName")
              .where({ isActive: true, orgId: orgId })
              .orderBy('companies.companyName', 'asc')
          ]);

        } else {
          [result] = await Promise.all([
            knex("companies")
              .select("id", "companyId", "companyName as CompanyName")
              .where({ isActive: true })
              .orderBy('companies.companyName', 'asc')
          ]);
        }
      } else {

        [result] = await Promise.all([
          knex("companies")
            .select("id", "companyId", "companyName as CompanyName")
            .where({ isActive: true, orgId: req.orgId })
            .orderBy('companies.companyName', 'asc')
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
      // if (req.file) {
      // console.log(req.file);
      // let tempraryDirectory = null;
      // if (process.env.IS_OFFLINE) {
      //   tempraryDirectory = "tmp/";
      // } else {
      //   tempraryDirectory = "/tmp/";
      // }
      // let resultData = null;
      // let file_path = tempraryDirectory + req.file.filename;
      // let wb = XLSX.readFile(file_path, { type: "binary" });
      // let ws = wb.Sheets[wb.SheetNames[0]];
      // let data = XLSX.utils.sheet_to_json(ws, {
      //   type: "string",
      //   header: "A",
      //   raw: false
      // });
      //data         = JSON.stringify(data);
      let data = req.body;
      console.log("+++++++++++++", data[0], "=========");

      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      let result = null;
      let userId = req.me.id;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)
      //errors.push(header);


      if (data[0].B === 'COMPANY_NAME' &&
        data[0].C === 'COMPANY_ALTERNATE_NAME' &&
        data[0].D === 'ADDRESS' &&
        data[0].E === 'ALTERNATE_ADDRESS' &&
        data[0].F === 'TAX_ID' &&
        data[0].G === 'CONTACT_PERSON' &&
        data[0].H === 'DESCRIPTION' &&
        data[0].A === 'COMPANY' || data[0].A === 'Ã¯Â»Â¿COMPANY'
      ) {
        if (data.length > 0) {

          let i = 0;
          for (let companyData of data) {
            i++;

            if (i > 1) {

              if (!companyData.A) {
                let values = _.values(companyData)
                values.unshift('Company ID can not empty')
                errors.push(values);
                fail++;
                continue;
              }

              if (!companyData.B) {
                let values = _.values(companyData)
                values.unshift('Company Name can not empty')
                errors.push(values);
                fail++;
                continue;
              }


              let taxIdExists = [];
              if (companyData.F) {

                let taxId = companyData.F;
                taxId = taxId.toString();

                if (taxId.length != 13) {
                  let values = _.values(companyData)
                  values.unshift('Enter tax id 13 digit!')
                  errors.push(values);
                  fail++;
                  continue;
                }
                if (isNaN(taxId)) {
                  let values = _.values(companyData)
                  values.unshift('Enter tax id numeric!')
                  errors.push(values);
                  fail++;
                  continue;

                }

                taxIdExists = await knex("companies")
                  .select("taxId")
                  .where({ taxId: companyData.F, orgId: req.orgId });
              }
              let checkExist = await knex("companies")
                .select("companyName")
                .where({ companyId: companyData.A.toUpperCase(), orgId: req.orgId });
              console.log("Check list company: ", checkExist);

              if (!taxIdExists.length) {


                if (checkExist.length < 1) {

                  let taxId = companyData.F;
                  if (taxId) {
                    taxId = taxId.toString();
                  } else {
                    taxId = null;
                  }

                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    companyId: companyData.A.toUpperCase(),
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
                  //header.push('description')
                  //let values = Object.values(companyData)
                  //values.push('Company ID already exists')
                  let values = _.values(companyData)
                  values.unshift('Company ID already exists')

                  //errors.push(header);
                  errors.push(values);
                  //errors.push({...companyData,description:})
                }

              } else {
                fail++;
                //errors.push({...companyData,description:'Tax ID already exists'})
                let values = _.values(companyData)
                values.unshift('Tax ID already exists')

                //errors.push(header);
                errors.push(values);
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
        "[controllers][propertysetup][importCompanyData] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }, // Company User List Data
  getUserCompanyList: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("companies")
          .leftJoin("users", "users.id", "companies.createdBy")
          .leftJoin("organisations", "companies.orgId", "organisations.id")
          .where('organisations.isActive', true)
          .where({ "companies.orgId": req.orgId })
          .first(),
        knex("companies")
          .leftJoin("users", "users.id", "companies.createdBy")
          .leftJoin("organisations", "companies.orgId", "organisations.id")
          .where('organisations.isActive', true)
          .where({ "companies.orgId": req.orgId })
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
  getCompanyListHavingPropertyUnits: async (req, res) => {
    try {
      let pagination = {};
      let result;
      let companyHavingPU1
      let companyArr1 = []
      // let companyHavingPU2
      // let companyArr2 =[]
      // let companyHavingPU3
      // let companyArr3=[]
      // let companyHavingPU4
      // let companyArr4=[]
      // if(req.query.areaName === 'common'){
      //   companyHavingPU2 = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      //   companyArr2 = companyHavingPU2.map(v => v.companyId)

      //   companyHavingPU3 = await knex('floor_and_zones').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      //   companyArr3 = companyHavingPU3.map(v => v.companyId)

      //   companyHavingPU4 = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      //   companyArr4 = companyHavingPU4.map(v => v.companyId)
      // } else {

      // companyHavingPU1 = await knex('property_units').select(['companyId']).where({orgId:req.orgId,isActive:true})
      // companyArr1 = companyHavingPU1.map(v => v.companyId)

      // companyHavingPU2 = await knex('buildings_and_phases').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      // companyArr2 = companyHavingPU2.map(v => v.companyId)

      // companyHavingPU3 = await knex('floor_and_zones').select(['companyId']).where({orgId:req.orgId,isActive:true})
      // companyArr3 = companyHavingPU3.map(v => v.companyId)

      // companyHavingPU4 = await knex('projects').select(['companyId']).where({ orgId: req.orgId, isActive: true })
      // companyArr4 = companyHavingPU4.map(v => v.companyId)
      // }

      //let finalArr = _.intersection(companyArr4, companyArr2, companyArr3,companyArr1)


      if (req.query.areaName === 'common') {
        companyHavingPU1 = await knex('property_units').select(['companyId']).where({ orgId: req.orgId, isActive: true, type: 2 })
        companyArr1 = companyHavingPU1.map(v => v.companyId)
        result = await knex("companies")
          .innerJoin('property_units', 'companies.id', 'property_units.companyId')
          .select("companies.id",
            "companies.companyId",
            "companies.companyName as CompanyName",
            "companies.logoFile as logoFile",
            "companies.description1"
          )
          .where({ 'companies.isActive': true, 'companies.orgId': req.orgId, 'property_units.type': 2 })
          .whereIn('companies.id', companyArr1)
          .groupBy(['companies.id', 'companies.companyName', 'companies.companyId'])
          .orderBy('companies.companyName', 'asc')





        //         result = await knex.raw(`
        //         SELECT public.companies.*
        // FROM public.companies
        // WHERE EXISTS (
        // SELECT 1 FROM public.common_area
        // WHERE public.common_area."companyId" = public.companies.id
        // ) and public.companies."orgId" = ${req.orgId}
        // `)

      } else if (req.query.areaName === 'all') {
        companyHavingPU1 = await knex('property_units').select(['companyId']).where({ orgId: req.orgId, isActive: true, type: 2 })
        companyArr1 = companyHavingPU1.map(v => v.companyId)
        result = await knex("companies")
          .innerJoin('property_units', 'companies.id', 'property_units.companyId')
          .select("companies.id",
            "companies.companyId",
            "companies.companyName as CompanyName",
            "companies.logoFile as logoFile",
            "companies.description1"
          )
          .where({ 'companies.isActive': true, 'companies.orgId': req.orgId })
          .whereIn('companies.id', companyArr1)
          .groupBy(['companies.id', 'companies.companyName', 'companies.companyId'])
          .orderBy('companies.companyName', 'asc')
      } else {

        //         result = await knex.raw(`
        //         SELECT public.companies.*
        // FROM public.companies
        // WHERE EXISTS (
        // SELECT 1 FROM public.common_area
        // WHERE public.common_area."companyId" = public.companies.id
        // ) and public.companies."orgId" = ${req.orgId}
        //         `)

        companyHavingPU1 = await knex('property_units').select(['companyId']).where({ orgId: req.orgId, isActive: true, type: 1 })
        companyArr1 = companyHavingPU1.map(v => v.companyId)
        result = await knex("companies")
          .innerJoin('property_units', 'companies.id', 'property_units.companyId')
          .select("companies.id",
            "companies.companyId",
            "companies.companyName as CompanyName",
            "companies.logoFile as logoFile",
            "companies.description1"
          )
          .where({ 'companies.isActive': true, 'companies.orgId': req.orgId, 'property_units.type': 1 })
          .whereIn('companies.id', companyArr1)
          .groupBy(['companies.id', 'companies.companyName', 'companies.companyId'])
          .orderBy('companies.companyName', 'asc')
      }





      pagination.data = result;
      return res.status(200).json({
        data: {
          companies: pagination
        },
        message: "Companies List!"
      });
    } catch (err) {
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
  getCompanyById: async (req, res) => {
    try {
      let companyId = req.body.id
      let orgId = req.orgId

      let companyResult = await knex("companies")
        .select([
          "companies.id",
          "companies.companyName",
        ])
        .where("companies.orgId", orgId)
        .where("companies.id", companyId)

      return res.status(200).json({
        data: {
          companies: companyResult
        },
        message: "Companies List!"
      });

    } catch (err) {
      console.log(
        "[controllers][companies][getCompany] :  Error",
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

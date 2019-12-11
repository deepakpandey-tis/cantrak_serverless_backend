const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const serviceRequest = require('../servicerequest')
const fs     = require('fs');
const request = require('request');
const path    = require('path')
//const trx = knex.transaction();

const companyController = {
  addCompany: async (req, res) => {
    try {
      let company = null;
      await knex.transaction(async trx => {
        const payload = req.body;
        const orgId = req.orgId;
        const userId = req.me.id;

        const schema = Joi.object().keys({
          companyName: Joi.string().required(),
          companyId: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          description1: Joi.string().required(),
          contactPerson: Joi.string().required(),
          companyAddressEng: Joi.string().required(),
          companyAddressThai: Joi.string().required(),
          country: Joi.string().required(),
          state: Joi.string().required(),
          city: Joi.string().required(),
          zipCode: Joi.string().allow('').optional(),
          telephone: Joi.string().allow('').optional(),
          fax: Joi.string().allow('').optional(),
          provinceCode: Joi.string().allow('').optional(),
          amphurCode: Joi.string().allow('').optional(),
          tumbonCode: Joi.string().allow('').optional(),
          flag: Joi.string().allow('').optional(),
          logoFile: Joi.string().allow('').optional(),
          taxId: Joi.string().allow('').optional(),
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
        console.log('ORG ID: ',orgId)
        let currentTime = new Date().getTime();
        let insertData = {
          ...payload,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: orgId,
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
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyName: Joi.string().required(),
          companyId: Joi.string().required(),
          descriptionEng: Joi.string().required(),
          description1: Joi.string().required(),
          contactPerson: Joi.string().required(),
          companyAddressEng: Joi.string().required(),
          companyAddressThai: Joi.string().required(),
          country: Joi.string().required(),
          state: Joi.string().required(),
          city: Joi.string().required(),
          zipCode: Joi.string().allow('').optional(),
          telephone: Joi.string().allow('').optional(),
          fax: Joi.string().allow('').optional(),
          provinceCode: Joi.string().allow('').optional(),
          amphurCode: Joi.string().allow('').optional(),
          tumbonCode: Joi.string().allow('').optional(),
          flag: Joi.string().allow('').optional(),
          logoFile: Joi.string().allow('').optional(),
          taxId   : Joi.string().allow('').optional(),
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

        let currentTime = new Date().getTime();
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id,orgId:req.orgId })
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
        let companyResult = await knex
          .select()
          .where({ id: payload.id,orgId:req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("companies");

        company = _.omit(companyResult[0], [
          "createdAt",
          "updatedAt",
          "isActive"
        ]);
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
        let companyResult = await knex
          .update({ isActive: false })
          .where({ id: payload.id,orgId:req.orgId })
          .returning(["*"])
          .transacting(trx)
          .into("companies");
        company = companyResult[0];
        trx.commit;
      });
      return res.status(200).json({
        data: {
          company: company
        },
        message: "Company deleted!"
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

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("companies")
          .innerJoin("users", "users.id", "companies.createdBy")
          .where({"companies.orgId":req.orgId})
          .first(),
        knex("companies")
          .innerJoin("users", "users.id", "companies.createdBy")
          .where({"companies.orgId":req.orgId})          
          .select([
            "companies.id as id",
            "companies.companyName as Company Name",
            "companies.contactPerson as Contact Person",
            "companies.telephone as Contact Number",
            "companies.isActive as Status",
            "users.name as Created By",
            "companies.createdAt as Date Created"
          ])
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
  /* * Export csv Company Data */
  exportCsvCompanyData: async (req, res) => {
    try {
      let reqData = req.query;
      let payload = req.body;

      let [rows] = await Promise.all([        

        knex("companies")
          .innerJoin("users", "users.id", "companies.createdBy")
          .where({"companies.orgId":req.orgId})        
          .select([
            "companies.orgId as ORGANIZATION_ID",
            "companies.id as COMPANY",
            "companies.companyName as COMPANY_NAME",            
            "companies.description1 as COMPANY_ALTERNATE_NAME",
            "companies.companyAddressEng as ADDRESS",
            "companies.companyAddressThai as ALTERNATE_ADDRESS",
            "companies.taxId as TAX_ID",
            "companies.contactPerson as CONTACT_PERSON",
            "companies.isActive as Status",
            "companies.telephone as Contact Number",            
            "users.name as Created By",
            "companies.createdBy as Created By Id",
            "companies.createdAt as Date Created"           
          ])
      ]);

     let tempraryDirectory = null;
     // if (process.env.dev && process.env.dev) {
        tempraryDirectory = '/tmp/';//path.join(__dirname, `/tmp`);
      //} else {
        //tempraryDirectory = 'tmp/';
      //}

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename     = "CompanyData-" + Date.now() + ".csv";
      let filepath     = tempraryDirectory+filename;
      let check        = XLSX.writeFile(wb, filepath);
      const AWS        = require('aws-sdk');

      fs.readFile(filepath, function(err, file_buffer) {
      var s3 = new AWS.S3();
      var params = {
        Bucket: 'sls-app-resources-bucket',
        Key: "Export/Company/"+filename,
        Body:file_buffer
      }
      s3.putObject(params, function(err, data) {
        if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
        } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
        }
      });
    })


    //let deleteFile   = await fs.unlink(filepath,(err)=>{})

      //let fileUrl =  serviceRequest.getUrl
      
      //fileUrl('text/csv',filename,'export/company').then(async d => {
        //let putUrl = d.uploadURL

        //let file =  fs.createReadStream(filepath).pipe(request.put(putUrl))
        //if(file){
         // 
        //}
        return res.status(200).json({
          data: rows,
          message: "Companies Data Export Successfully!",
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
      let [result] = await Promise.all([
        knex("companies").select('id', 'companyId', 'companyName as CompanyName').where({ "isActive" : 'true',"orgId":req.orgId})
      ]);
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
    // Company List Data
  }
};

module.exports = companyController;

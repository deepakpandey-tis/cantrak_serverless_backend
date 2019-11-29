const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const XLSX = require("xlsx");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
//const trx = knex.transaction();

const organisationsController = {
  addOrganisation: async (req, res) => {
    try {
      let organisation = null;
      let user         = null;
      await knex.transaction(async trx => {
        let payloadData    = req.body;
        const payload      = req.body;
        const schema       = Joi.object().keys({
          organisationName : Joi.string().required(),
          address          : Joi.string().required(),
          name             : Joi.string().required(),
          userName         : Joi.string().required(),
          email            : Joi.string().required(),
        });

        const result = Joi.validate(_.omit(payload,"mobileNo"), schema);
        console.log(
          "[controllers][administrationFeatures][addOrganisation]: JOi Result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        const existUser   = await knex('users').where({ userName: payloadData.userName });
        const existEmail  = await knex('users').where({ email: payloadData.email });
        const existMobile = await knex('users').where({ mobileNo: payloadData.mobileNo });
        
        if (existUser && existUser.length) {
          return res.status(400).json({
              errors: [
                  { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
              ],
          });
      }
      // Return error when email exist
      if (existEmail && existEmail.length) {
          return res.status(400).json({
              errors: [
                  { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
              ],
          });
      }
      // Return error when mobileNo exist
      if (payloadData.mobileNo && existMobile && existMobile.length) {
          return res.status(400).json({
              errors: [
                  { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
              ],
          });
      }
                

        let currentTime = new Date().getTime();
        let insertData = {
          organisationName:payloadData.organisationName,
          address  : payloadData.address,     
          createdAt: currentTime,
          updatedAt: currentTime
        };
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("organisations");
          organisation = insertResult[0];

          let mobile =  "";
          if(payloadData.mobileNo){
            mobile  = payloadData.mobileNo;
          }


        let insertUserData = {
          name          : payloadData.name,
          userName      : payloadData.userName,
          email         : payloadData.email,
          mobileNo      : mobile,
          organisationId: organisation.id,
          createdAt: currentTime,
          updatedAt: currentTime
        }
        let insertUserResult = await knex.insert(insertUserData)
        .returning(["*"])
        .transacting(trx)
        .into('users');
        user  = insertUserResult[0];

        let organisationUpdateResult = await knex.update({organisationAdminId:user.id})
        .where({ id: organisation.id})
          .returning(["*"])
          .transacting(trx)
        .into('organisations')
        trx.commit;
      });

      return res.status(200).json({
        data: {
          organisationResult: {...organisation,user}
        },
        message: "Organisation created successfully!."
      });
    } catch (err) {
      console.log("[controllers][administrationFeatures][addOrganisation] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  updateOrganisation: async (req, res) => {
    try {
      let organisation = null;
      let user         = null;
      await knex.transaction(async trx => {
        const payloadData  = req.body;
        const payload      = req.body;
        const schema       = Joi.object().keys({
          organisationName : Joi.string().required(),
          address          : Joi.string().required(),
          name             : Joi.string().required(),
          userName         : Joi.string().required(),
          email            : Joi.string().required(),
        });

        const result = Joi.validate(_.omit(payload,"mobileNo","id"), schema);
        console.log(
          "[controllers][administrationFeatures][addOrganisation]: JOi Result",
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
        //let insertData = { ...payload, updatedAt: currentTime };
        let insertData = {
          organisationName:payloadData.organisationName,
          address  : payloadData.address,     
          updatedAt: currentTime
        };
        let insertResult = await knex
          .update(insertData)
          .where({ id: payload.id })
          .returning(["*"])
          .transacting(trx)
          .into("organisations");
          organisation = insertResult[0];
         let userId = organisation.organisationAdminId;



         let insertUserData = {
          name          : payloadData.name,
          userName      : payloadData.userName,
          email         : payloadData.email,
          mobileNo      : payloadData.mobileNo,
          updatedAt: currentTime
        }

   
        let insertUser = await knex
          .update(insertUserData)
          .where({ id: userId})
          .returning(["*"])
          .transacting(trx)
          .into("users");
          user = insertUser[0];
        trx.commit;
      });

      return res.status(200).json({
        data: {
          organisation:{...organisation,...user}
        },
        message: "Organisation details updated successfully."
      });
    } catch (err) {
      console.log("[controllers][generalsetup][updateCompany] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  deleteOrganisation: async (req, res) => {
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
          .where({ id: payload.id })
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
  getOrganisationList: async (req, res) => {
    try {
      let reqData    = req.query;
      let pagination = {};
      let per_page   = reqData.per_page || 10;
      let page       = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("organisations")
          .leftJoin('users','organisations.id','users.organisationId')
          .first(),
        knex("organisations")
          .leftJoin('users','organisations.id','users.organisationId')
          .select([
            'organisations.*',
            'users.name',
            'users.email',
            'users.mobileNo'
          ])
          .orderBy('organisations.createdAt','desc')
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
          organisations: pagination
        },
        message: "Organisation List!"
      });
    } catch (err) {
      console.log("[controllers][organisation][getOrganisationList] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /* GET ORGANISATION DETAILS */
  getOrganisationDetails: async (req,res)=>{
   
    try {

     let id = req.query.id;
     let result = await knex("organisations")
          .leftJoin('users','organisations.id','users.organisationId')
          .select([
            'organisations.*',
            'users.name',
            'users.email',
            'users.mobileNo',
            'users.userName'
          ]).where({'organisations.id':id})

          return res.status(200).json({
            data: {
              organisationDetails: result[0]
            },
            message: "Organisation Details!."
          });

    } catch(err){
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = organisationsController;

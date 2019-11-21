const Joi    = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt      = require('jsonwebtoken');
const _      = require('lodash');
const XLSX   = require('xlsx');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
//const trx = knex.transaction();

const sourceofRequestController = {
  addsourceofRequest: async (req, res) => {
    try {

      let sourceofRequest = null
      //await knex.transaction(async trx => {
        const payload = req.body;
        
        const schema = Joi.object().keys({
          requestCode: Joi.string().required(),
          descriptionThai:Joi.string().optional().allow(''),
          descriptionEng:Joi.string().optional().allow('')
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][addbuildingPhase]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        
        let currentTime = new Date().getTime()
        let insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime };
        //insertData     = _.omit(insertData[0], ['descriptionEng'])
        let insertResult = await knex('source_of_request').insert(insertData).returning(['*'])
        sourceofRequest = insertResult[0]

       // trx.commit;
     // })

      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: 'Source of Request added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][addbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updatesourceofRequest: async (req, res) => {
    try {
      let sourceofRequest = null
     // await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          id          : Joi.string().required(),
          requestCode: Joi.string().required(),
          descriptionThai:Joi.string().optional().allow(''),
          descriptionEng:Joi.string().optional().allow('')
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][updatebuildingPhase]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex('source_of_request').update(insertData).where({ id: payload.id }).returning(['*'])
        sourceofRequest = insertResult[0]

      //  trx.commit;
     // })

      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: 'Source of Request details updated successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][updatePropertyType] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deletesourceofRequest: async (req, res) => {
    try {
      let sourceofRequest = null
     // await knex.transaction(async trx => {
        let payload = req.body;
        const schema = Joi.object().keys({
          id: Joi.string().required()
        })
        const result = Joi.validate(payload, schema)
        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        let sourceofRequestResult = await knex('source_of_request').update({ isActive: false }).where({ id: payload.id }).returning(['*'])
        sourceofRequest = sourceofRequestResult[0]
       // trx.commit;
     // })
      return res.status(200).json({
        data: {
          sourceofRequest: sourceofRequest
        },
        message: 'Source of Request deleted!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  // Get Source of Request List
  getsourceofRequestList: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("source_of_request").first(),
          knex("source_of_request")
          .select([
            "requestCode as Source Code",
            "descriptionEng as Description English",
            "descriptionThai as Description Thai",
            "isActive as Status",
            "createdby as Created By",
            "createdAt as Date Created"
          ])
          .offset(offset).limit(per_page)
        ])

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
          sourceofRequest: pagination
        },
        message: 'Source of Request List!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][get-property-type-list] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
    // Export Source of Request Data
  },exportsourceofRequest:async (req,res)=>{

    try {
      let reqData = req.query;
      let pagination = {};

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("source_of_request")
          .first(),
          knex("source_of_request")
          .select([
            "requestCode as Source Code",
            "descriptionEng as Description English",
            "descriptionThai as Description Thai",
            "isActive as Status",
            "createdby as Created By",
            "createdAt as Date Created"
          ])
          .offset(offset).limit(per_page)
        ])

      var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
      let filename = "uploads/SourceofRequestData-"+Date.now()+".csv";
      let  check = XLSX.writeFile(wb,filename);

      return res.status(200).json({
        data: {
          sourceofRequest: rows
        },
        message: 'Source of Request Data Export Successfully!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewbuildingPhase] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }

  }
}

module.exports = sourceofRequestController














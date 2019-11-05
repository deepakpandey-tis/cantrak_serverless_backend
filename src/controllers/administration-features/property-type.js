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

const propertyTypeController = {
  addPropertyType: async (req, res) => {
    try {


      let propertyType = null
      await knex.transaction(async trx => {
        const payload = req.body;
        
        const schema = Joi.object().keys({
          propertyType: Joi.string().required(),
          propertyTypeCode: Joi.string().required(),
          createdBy: Joi.string().required(),
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
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('property_types')
        propertyType = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          propertyType: propertyType
        },
        message: 'Property Type added successfully.'
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
  updatePropertyType: async (req, res) => {
    try {
      let PropertyType = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          id          : Joi.string().required(),
          propertyType: Joi.string().required(),
          propertyTypeCode: Joi.string().required(),
          createdBy: Joi.string().required(),
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
        let insertResult = await knex.update(insertData).where({ id: payload.id }).returning(['*']).transacting(trx).into('property_types')
        PropertyType = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          PropertyType: PropertyType
        },
        message: 'Property Type details updated successfully.'
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
  deletePropertyType: async (req, res) => {
    try {
      let propertyType = null
      await knex.transaction(async trx => {
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
        let propertyTypeResult = await knex.update({ isActive: false }).where({ id: payload.id }).returning(['*']).transacting(trx).into('property_types')
        propertyType = propertyTypeResult[0]
        trx.commit;
      })
      return res.status(200).json({
        data: {
          PropertyType: propertyType
        },
        message: 'Property Type deleted!'
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
  getPropertyTypeList: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("property_types")
          .innerJoin('users','property_types.createdBy','users.id')
          .where({ 'property_types.isActive': true}).first(),
          knex("property_types")
          .innerJoin('users','property_types.createdBy','users.id')
          .select([
            'property_types.propertyType as Property Type',
            'property_types.propertyTypeCode as Property Type Code',
            'property_types.isActive as Status',
            'users.name as Created By',
            'property_types.createdAt as Date Created',
          ])
          .where({ 'property_types.isActive': true}).offset(offset).limit(per_page)
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
          propertyType: pagination
        },
        message: 'Property Type List!'
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
    // Export Building Phase Data
  },exportPropertyType:async (req,res)=>{

    try {
      let reqData = req.query;
      let pagination = {};

        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("property_types")
          .innerJoin('users','property_types.createdBy','users.id')
          .where({ 'property_types.isActive': true}).first(),
          knex("property_types")
          .innerJoin('users','property_types.createdBy','users.id')
          .select([
            'property_types.propertyType as Property Type',
            'property_types.propertyTypeCode as Property Type Code',
            'property_types.isActive as Status',
            'users.name as Created By',
            'property_types.createdAt as Date Created',
          ])
          .where({ 'property_types.isActive': true}).offset(offset).limit(per_page)
        ])

      var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
      let filename = "uploads/PropertyTypeData-"+Date.now()+".csv";
      let  check = XLSX.writeFile(wb,filename);

      return res.status(200).json({
        data: {
          propertyType: rows
        },
        message: 'Property Type Data Export Successfully!'
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

module.exports = propertyTypeController














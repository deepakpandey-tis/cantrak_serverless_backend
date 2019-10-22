const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const XLSX   = require('xlsx');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
//const trx = knex.transaction();

const propertyUnitController = {
  addPropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseId: Joi.string().required(),
          floorZoneId: Joi.string().required(),
          unitNumber: Joi.string().required(),
          houseId: Joi.string().required(),
          description: Joi.string().required(),
          productCode: Joi.string().required(),
          area: Joi.string().required(),
          createdBy: Joi.string().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][addpropertyUnit]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime };
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('property_units')
        propertyUnit = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: 'Property Unit added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][addpropertyUnit] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updatePropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null
      await knex.transaction(async trx => {
        const payload = req.body;


        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseId: Joi.string().required(),
          floorZoneId: Joi.string().required(),
          unitNumber: Joi.string().required(),
          houseId: Joi.string().required(),
          description: Joi.string().required(),
          productCode: Joi.string().required(),
          area: Joi.string().required(),
          createdBy: Joi.string().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][updatepropertyUnit]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex.update(insertData).where({ id: payload.id }).returning(['*']).transacting(trx).into('property_units')
        propertyUnit = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: 'Property Unit details updated successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][updatepropertyUnit] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  viewPropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null;
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
        let current = new Date().getTime()
        let propertyUnitResult = await knex.select().where({ id: payload.id }).returning(['*']).transacting(trx).into('property_units')

        propertyUnit = _.omit(propertyUnitResult[0], ['createdAt', 'updatedAt', 'isActive'])
        trx.commit;
      })
      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: 'propertyUnit details'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewpropertyUnit] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deletePropertyUnit: async (req, res) => {
    try {
      let propertyUnit = null
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
        let propertyUnitResult = await knex.update({ isActive: false }).where({ id: payload.id }).returning(['*']).transacting(trx).into('property_units')
        propertyUnit = propertyUnitResult[0]
        trx.commit;
      })
      return res.status(200).json({
        data: {
          propertyUnit: propertyUnit
        },
        message: 'Property Unit deleted!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewpropertyUnit] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getPropertyUnitList: async (req, res) => {
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("property_units").first(),
          knex("property_units")
          .select([
            'property_units.unitNumber as Unit No',
            'property_units.description as Description',
            'property_units.area as Area',
            'property_units.isActive as Status',
            'property_units.createdBy as Created By',
            'property_units.createdAt as Date Created',
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

      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("property_units").first(),
          knex.from("property_units")
          .innerJoin("companies", "property_units.companyId", "companies.id")
          .select([
            'property_units.unitNumber as Unit No',
            'property_units.description as Description',
            'property_units.area as Area',
            'property_units.isActive as Status',
            'property_units.createdBy as Created By',
            'property_units.createdAt as Date Created',
          ])
          .where({ 'property_units.companyId': companyId }).offset(offset).limit(per_page)
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
      }
      return res.status(200).json({
        data: {
          propertyUnits: pagination
        },
        message: 'Property Units List!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewpropertyUnit] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },exportPropertyUnit:async (req,res)=>{
    try {
      let companyId = req.query.companyId;
      let reqData = req.query;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("property_units").first(),
          knex("property_units")
          .select([
            'property_units.unitNumber as Unit No',
            'property_units.description as Description',
            'property_units.area as Area',
            'property_units.isActive as Status',
            'property_units.createdBy as Created By',
            'property_units.createdAt as Date Created',
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

      } else {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("property_units").first(),
          knex.from("property_units")
          .innerJoin("companies", "property_units.companyId", "companies.id")
          .select([
            'property_units.unitNumber as Unit No',
            'property_units.description as Description',
            'property_units.area as Area',
            'property_units.isActive as Status',
            'property_units.createdBy as Created By',
            'property_units.createdAt as Date Created',
          ])
          .where({ 'property_units.companyId': companyId }).offset(offset).limit(per_page)
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
      }

   
      var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
      var ws = XLSX.utils.json_to_sheet(pagination.data);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
      let filename = "uploads/PropertyUnitData-"+Date.now()+".csv";
      let  check = XLSX.writeFile(wb,filename);

      return res.status(200).json({
        data: pagination.data,
        message: 'Property Units Data Export Successfully!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewpropertyUnit] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = propertyUnitController

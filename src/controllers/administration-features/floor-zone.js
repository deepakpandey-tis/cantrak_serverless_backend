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

const floorZoneController = {
  addFloorZone: async (req, res) => {
    try {
      let floorZone = null
      await knex.transaction(async trx => {
        const payload = req.body;
        const schema = Joi.object().keys({
          createdBy: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseId: Joi.string().required(),
          floorZoneCode: Joi.string().required(),
          description: Joi.string().required(),
          totalFloorArea: Joi.string().required(),
          createdBy: Joi.string().required(),
        })
        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][addfloorZone]: JOi Result', result);
        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        let currentTime = new Date().getTime()
        let insertData = { ...payload, createdAt: currentTime, updatedAt: currentTime };
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('floor_and_zones')
        floorZone = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: 'Floor/Zone added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][addfloorZone] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateFloorZone: async (req, res) => {
    try {
      let floorZone = null
      await knex.transaction(async trx => {
        const payload = req.body;

        const schema = Joi.object().keys({
          id: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          propertyTypeId: Joi.string().required(),
          buildingPhaseId: Joi.string().required(),
          floorZoneCode: Joi.string().required(),
          description: Joi.string().required(),
          totalFloorArea: Joi.string().required(),
          createdBy: Joi.string().required(),
        })


        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][updatefloorZone]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime()
        let insertData = { ...payload, updatedAt: currentTime };
        let insertResult = await knex.update(insertData).where({ id: payload.id }).returning(['*']).transacting(trx).into('floor_and_zones')
        floorZone = insertResult[0]

        trx.commit;
      })

      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: 'Floor/Zone details updated successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][updatefloorZone] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  viewFloorZone: async (req, res) => {
    try {
      let floorZone = null;
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
      let floorZoneResult = await knex('floor_and_zones').select().where({ id: payload.id })

      floorZone = _.omit(floorZoneResult[0], ['createdAt', 'updatedAt', 'isActive'])
      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: 'Floor/Zone details'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewfloorZone] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteFloorZone: async (req, res) => {
    try {
      let floorZone = null
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
        let floorZoneResult = await knex.update({ isActive: false }).where({ id: payload.id }).returning(['*']).transacting(trx).into('floor_and_zones')
        floorZone = floorZoneResult[0]
        trx.commit;
      })
      return res.status(200).json({
        data: {
          floorZone: floorZone
        },
        message: 'Floor/Zone deleted!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewfloorZone] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getFloorZoneList: async (req, res) => {

    try {
      let reqData = req.query;
      let companyId = req.query.companyId;
      let projectId = req.query.projectId;
      let buildingPhaseId = req.query.buildingPhaseId;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .first(),
          knex("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .select([
            'floor_and_zones.floorZoneCode as Floor/Zone',
            'floor_and_zones.description as Description',
            'floor_and_zones.totalFloorArea as Total Area',
            'floor_and_zones.isActive as Status',
            'users.name as Created By',
            'floor_and_zones.createdAt as Date Created'
            
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
        let filters = {}
        filters['floor_and_zones.companyId'] = companyId
        if(projectId){
          filters['floor_and_zones.projectId'] = projectId
        }
        if(buildingPhaseId){
          filters['floor_and_zones.buildingPhaseId'] = buildingPhaseId
        }

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .where(filters)
          
          .offset(offset).limit(per_page).first(),
          knex.from("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .select([
            'floor_and_zones.floorZoneCode as Floor/Zone',
            'floor_and_zones.description as Description',
            'floor_and_zones.totalFloorArea as Total Area',
            'floor_and_zones.isActive as Status',
            'users.name as Created By',
            'floor_and_zones.createdAt as Date Created'
            
           ])
          .where(filters).offset(offset).limit(per_page)
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
          floorZones: pagination
        },
        message: 'Floor/Zones List!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewfloorZone] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },exportFloorZone: async  (req,res)=>{

    try {
      let reqData = req.query;
      let companyId = req.query.companyId;
      let pagination = {};

      if (!companyId) {
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .first(),
          knex("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .select([
            'floor_and_zones.floorZoneCode as Floor/Zone',
            'floor_and_zones.description as Description',
            'floor_and_zones.totalFloorArea as Total Area',
            'floor_and_zones.isActive as Status',
            'users.name as Created By',
            'floor_and_zones.createdAt as Date Created'
            
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
          knex.count('* as count').from("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .where({ 'floor_and_zones.companyId': companyId })
          
          .offset(offset).limit(per_page).first(),
          knex.from("floor_and_zones")
          .innerJoin("companies", "floor_and_zones.companyId", "companies.id")
          .innerJoin("users", "floor_and_zones.createdBy", "users.id")
          .select([
            'floor_and_zones.floorZoneCode as Floor/Zone',
            'floor_and_zones.description as Description',
            'floor_and_zones.totalFloorArea as Total Area',
            'floor_and_zones.isActive as Status',
            'users.name as Created By',
            'floor_and_zones.createdAt as Date Created'
            
           ])
          .where({ 'floor_and_zones.companyId': companyId }).offset(offset).limit(per_page)
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
      let filename = "uploads/FloorZoneData-"+Date.now()+".csv";
      let  check = XLSX.writeFile(wb,filename);

      return res.status(200).json({
        data: pagination.data
        ,
        message: 'Floor/Zones Data Export Successfully!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][viewfloorZone] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = floorZoneController

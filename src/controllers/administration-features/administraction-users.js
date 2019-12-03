const Joi    = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt      = require('jsonwebtoken');
const _      = require('lodash');
const XLSX   = require('xlsx');
const knex   = require('../../db/knex');
const bcrypt = require('bcrypt');
const saltRounds = 10;
//const trx = knex.transaction();

const usersController = {
  addUserRole: async (req, res) => {
    try {


      let userRole = null
        const payload = req.body;
        
        const schema = Joi.object().keys({
          userId: Joi.number().required(),
          roleId: Joi.number().required(),
        })

        const result = Joi.validate(payload, schema)
        console.log('[controllers][administrationFeatures][add role]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }
        // Check User Id & role Id Exist
        let checkUseridExist = await knex.select('id').from('users').where({'id':payload.userId});
        let checkUserroleidExist = await knex.select('id').from('roles').where({'id':payload.roleId});
        let checkUserroleExist = await knex.select('id').from('user_roles').where({'roleId':payload.roleId,'userId':payload.userId});
        

        if(checkUseridExist.length==0){
          return res.status(400).json({
            errors: [
                { code: 'USERID_NOTEXIST_ERROR', message: 'UserId does not exist!' }
            ],
        });
      }
       
        if(checkUserroleidExist.length==0){
          return res.status(400).json({
            errors: [
                { code: 'ROLEID_NOTEXIST_ERROR', message: 'RoleId does not exist!' }
            ],
        });
        }

        if(checkUserroleExist.length>0){
          return res.status(400).json({
            errors: [
                { code: 'ROLE_EXIST_ERROR', message: 'User role already added!' }
            ],
        });
        }

        
        if(req.me.roles.includes('superAdmin') || req.me.roles.includes('admin')){

          let currentTime  = new Date().getTime()
          let insertData   = { ...payload, createdAt: currentTime, updatedAt: currentTime };
          let insertResult = await knex('user_roles').insert(insertData).returning(['*'])
          userRole         = insertResult[0]
        } else {

          let checkRole = '';
          let roleid    = '';
          if(req.me.roles.includes('engineer')){
        
            checkRole  = await knex.select('id').from('roles').where({'name':'engineer'});
            roleid     = checkRole[0].id;
            if(roleid>=payload.roleId){

              let currentTime  = new Date().getTime()
              let insertData   = { ...payload, createdAt: currentTime, updatedAt: currentTime };
              let insertResult = await knex('user_roles').insert(insertData).returning(['*'])
              userRole         = insertResult[0]

            } else{
              return res.status(400).json({
                errors: [
                    { code: 'PERMISSION_ERROR', message: 'Permission not allow add role!' }
                ],
            });
            }


          } else if(req.me.roles.includes('worker')){

            checkRole  = await knex.select('id').from('roles').where({'name':'worker'});
            roleid     = checkRole[0].id;
            if(roleid>=payload.roleId){

              let currentTime  = new Date().getTime()
              let insertData   = { ...payload, createdAt: currentTime, updatedAt: currentTime };
              let insertResult = await knex('user_roles').insert(insertData).returning(['*'])
              userRole         = insertResult[0]

            } else{
              return res.status(400).json({
                errors: [
                    { code: 'PERMISSION_ERROR', message: 'Permission not allow add role!' }
                ],
            });
            }

          } else if(req.me.roles.includes('technician')){

            checkRole  = await knex.select('id').from('roles').where({'name':'technician'});
            roleid     = checkRole[0].id;
            if(roleid>=payload.roleId){

              let currentTime  = new Date().getTime()
              let insertData   = { ...payload, createdAt: currentTime, updatedAt: currentTime };
              let insertResult = await knex('user_roles').insert(insertData).returning(['*'])
              userRole         = insertResult[0]

            } else{
              return res.status(400).json({
                errors: [
                    { code: 'PERMISSION_ERROR', message: 'Permission not allow add role!' }
                ],
            });
            }

          } else if(req.me.roles.includes('supervisor')){

            checkRole  = await knex.select('id').from('roles').where({'name':'supervisor'});
            roleid     = checkRole[0].id;
            if(roleid>=payload.roleId){

              let currentTime  = new Date().getTime()
              let insertData   = { ...payload, createdAt: currentTime, updatedAt: currentTime };
              let insertResult = await knex('user_roles').insert(insertData).returning(['*'])
              userRole         = insertResult[0]

            } else{
              return res.status(400).json({
                errors: [
                    { code: 'PERMISSION_ERROR', message: 'Permission not allow add role!' }
                ],
            });
            }


          } else if(req.me.roles.includes('customer')){

            checkRole  = await knex.select('id').from('roles').where({'name':'customer'});
            roleid     = checkRole[0].id;
            if(roleid>=payload.roleId){

              let currentTime  = new Date().getTime()
              let insertData   = { ...payload, createdAt: currentTime, updatedAt: currentTime };
              let insertResult = await knex('user_roles').insert(insertData).returning(['*'])
              userRole         = insertResult[0]

            } else{
              return res.status(400).json({
                errors: [
                    { code: 'PERMISSION_ERROR', message: 'Permission not allow add role!' }
                ],
            });
            }

          }
        
        }
       
      return res.status(200).json({
        data: {
          userRole: userRole
        },
        message: 'User Role added successfully.'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][roleadd] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteUserRole: async (req, res) => {
    try {
      let userRole = null
      
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
        let roleResult = await knex('user_roles').delete().where({ id: payload.id }).returning(['*'])
        userRole = roleResult[0]
       
      return res.status(200).json({
        data: {
          userRole: userRole
        },
        message: 'User Role deleted!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][userRole] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getUsersList: async (req, res) => {
    try {

        let reqData = req.query;
        let pagination = {};
        let per_page = reqData.per_page || 10;
        let page = reqData.current_page || 1;
        if (page < 1) page = 1;
        let offset = (page - 1) * per_page;

        let [total, rows] = await Promise.all([
          knex.count('* as count').from("users").where({ 'users.isActive': true}).first(),
          knex.select("*").from("users").where({ 'users.isActive': true}).offset(offset).limit(per_page)
          // .innerJoin('user_roles','users.id','user_roles.userId').
          // select([
          //   'users.id as id',
          //   'users.name as name',
          //   'users.email as email',
          //   'users.userName as userName',
          //   'users.isActive as isActive',
          //   'users.password as password',
          //   'users.location as location',
          //   'users.gender as gender',
          //   'users.mobileNo as mobileNo',
          //   'users.houseId as houseId',
          //   'users.verifyToken as verifyToken',
          //   'users.createdBy as createdBy',
          //   'users.createdAt as createdAt',
          //   'users.updatedAt as updatedAt',
          //   'users.verifyTokenExpiryTime',
          //   'users.emailVerified as emailVerified',
          //   'user_roles.roleId as roleId'
          //   ])
        ])
      
        let user  = await knex('users').select();
        let roles = await knex('user_roles').where({ userId: rows[0].id });
                    rows.roles = roles;
                    const Parallel = require('async-parallel');
                    rows.roles = await Parallel.map(rows.roles, async item => {
                        let rolename = await knex('roles').where({ id: item.roleId }).select('name');
                        rolename = rolename[0].name;
                        return rolename;
                    });
    
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
          usersList: pagination
        },
        message: 'Users List!'
      })
    } catch (err) {
      console.log('[controllers][generalsetup][get-users-list] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
}

module.exports = usersController














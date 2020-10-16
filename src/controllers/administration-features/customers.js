const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
const uuid = require('uuid/v4')
const emailHelper = require('../../helpers/email')
const XLSX = require("xlsx");
const fs = require('fs');

const customerController = {
  getCustomers: async (req, res) => {
    try {
      let userDetails = null;
      let units = null;
      let fullLocationDetails = [];
      let customerId = req.query.customerId;
      if (customerId) {
        userDetails = await knex("users")
          .leftJoin('user_house_allocation', 'users.id', 'user_house_allocation.userId')
          .leftJoin('property_units', 'user_house_allocation.houseId', 'property_units.id')
          .leftJoin(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "projects",
            "property_units.projectId",
            "projects.id"
          )
          .leftJoin(
            "companies",
            "property_units.companyId",
            "companies.id"
          )
          .leftJoin(
            "floor_and_zones",
            "property_units.floorZoneId",
            "floor_and_zones.id"
          )
          .select([
            "users.*",
            "buildings_and_phases.buildingPhaseCode",
            "projects.projectName",
            "companies.companyName",
            "floor_and_zones.floorZoneCode",
            "property_units.unitNumber",
            "property_units.id as house",
            "user_house_allocation.status",
            "companies.companyId",
            "projects.project as projectId",
            "buildings_and_phases.description as buildingDescription",
            "floor_and_zones.description as floorDescription",
            "property_units.description as propertyUnitDescription"

          ])
          .where({ 'users.id': customerId });


        // Users property units start
        units = await knex('user_house_allocation').select(['houseId', 'id']).where({ userId: customerId })
        for (let u of units) {
          let a = await knex('property_units').select([
            'companyId',
            'projectId',
            'buildingPhaseId',
            'floorZoneId',
            'id as unit'
          ]).where({ id: u.houseId })
          fullLocationDetails.push(a)

        }

        let userResult;
        if (userDetails.length) {

          userResult = userDetails[0];

        } else {

          userResult = await knex('requested_by').select('name', 'email', 'mobile as mobileNo').where({ id: customerId, orgId: req.orgId }).first();

        }

        // users property units end
        return res.status(200).json({
          userDetails: { ...userResult, propertyDetails: userDetails, fullLocationDetails },
        });
      }

      let filters = {}
      let { name, organisation } = req.body;
      if (name) {
        //filters['users.name'] = name;
      }
      // if (email) {
      //   //filters['users.email'] = email
      // }
      // if (mobile) {
      //   //filters['users.mobileNo'] = mobile;
      // }

      // if (company) {
      //   filters['property_units.companyId'] = company;
      // }
      // if (project) {
      //   filters['property_units.projectId'] = project;
      // }
      // if (building) {
      //   filters['property_units.buildingPhaseId'] = building;
      // }
      // if (floor) {
      //   filters['property_units.floorZoneId'] = floor;
      // }
      // if (houseId) {
      //   filters['property_units.houseId'] = houseId;
      // }



      let reqData = req.query;

      console.log("Req.orgId: ", req.orgId);

      //console.log("==============", orgId, "=================");

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let role = req.me.roles[0];
      let adminName = req.me.name;
      let total, rows;
      let teamUser;
      let id = req.me.id;

      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "users.id";
        sortPayload.orderBy = "asc"
      }


      if (role === "superAdmin" && adminName === "superAdmin") {

        [total, rows] = await Promise.all([
          knex("users")
            .leftJoin(
              "application_user_roles",
              "users.id",
              "application_user_roles.userId"
            )
            .leftJoin(
              "user_house_allocation",
              "users.id",
              "user_house_allocation.userId"
            )
            .leftJoin(
              "property_units",
              "user_house_allocation.houseId",
              "property_units.id"
            )
            .select([
              "users.name as name",
              "users.email as email",
              // "user_house_allocation.houseId as houseId",
              "users.id as userId",
              "property_units.unitNumber",
              "users.isActive"
            ])
            .where({
              "application_user_roles.roleId": 4
            })
            .andWhere(qb => {
              if (Object.keys(filters).length || name || organisation) {

                if (name) {

                  qb.where('users.name', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                }
                if (organisation) {
                  qb.where('users.orgId', organisation)
                }
              }
            })
            .groupBy(['users.id', 'property_units.id'])
            .distinct(['users.id'])
          ,
          knex("users")
            .leftJoin(
              "application_user_roles",
              "users.id",
              "application_user_roles.userId"
            )
            .leftJoin(
              "user_house_allocation",
              "users.id",
              "user_house_allocation.userId"
            )
            .leftJoin(
              "property_units",
              "user_house_allocation.houseId",
              "property_units.id"
            )
            .select([
              "users.name as name",
              "users.email as email",
              //"user_house_allocation.houseId as houseId",
              "users.id as userId",
              "property_units.unitNumber",
              "users.isActive"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .where({
              "application_user_roles.roleId": 4
            })
            .andWhere(qb => {
              if (Object.keys(filters).length || name || organisation) {
                if (name) {
                  qb.where('users.name', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                }
                if (organisation) {
                  qb.where('users.orgId', organisation)
                }
              }
            })
            .groupBy(['users.id', 'property_units.id'])
            .distinct(['users.id'])
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        let resourceProject = req.userProjectResources[0].projects;

        [total, rows] = await Promise.all([
          knex("users")
            .leftJoin(
              "application_user_roles",
              "users.id",
              "application_user_roles.userId"
            )
            .leftJoin(
              "user_house_allocation",
              "users.id",
              "user_house_allocation.userId"
            )
            .leftJoin(
              "property_units",
              "user_house_allocation.houseId",
              "property_units.id"
            )
            .select([
              "users.name as name",
              "users.email as email",
              //"user_house_allocation.houseId as houseId",
              "users.id as userId",
              "property_units.unitNumber",
              "users.isActive"
            ])
            .where({
              "application_user_roles.roleId": 4,
              "users.orgId": req.orgId
            })
            .groupBy(['users.id', 'property_units.id'])
            .distinct(['users.id'])
            .whereIn('property_units.projectId', resourceProject)
            .andWhere(qb => {
              if (Object.keys(filters).length || name || organisation) {
                if (name) {
                  qb.where('users.name', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                }
                if (organisation) {
                  qb.where('users.orgId', organisation)
                }
              }
            })

          ,
          knex("users")
            .leftJoin(
              "application_user_roles",
              "users.id",
              "application_user_roles.userId"
            )
            .leftJoin(
              "user_house_allocation",
              "users.id",
              "user_house_allocation.userId"
            )
            .leftJoin(
              "property_units",
              "user_house_allocation.houseId",
              "property_units.id"
            )
            .select([
              "users.name as name",
              "users.email as email",
              //"property_units.id as houseId",
              //"user_house_allocation.houseId as houseId",
              "users.id as userId",
              "property_units.unitNumber",
              "users.isActive"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .where({
              "application_user_roles.roleId": 4,
              "users.orgId": req.orgId
            })
            .whereIn('property_units.projectId', resourceProject)
            .andWhere(qb => {
              if (Object.keys(filters).length || name || organisation) {

                if (name) {
                  qb.where('users.name', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.email', 'iLIKE', `%${name}%`)
                  qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
                }
                if (organisation) {
                  qb.where('users.orgId', organisation)
                }
              }
            })
            .groupBy(['users.id', 'property_units.id'])
            .distinct(['users.id'])
            .offset(offset)
            .limit(per_page)
        ]);
      }

      let count = total.length;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      //      pagination.data = rows;



      let Parallel = require('async-parallel');
      pagination.data = await Parallel.map(rows, async pd => {

        let houseData = await knex.from('user_house_allocation').where({ userId: pd.userId }).first();

        if (houseData) {
          return {
            ...pd,
            houseId: houseData.houseId
          }
        } else {
          return {
            ...pd,
            houseId: ""
          }
        }
      })


      return res.status(200).json({
        data: {
          customers: pagination
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  resetPassword: async (req, res) => {
    try {

      let id = req.query.id;
      let uuidv4 = uuid()
      let updatedCustomer;
      let subject = "Reset Password"
      updatedCustomer = await knex('users').update({ "verifyToken": uuidv4, "password": "" }).where({ id: id }).returning(['*'])
      let email = updatedCustomer[0].email;
      await emailHelper.sendTemplateEmail({ to: email, subject: subject, template: 'test-email.ejs', templateData: { fullName: updatedCustomer[0].name, OTP: 'https://dj47f2ckirq9d.cloudfront.net/reset-password/' + uuidv4 } })
      return res.status(200).json({
        data: updatedCustomer[0],
        message: "Password reset link sent. Please check your email!"
      });
    } catch (err) {
      console.log(
        "[controllers][customers][resetPassword] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  disassociateHouse: async (req, res) => {
    try {

      let houseId = req.body.houseId;
      let updatedCustomer;
      let message;
      let checkStatus = await knex.from('user_house_allocation').where({ houseId }).returning(['*'])
      if (checkStatus && checkStatus.length) {

        if (checkStatus[0].status === "1") {
          updatedCustomer = await knex('user_house_allocation').update({ status: 0 }).where({ houseId: houseId }).returning(['*'])
          message = "House Id Disassociate successfully!";
        } else {
          updatedCustomer = await knex('user_house_allocation').update({ status: 1 }).where({ houseId: houseId }).returning(['*'])
          message = "House Id Associate successfully!";
        }

      }
      return res.status(200).json({
        data: {
          customer: updatedCustomer,
          message: message
        }
      })
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*CREATE CUSTOMER OR COMPANY */
  createCustomer: async (req, res) => {
    try {
      let roleInserted;
      let insertedUser;
      await knex.transaction(async trx => {
        let orgId = req.orgId;

        console.log("======================", orgId)
        let payload = _.omit(req.body, [
          "buildingPhaseId",
          "companyId",
          "floorZoneId",
          "projectId",
          "unit",
          "houses"
        ]);

        //let payload = req.body;

        const schema = Joi.object().keys({
          userType: Joi.number().required(),
          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          mobileNo: Joi.string().allow("").allow(null).optional(),
          phoneNo: Joi.string().allow("").allow(null).optional(),
          location: Joi.string().allow("").allow(null).optional(),
          taxId: Joi.string().allow("").allow(null).optional(),
          nationalId: Joi.string().allow("").allow(null).optional(),
          allowLogin: Joi.boolean().allow("").allow(null).optional(),
          password: Joi.string().allow("").allow(null).optional(),
          fax: Joi.string().allow("").allow(null).optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addfloorZone]: JOi Result",
          result
        );
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. OPEN */
        const existUser = await knex('users').where({ userName: payload.userName });
        const existEmail = await knex('users').where({ email: payload.email });


        if (existUser && existUser.length) {
          return res.status(400).json({
            errors: [
              { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
            ],
          });
        }

        if (existEmail && existEmail.length) {
          return res.status(400).json({
            errors: [
              { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
            ],
          });
        }

        let mobileNo = null;

        if (payload.mobileNo) {

          mobileNo = payload.mobileNo;

          const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

          if (existMobile && existMobile.length) {
            return res.status(400).json({
              errors: [
                { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
              ],
            });
          }
        }
        /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. CLOSE */
        let emailVerified = false;
        let isActive = false;
        if (payload.allowLogin) {
          emailVerified = true;
          isActive = true;
        }
        let pass = payload.password;
        payload = _.omit(payload, 'allowLogin')
        let hash = await bcrypt.hash(payload.password, saltRounds);
        payload.password = hash;
        let uuidv4 = uuid()
        let currentTime = new Date().getTime()
        insertedUser = await knex("users")
          .insert({ ...payload, mobileNo: mobileNo, verifyToken: uuidv4, emailVerified: emailVerified, isActive: isActive, createdAt: currentTime, updatedAt: currentTime, createdBy: req.me.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx);
        console.log(payload);

        /*INSERT HOUSE ID OPEN */

        let houses = req.body.houses;

        houses = _.unionBy(houses, 'unit')

        for (let house of houses) {

          let checkHouseAllocation = await knex.from('user_house_allocation')
            .where({ houseId: house.unit, userId: insertedUser[0].id, orgId: req.orgId });

          await knex("user_house_allocation")
            .insert({ houseId: house.unit, userId: insertedUser[0].id, status: 1, orgId: req.orgId, createdAt: currentTime, updatedAt: currentTime })
            .returning(["*"])
            .transacting(trx);

        }
        /*INSERT HOUSE ID CLOSE */

        // Insert this users role as customer
        roleInserted = await knex('application_user_roles').insert({ userId: insertedUser[0].id, roleId: 4, createdAt: currentTime, updatedAt: currentTime, orgId: orgId })
          .returning(['*']).transacting(trx)

        let user = insertedUser[0]
        console.log('User: ', insertedUser)
        if (insertedUser && insertedUser.length) {


          await emailHelper.sendTemplateEmail({ to: payload.email, subject: 'Welcome to Service Mind', template: 'welcome-org-admin-email.ejs', templateData: { fullName: payload.name, username: payload.userName, password: pass, uuid: uuidv4 } })

        }
        trx.commit;
      })
      return res.status(200).json({
        insertedUser, roleInserted,
        message: "Tenant & companies created successfully!"

      });
    } catch (err) {
      console.log(
        "[controllers][customers][createCustome] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /*UPDATE CUSTOMER OR TENANT COMPANY */
  updateCustomer: async (req, res) => {
    try {
      let insertedUser;
      await knex.transaction(async trx => {
        let orgId = req.orgId;

        console.log("======================", orgId)
        let payload = _.omit(req.body, [
          "buildingPhaseId",
          "companyId",
          "floorZoneId",
          "projectId",
          "unit",
          "houses"
        ]);

        //let payload = req.body;

        const schema = Joi.object().keys({
          userType: Joi.number().required(),
          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          mobileNo: Joi.string().allow("").allow(null).optional(),
          phoneNo: Joi.string().allow("").allow(null).optional(),
          location: Joi.string().allow("").allow(null).optional(),
          taxId: Joi.string().allow("").allow(null).optional(),
          nationalId: Joi.string().allow("").allow(null).optional(),
          allowLogin: Joi.boolean().allow("").allow(null).optional(),
          password: Joi.string().allow("").allow(null).optional(),
          id: Joi.string().required(),
          fax: Joi.string().allow("").allow(null).optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
          "[controllers][administrationFeatures][addfloorZone]: JOi Result",
          result
        );
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message }
            ]
          });
        }

        /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. OPEN */
        const existUser = await knex('users').where({ userName: payload.userName });
        const existEmail = await knex('users').where({ email: payload.email });


        if (existUser && existUser.length) {
          if (existUser[0].id == payload.id) {

          } else {
            return res.status(400).json({
              errors: [
                { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
              ],
            });
          }
        }

        if (existEmail && existEmail.length) {

          if (existEmail[0].id == payload.id) {

          } else {
            return res.status(400).json({
              errors: [
                { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
              ],
            });
          }
        }
        let mobileNo = null;

        if (payload.mobileNo) {
          mobileNo = payload.mobileNo;
          const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

          if (existMobile && existMobile.length) {

            if (existMobile[0].id == payload.id) {

            } else {

              return res.status(400).json({
                errors: [
                  { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
                ],
              });
            }
          }
        }
        /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. CLOSE */
        let emailVerified = false;
        let isActive = false;
        if (payload.allowLogin) {
          emailVerified = true;
          isActive = true;
        }
        payload = _.omit(payload, 'allowLogin')
        let currentTime = new Date().getTime()
        insertedUser = await knex("users")
          .update({ ...payload, mobileNo: mobileNo, emailVerified: emailVerified, isActive: isActive, updatedAt: currentTime, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .where({ id: payload.id });
        console.log(payload);


        let dbItems = await knex('user_house_allocation').select(['houseId', 'userId']).where({ userId: payload.id })
        let items = req.body.houses.map(v => ({ houseId: v.unit, userId: payload.id }))
        console.log('DB Items:********************************************************** ', dbItems)
        console.log('Items:*********************************************************** ', items)
        const removedItems = _.differenceWith(dbItems, items, (a, b) => {
          if (a.houseId == b.houseId && a.userId == b.userId) {
            return true;
          }
          return false
        });

        console.log('Removed Items:********************************************************** ', removedItems)


        const newItems = _.differenceWith(items, dbItems, (a, b) => {
          if (a.houseId == b.houseId && a.userId == b.userId) {
            return true;
          }
          return false
        });

        console.log('New Items:********************************************************** ', newItems)


        for (let r of removedItems) {
          await knex('user_house_allocation').del().where({ houseId: r.houseId, userId: insertedUser[0].id, orgId: req.orgId })
        }

        for (let house of newItems) {
          //let s = await knex('user_house_allocation').select(['houseId']).where({houseId:house.unit,userId:insertedUser[0].id})
          // if(Array.isArray(s) && !s.length){
          await knex("user_house_allocation")
            .insert({ houseId: house.houseId, userId: insertedUser[0].id, status: 1, orgId: req.orgId, createdAt: currentTime, updatedAt: currentTime })
          // }
        }
        trx.commit;
      })
      return res.status(200).json({
        insertedUser,
        message: "Tenant & companies updated successfully!"

      });
    } catch (err) {
      console.log(
        "[controllers][customers][createCustome] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /*EXPORT TENANT DATA */
  exportTenantData: async (req, res) => {
    try {
      console.log("Req.orgId: ", req.orgId);
      let resourceProject = req.userProjectResources[0].projects;
      let name = req.query.name;

      [rows] = await Promise.all([

        knex.from("users")
          .leftJoin(
            "application_user_roles",
            "users.id",
            "application_user_roles.userId"
          )
          .leftJoin(
            "user_house_allocation",
            "users.id",
            "user_house_allocation.userId"
          )
          .leftJoin(
            "property_units",
            "user_house_allocation.houseId",
            "property_units.id"
          )
          .leftJoin(
            "companies",
            "property_units.companyId",
            "companies.id"
          )
          .leftJoin(
            "projects",
            "property_units.projectId",
            "projects.id"
          )
          .leftJoin(
            "buildings_and_phases",
            "property_units.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "property_units.floorZoneId",
            "floor_and_zones.id"
          )
          .select([
            "users.userType as TENANT_TYPE",
            "users.name as NAME",
            "users.userName as USER_NAME",
            "users.email as EMAIL",
            "users.mobileNo as MOBILE_NO",
            "users.phoneNo as PHONE_NO",
            "users.location as ADDRESS",
            "users.taxId as TAX_ID",
            "users.nationalId as NATIONAL_ID",
            //"companies.companyId as COMPANY_ID",
            //"projects.project as PROJECT_ID",
            //"buildings_and_phases.buildingPhaseCode as BUILDING_PHASE_CODE",
            //"floor_and_zones.floorZoneCode as FLOOR_ZONE_CODE",
            "property_units.unitNumber as UNIT_NUMBER",
          ])
          .orderBy('users.id', 'desc')
          .where({
            "application_user_roles.roleId": 4,
            "users.orgId": req.orgId
          })
          .where(qb => {

            if (name) {
              qb.where('users.name', 'iLIKE', `%${name}%`)
              qb.orWhere('users.email', 'iLIKE', `%${name}%`)
              qb.orWhere('users.mobileNo', 'iLIKE', `%${name}%`)
            }
          })
          .whereIn('property_units.projectId', resourceProject)

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
        let allow = { "ALLOW_LOGIN_SERVICEMIND": "" }
        rows.push(allow)
        //let row = _.unionBy(rows, 'EMAIL');
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            TENANT_TYPE: "",
            NAME: "",
            USER_NAME: "",
            EMAIL: "",
            MOBILE_NO: "",
            PHONE_NO: "",
            ADDRESS: "",
            TAX_ID: "",
            NATIONAL_ID: "",
            //COMPANY_ID: "",
            //PROJECT_ID: "",
            //BUILDING_PHASE_CODE: "",
            //FLOOR_ZONE_CODE: "",
            UNIT_NUMBER: "",
            ALLOW_LOGIN_SERVICEMIND: 1,
          }
        ]);
      }

      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "TenantData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);

      const AWS = require("aws-sdk");
      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Tenant/" + filename,
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
            // let deleteFile = fs.unlink(filepath, err => {
            //   console.log("File Deleting Error " + err);
            // });
            let url = process.env.S3_BUCKET_URL + "/Export/Tenant/" +
              filename;
            // let url =
            //   "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Tenant/" +
            //   filename;
            return res.status(200).json({
              data: rows,
              message: "Tenant Data Export Successfully!",
              url: url
            });
          }
        });
      });

    } catch (err) {
      console.log(
        "[controllers][customer][exportTenantData] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*IMPORT TENANT DATA */
  importTenantData: async (req, res) => {
    try {

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


      if (data[0].B === 'NAME' &&
        data[0].C === 'USER_NAME' &&
        data[0].D === 'EMAIL' &&
        data[0].E === 'MOBILE_NO' &&
        data[0].F === 'PHONE_NO' &&
        data[0].G === 'ADDRESS' &&
        data[0].H === 'TAX_ID' &&
        data[0].I === 'NATIONAL_ID' &&
        //data[0].J === 'COMPANY_ID' &&
        //data[0].K === 'PROJECT_ID' &&
        //data[0].L === 'BUILDING_PHASE_CODE' &&
        //data[0].M === 'FLOOR_ZONE_CODE' &&
        data[0].J === 'UNIT_NUMBER' &&
        data[0].A === 'TENANT_TYPE' || data[0].A === 'Ã¯Â»Â¿TENANT_TYPE'
      ) {
        if (data.length > 0) {

          let i = 0;
          for (let tenantData of data) {
            i++;

            if (i > 1) {

              if (!tenantData.A) {
                let values = _.values(tenantData)
                values.unshift('Tenant type is required!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!tenantData.B) {
                let values = _.values(tenantData)
                values.unshift('Name is required!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!tenantData.C) {
                let values = _.values(tenantData)
                values.unshift('User Name is required!')
                errors.push(values);
                fail++;
                continue;
              }

              if (!tenantData.D) {
                let values = _.values(tenantData)
                values.unshift('Email is required!')
                errors.push(values);
                fail++;
                continue;
              }


              if (!tenantData.J) {
                let values = _.values(tenantData)
                values.unshift('Unit number is required!')
                errors.push(values);
                fail++;
                continue;
              }

              let unitId = null;

              if (tenantData.J) {
                let checkUnit = await knex('property_units').select("id")
                  .where({ unitNumber: tenantData.J, orgId: req.orgId })

                if (!checkUnit.length) {
                  let values = _.values(tenantData)
                  values.unshift('Unit number does not exists')
                  errors.push(values);
                  fail++;
                  continue;
                }

                if (checkUnit.length) {
                  unitId = checkUnit[0].id;
                }

              }

              let checkExist = await knex('users').select("id")
                .where({ email: tenantData.D })

              let currentTime = new Date().getTime();

              if (checkExist.length < 1) {


                /*CHECK USER NAME EXIST OPEN */
                const existUser = await knex('users').where({ userName: tenantData.C });

                if (existUser && existUser.length) {
                  let values = _.values(tenantData)
                  values.unshift('User Name already exist!.!')
                  errors.push(values);
                  fail++;
                  continue;
                }
                /*CHECK USER NAME EXIST CLOSE */

                /*CHECK MOBILE NUMBER VALIDATION OPEN */

                if (tenantData.E) {

                  let mobile = tenantData.E;
                  mobile = mobile.toString();

                  if (mobile.length != 10) {
                    let values = _.values(tenantData)
                    values.unshift('Enter valid mobile No.!')
                    errors.push(values);
                    fail++;
                    continue;
                  }
                  if (isNaN(mobile)) {
                    let values = _.values(tenantData)
                    values.unshift('Enter valid mobile No.')
                    errors.push(values);
                    fail++;
                    continue;

                  }

                  let checkMobile = await knex('users').select("id")
                    .where({ mobileNo: tenantData.E })

                  if (checkMobile.length) {

                    let values = _.values(tenantData)
                    values.unshift('Mobile number already exists')
                    errors.push(values);
                    fail++;
                    continue;
                  }
                }
                /*CHECK MOBILE NUMBER VALIDATION CLOSE */


                let pass = "" + Math.round(Math.random() * 1000000);
                const hash = await bcrypt.hash(
                  pass,
                  saltRounds
                );

                let mobile = null;
                if (tenantData.E) {
                  mobile = tenantData.E
                }

                let taxId = null;
                let nationalId = null;
                if (tenantData.A == 1) {

                  if (tenantData.H) {
                    taxId = tenantData.H;
                  }

                } else if (tenantData.A == 2 || tenantData.A == 3) {
                  if (tenantData.I) {
                    nationalId = tenantData.I;
                  }

                }

                let emailVerified = false;
                let isActive = false;

                if (tenantData.K && tenantData.K == 1) {

                  emailVerified = true;
                  isActive = true;
                }

                let uuidv4 = uuid();

                let insertData = {
                  orgId: req.orgId,
                  userType: tenantData.A,
                  name: tenantData.B,
                  userName: tenantData.C,
                  email: tenantData.D,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  emailVerified: emailVerified,
                  password: hash,
                  mobileNo: mobile,
                  phoneNo: tenantData.F,
                  createdBy: req.me.id,
                  verifyToken: uuidv4,
                  taxId: taxId,
                  nationalId: nationalId,
                  location: tenantData.G,
                  isActive: isActive,
                }


                console.log("Password=============================", pass, "===========")

                result = await knex("users")
                  .insert(insertData)
                  .returning(["*"])


                // Insert this users role as customer
                let roleInserted = await knex('application_user_roles').insert({ userId: result[0].id, roleId: 4, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId })
                  .returning(['*']);

                let user = result[0]
                console.log('User: ', result)
                if (result && result.length) {

                  await emailHelper.sendTemplateEmail({ to: tenantData.D, subject: 'Welcome to Service Mind', template: 'welcome-org-admin-email.ejs', templateData: { fullName: tenantData.B, username: tenantData.C, password: pass, uuid: uuidv4 } });

                }

                /*INSERT HOUSE ID OPEN */
                if (unitId) {
                  await knex("user_house_allocation")
                    .insert({ houseId: unitId, userId: result[0].id, status: 1, orgId: req.orgId, createdAt: currentTime, updatedAt: currentTime })
                    .returning(["*"])
                }
                /*INSERT HOUSE ID CLOSE */

                success++;


              } else {


                if (unitId) {

                  let checkUserAllocation = await knex.from('user_house_allocation').where({
                    houseId: unitId, userId: checkExist[0].id, orgId: req.orgId
                  })

                  if (checkUserAllocation.length) {

                    let values = _.values(tenantData)
                    values.unshift('User & Unit number already exists')
                    errors.push(values);
                    fail++;


                  } else {

                    let resultUnitNumber = await knex("user_house_allocation")
                      .insert({ houseId: unitId, userId: checkExist[0].id, status: 1, orgId: req.orgId, createdAt: currentTime, updatedAt: currentTime })
                      .returning(["*"])
                    success++;
                  }

                } else {

                  let values = _.values(tenantData)
                  values.unshift('Email Id already exists')
                  errors.push(values);
                  fail++;
                }
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

    } catch (err) {
      console.log(
        "[controllers][customer][importTenantData] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getTenantListByMultiplePropertyUnits: async (req, res) => {
    try {
      let propertyUnit = req.body

      let orgId = req.orgId

      let tenantList = await knex("user_house_allocation")
        .leftJoin("users", "user_house_allocation.userId", "users.id")
        .select(["users.name", "users.id"])
        .whereIn("user_house_allocation.houseId", propertyUnit)
        .groupBy(['users.name', 'users.id'])
        .where("user_house_allocation.orgId", orgId)

      let tenant = _.uniqBy(tenantList, "id")

      return res.status(200).json({
        data: {
          tenants: tenant,
        },
        message: " Tenant list"

      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  }
};

module.exports = customerController
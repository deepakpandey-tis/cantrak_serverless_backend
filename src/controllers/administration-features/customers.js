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


const customerController = {
  getCustomers: async (req, res) => {
    try {
      let userDetails = null;
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
            "user_house_allocation.status"
          ])
          .where({ 'users.id': customerId });
        return res.status(200).json({
          userDetails: { ...userDetails[0], propertyDetails: userDetails },
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
              "user_house_allocation.houseId as houseId",
              "users.id as userId",
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
            }),
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
              "user_house_allocation.houseId as houseId",
              "users.id as userId",
              "users.isActive"
            ])
            .orderBy('users.id', 'desc')
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
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

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
              "user_house_allocation.houseId as houseId",
              "users.id as userId",
              "users.isActive"
            ])

            .where({
              "application_user_roles.roleId": 4,
              "users.orgId": req.orgId
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
            }),
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
              "user_house_allocation.houseId as houseId",
              "users.id as userId",
              "users.isActive"
            ])
            .orderBy('users.id', 'desc')
            .where({
              "application_user_roles.roleId": 4,
              "users.orgId": req.orgId
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
      pagination.data = rows;

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
      await emailHelper.sendTemplateEmail({ to: email, subject: subject, template: 'test-email.ejs', templateData: { fullName: updatedCustomer[0].name, OTP: 'http://localhost:4200/reset-password/' + uuidv4 } })
      return res.status(200).json({
        data: updatedCustomer[0],
        message: "Password Reset request successfully!"
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
        const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

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

        if (existMobile && existMobile.length) {
          return res.status(400).json({
            errors: [
              { code: 'MOBILE_EXIST_ERROR', message: 'MobileNo already exist !' }
            ],
          });
        }
        /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. CLOSE */
        let emailVerified = false;
        if (payload.allowLogin) {
          emailVerified = true;
        }
        let pass = payload.password;
        payload = _.omit(payload, 'allowLogin')
        let hash = await bcrypt.hash(payload.password, saltRounds);
        payload.password = hash;
        let uuidv4 = uuid()
        let currentTime = new Date().getTime()
        insertedUser = await knex("users")
          .insert({ ...payload, verifyToken: uuidv4, emailVerified: emailVerified, createdAt: currentTime, updatedAt: currentTime, createdBy: req.me.id, orgId: orgId })
          .returning(["*"])
          .transacting(trx);
        console.log(payload);

        /*INSERT HOUSE ID OPEN */
        // let houseResult = await knex("user_house_allocation")
        //   .insert({ houseId: req.body.unitId, userId: insertedUser[0].id, status: 1, orgId: orgId, createdAt: currentTime, updatedAt: currentTime })
        //   .returning(["*"])
        //   .transacting(trx);
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
        const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

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
        /*CHECK DUPLICATION USERNAME , EMAIL & MOBILE NO. CLOSE */
        let emailVerified = false;
        if (payload.allowLogin) {
          emailVerified = true;
        }
        payload = _.omit(payload, 'allowLogin')
        let currentTime = new Date().getTime()
        insertedUser = await knex("users")
          .update({ ...payload, emailVerified: emailVerified, updatedAt: currentTime, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .where({ id: payload.id });
        console.log(payload);

        /*INSERT HOUSE ID OPEN */
        // let houseResult = await knex("user_house_allocation")
        //   .insert({ houseId: req.body.unitId, userId: insertedUser[0].id, status: 1, orgId: orgId, createdAt: currentTime, updatedAt: currentTime })
        //   .returning(["*"])
        //   .transacting(trx);
        /*INSERT HOUSE ID CLOSE */
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
  }
};

module.exports = customerController
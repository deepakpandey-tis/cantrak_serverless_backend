const Joi = require("@hapi/joi");
// const moment = require("moment");
// const uuidv4 = require("uuid/v4");
// var jwt = require("jsonwebtoken");
const _ = require("lodash");
// const XLSX = require("xlsx");
const saltRounds = 10;
const bcrypt = require('bcrypt');
const knex = require("../../db/knex");
const emailHelper = require('../../helpers/email')


const organisationsController = {
  addOrganisation: async (req, res) => {
    try {
      let organisation = null;
      let user = null;
      let insertedResourcesResult = null
      await knex.transaction(async trx => {
        let payloadData = req.body;
        const payload = req.body;
        const schema = Joi.object().keys({
          organisationName: Joi.string().required(),
          address: Joi.string().required(),
          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          password: Joi.string().required(),
          resources: Joi.array().required()
        });

        const result = Joi.validate(_.omit(payload, "mobileNo"), schema);
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

        const existUser = await knex('users').where({ userName: payloadData.userName });
        const existEmail = await knex('users').where({ email: payloadData.email });
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
          organisationName: payloadData.organisationName,
          address: payloadData.address,
          createdAt: currentTime,
          updatedAt: currentTime
        };
        let insertResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("organisations");
        organisation = insertResult[0];

        let mobile = "";
        if (payloadData.mobileNo) {
          mobile = payloadData.mobileNo;
        }

        let pass = '123456'
        if (req.body.password) {
          pass = req.body.password
        }

        let hash = await bcrypt.hash(pass, saltRounds);

        payloadData.password = hash;

        let insertUserData = {
          name: payloadData.name,
          userName: payloadData.userName,
          email: payloadData.email,
          mobileNo: mobile,
          password: payloadData.password,
          orgId: organisation.id,
          emailVerified: true,
          createdAt: currentTime,
          updatedAt: currentTime
        }
        let insertUserResult = await knex.insert(insertUserData)
          .returning(["*"])
          .transacting(trx)
          .into('users');
        user = insertUserResult[0];

        let roleObejct = {
          userId: user.id,
          roleId: 2,
          orgId: organisation.id,
          createdAt: currentTime,
          updatedAt: currentTime,
        }

        let insertRoleResult = await knex.insert(roleObejct)
          .returning(['*'])
          .transacting(trx)
          .into('application_user_roles');


        let organisationUpdateResult = await knex.update({ organisationAdminId: user.id })
          .where({ id: organisation.id })
          .returning(["*"])
          .transacting(trx)
          .into('organisations')



        // Assign Resources to current organisation
        let resources = req.body.resources;
        let insertPayload = resources.map(resource => ({
          updatedAt: currentTime,
          createdAt: currentTime,
          resourceId: resource,
          orgId: organisation
            .id
        }));
        insertedResourcesResult = await knex(
          "organisation_resources_master"
        ).insert(insertPayload).returning(['*'])

        await emailHelper.sendTemplateEmail({ to: payloadData.email, subject: 'Welcome to Service Mind', template: 'welcome-org-admin-email.ejs', templateData: { fullName: payloadData.name, username: payloadData.userName, password: pass, layout: 'welcome-org-admin.ejs' } })

        trx.commit;
      });

      return res.status(200).json({
        data: {
          organisationResult: { ...organisation, user, insertedResourcesResult }
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
      let user = null;
      let resource;
      await knex.transaction(async trx => {
        const payloadData = req.body;
        const payload = req.body;
        const schema = Joi.object().keys({
          organisationName: Joi.string().required(),
          address: Joi.string().required(),
          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          resources: Joi.array().required(),
          password: Joi.string().allow("").optional(),
        });

        const result = Joi.validate(_.omit(payload, "mobileNo", "id"), schema);
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
          organisationName: payloadData.organisationName,
          address: payloadData.address,
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


        let insertUserData;
        if (req.body.password) {
          pass = req.body.password
          let hash = await bcrypt.hash(pass, saltRounds);

          insertUserData = {
            name: payloadData.name,
            userName: payloadData.userName,
            email: payloadData.email,
            mobileNo: payloadData.mobileNo,
            password: hash,
            updatedAt: currentTime
          }
        } else {

          insertUserData = {
            name: payloadData.name,
            userName: payloadData.userName,
            email: payloadData.email,
            mobileNo: payloadData.mobileNo,
            updatedAt: currentTime
          }
        }

        let insertUser = await knex
          .update(insertUserData)
          .where({ id: userId })
          .returning(["*"])
          .transacting(trx)
          .into("users");
        user = insertUser[0];


        let resources = req.body.resources;
        let delData = await knex('organisation_resources_master').where({ orgId: payload.id }).del();
        if (resources.length > 0) {

          

          for (let resourceId of resources) {
            let insertData = {
              orgId: payload.id,
              resourceId: resourceId,
              createdAt: currentTime,
              updatedAt: currentTime
            }
            let resourceResult = await knex.insert(insertData).returning(['*'])
              .transacting(trx).into('organisation_resources_master');
            resource = resourceResult[0]
          }
        }
        trx.commit;

      });

      return res.status(200).json({
        data: {
          organisation: { ...organisation, ...user, ...resource }
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
      let organisation = null;
      let user = null;
      let message;
      let organisationResult;
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


        let checkStatus = await knex.from('organisations').where({ id: payload.id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {
            organisationResult = await knex
              .update({ isActive: false })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("organisations");
            organisation = organisationResult[0];

            if (organisation) {
              let userResult = await knex
                .update({ isActive: false })
                .where({ id: organisation.organisationAdminId })
                .returning(["*"])
                .transacting(trx)
                .into("users");
              user = userResult[0]
            }
            message = "Organisation Inactive Successfully!"
            await emailHelper.sendTemplateEmail({
              to: user.email,
              subject: `[Deactivation] ${organisation.organisationName} Deactivated`,
              template: 'message.ejs',
              templateData: { fullName: user.name, message: `Your organization ${organisation.organisationName} has been deactivated.` }
            })
          } else {
            organisationResult = await knex
              .update({ isActive: true })
              .where({ id: payload.id })
              .returning(["*"])
              .transacting(trx)
              .into("organisations");
            organisation = organisationResult[0];

            if (organisation) {
              let userResult = await knex
                .update({ isActive: true })
                .where({ id: organisation.organisationAdminId })
                .returning(["*"])
                .transacting(trx)
                .into("users");
              user = userResult[0]
            }
            message = "Organisation Active Successfully!"
            await emailHelper.sendTemplateEmail({
              to: user.email,
              subject: `[Activation] ${organisation.organisationName} Activated Successfully.`,
              template: 'message.ejs',
              templateData: { fullName: user.name, message: `Your organization ${organisation.organisationName} has been activated.` }
            })
          }
        }

        // Send email to org admin about org deactivation
        
        

        trx.commit;
      });
      return res.status(200).json({
        data: {
          organisation: { ...organisation, ...user }
        },
        message: message
      });
    } catch (err) {
      console.log("[controllers][organisation][deleteOrganisation] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getOrganisationList: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows;
      let { organisationName, userName, email, status } = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;


      if (organisationName || userName || email || status) {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("organisations")
            .leftJoin('users', 'organisations.id', 'users.orgId')
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .where({ 'application_user_roles.roleId': 2 })
            .where(qb => {
              if (organisationName) {
                qb.where('organisations.organisationName', 'iLIKE', `%${organisationName}%`)
              }
              if (userName) {
                qb.where('users.name', 'iLIKE', `%${userName}%`)
              }
              if (email) {
                qb.where('users.email', 'iLIKE', `%${email}%`)
              }
              if (status) {
                qb.where('organisations.isActive', false)
              }

            })
            .first(),
          knex("organisations")
            .leftJoin('users', 'organisations.id', 'users.orgId')
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .where({ 'application_user_roles.roleId': 2 })
            .select([
              'organisations.*',
              'users.name',
              'users.email',
              'users.mobileNo'
            ])
            .where(qb => {
              if (organisationName) {
                qb.where('organisations.organisationName', 'iLIKE', `%${organisationName}%`)
              }
              if (userName) {
                qb.where('users.name', 'iLIKE', `%${userName}%`)
              }
              if (email) {
                qb.where('users.email', 'iLIKE', `%${email}%`)
              }

              if (status) {
                if (status == 1) {
                  qb.where('organisations.isActive', true)
                } else {
                  qb.where('organisations.isActive', false)
                }
              }

            })
            .orderBy('organisations.createdAt', 'desc')
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("organisations")
            .leftJoin('users', 'organisations.id', 'users.orgId')
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .where({ 'application_user_roles.roleId': 2 })
            //.where({'organisations.isActive':true})
            .first(),
          knex("organisations")
            .leftJoin('users', 'organisations.id', 'users.orgId')
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .where({ 'application_user_roles.roleId': 2 })
            .select([
              'organisations.*',
              'users.name',
              'users.email',
              'users.mobileNo'
            ])
            //.where({'organisations.isActive':true})
            .orderBy('organisations.createdAt', 'desc')
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
  getOrganisationDetails: async (req, res) => {

    try {

      let id = req.query.id;
      let result = await knex("organisations")
        .leftJoin('users', 'organisations.id', 'users.orgId')
        .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
        .where({ 'application_user_roles.roleId': 2 })
        .select([
          'organisations.*',
          'users.name',
          'users.email',
          'users.mobileNo',
          'users.userName'
        ]).where({ 'organisations.id': id })

      let resourcesarr = [];
      let resourceResult = await knex("organisation_resources_master")
        .leftJoin('resources', 'organisation_resources_master.resourceId', 'resources.id')
        .where({ "organisation_resources_master.orgId": id });


      for (resource of resourceResult) {
        resourcesarr.push(resource.resourceId)

      }

      return res.status(200).json({
        data: {
          organisationDetails: { ...result[0], resources: resourcesarr, resourceDetail: resourceResult }
        },
        message: "Organisation Details!."
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*GET ALL ORGANISATION LIST FOR DROP DOWN */
  getOrganisationAllList: async (req, res) => {

    try {
      let role = req.me.roles[0];
      let name = req.me.name;
      let orgId = req.orgId;
      let result;
      if (role === "superAdmin" && name === "superAdmin") {
        result = await knex("organisations").select(['id', 'organisationName']).returning(['*'])
          .orderBy('organisationName','asc');
      } else {
        result = await knex("organisations").select(['id', 'organisationName']).returning(['*'])
          .where({ id: orgId })
          .orderBy('organisationName', 'asc');
          ;
      }
      return res.status(200).json({
        data: result,
        message: "Organisation All List!."
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }

  }
};

module.exports = organisationsController;

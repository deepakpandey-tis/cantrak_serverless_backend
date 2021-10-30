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
          domainName: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          password: Joi.string().required(),
          resources: Joi.array().required(),
          userResources: Joi.array().allow("").optional(),
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
          domainName: payloadData.domainName,
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
        // let resources = req.body.resources;
        let adminResources = req.body.resources;
        let userResource = req.body.userResources;

        let a = adminResources, b = userResource
        let resource = a.concat(b.filter((item) => a.indexOf(item) < 0));

        for (let resourceId of resource) {
          if (userResource.includes(resourceId)) {
            console.log("exist in user", resourceId);
            let insertPayload = {
              orgId: organisation.id,
              resourceId: resourceId,
              createdAt: currentTime,
              updatedAt: currentTime,
              userStatus: true
            }
            insertedResourcesResult = await knex.insert(insertPayload).returning(['*'])
            .transacting(trx).into('organisation_resources_master')
          } else {
            let insertPayload = {
              updatedAt: currentTime,
              createdAt: currentTime,
              resourceId: resourceId,
              orgId: organisation.id
            }
            insertedResourcesResult = await knex(
              "organisation_resources_master"
            ).insert(insertPayload).transacting(trx).returning(['*'])
          }
        }

        // let insertPayload = resources.map(resource => ({
        //   updatedAt: currentTime,
        //   createdAt: currentTime,
        //   resourceId: resource,
        //   orgId: organisation.id
        // }));
        // insertedResourcesResult = await knex(
        //   "organisation_resources_master"
        // ).insert(insertPayload).returning(['*'])


       

        await emailHelper.sendTemplateEmail({ to: payloadData.email, subject: 'Welcome to Service Mind', template: 'welcome-org-admin-email.ejs', templateData: { fullName: payloadData.name, username: payloadData.userName, password: pass, layout: 'welcome-org-admin.ejs',orgId:req.orgId } })

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
          domainName: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          resources: Joi.array().required(),
          password: Joi.string().allow("").optional(),
          userResources: Joi.array().allow("").optional(),
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
          domainName: payloadData.domainName,
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


        let adminResources = req.body.resources;
        let userResource = req.body.userResources;


        let a = adminResources, b = userResource
        let resources = a.concat(b.filter((item) => a.indexOf(item) < 0));
        // Merges both arrays and gets unique items
        console.log("unique ++ unique", resources);

        let updateData = await knex('organisation_resources_master').update({ userStatus: false, adminStatus: false }).where({ orgId: payload.id });
        if (resources.length > 0) {
          for (let resourceId of resources) {

            if (userResource.includes(resourceId)) {
              console.log("exist in user", resourceId);
              let insertData = {
                updatedAt: currentTime,
                userStatus: true,
                adminStatus: true
              }
              let resourceResult = await knex.update(insertData).where({ orgId: payload.id, resourceId: resourceId }).returning(['*'])
                .transacting(trx).into('organisation_resources_master');
              resource = resourceResult[0];
            } 
            else {
              let insertData = {
                updatedAt: currentTime,
                adminStatus: true
              }
              let resourceResult = await knex.update(insertData).where({ orgId: payload.id, resourceId: resourceId }).returning(['*'])
                .transacting(trx).into('organisation_resources_master');
              resource = resourceResult[0];
            }

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
              templateData: { fullName: user.name, message: `Your organization ${organisation.organisationName} has been deactivated.`,orgId:req.orgId }
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
              templateData: { fullName: user.name, message: `Your organization ${organisation.organisationName} has been activated.`,orgId:req.orgId }
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
        .innerJoin('resources', 'organisation_resources_master.resourceId', 'resources.id')
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

    /* GET ORGANISATION DETAILS FOR ADMIN */
    getOrganisationDetailsForAdmin: async (req, res) => {

      try {
  
        let id = req.query.id;
        let resourceSelected;
        let resourceResult = [];
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
        // let resourceResult = await knex("organisation_resources_master")
        //   .innerJoin('resources', 'organisation_resources_master.resourceId', 'resources.id')
        //   .where({ "organisation_resources_master.orgId": id });
  
        let resourceResultData = await knex("resources").select('resources.*').leftJoin('organisation_resources_master', 'organisation_resources_master.resourceId', 'resources.id').where({"resources.isActive": true, "organisation_resources_master.orgId": id}).orderBy("organisation_resources_master.id", 'asc');
        for(resourceResultValue  of resourceResultData){
          console.log("resourceResultValue+++++",resourceResultValue);
          resourceSelected = await knex("organisation_resources_master")
          .where({ "organisation_resources_master.orgId": id, "organisation_resources_master.resourceId": resourceResultValue.id}).first();
          console.log("resourceSelected",resourceSelected);


          let userComponentData = await knex("user_component_master").count("components_icon_master.* as count").leftJoin('components_icon_master', 'components_icon_master.componentId', 'user_component_master.id').where({"user_component_master.resourceId": resourceResultValue.id, "user_component_master.isActive": true, "components_icon_master.isActive": true, "components_icon_master.orgId": id }).first();

          console.log("userComponentData",userComponentData);

          if(resourceSelected){
            resourceResult.push({
              'adminStatus' : resourceSelected.adminStatus,
              'id' : resourceSelected.resourceId,
              'orgId' : resourceSelected.orgId,
              'resourceId' : resourceSelected.resourceId,
              'resourceName' : resourceResultValue.resourceName,
              'userStatus': resourceSelected.userStatus,
              'userComponentCount': userComponentData.count
            })
          }else{
            resourceResult.push({
              'adminStatus' : false,
              'id' : resourceResultValue.id,
              'orgId' : id,
              'resourceId' : resourceResultValue.id,
              'resourceName' : resourceResultValue.resourceName,
              'userStatus': false,
              'userComponentCount': userComponentData.count
            })
          }
          
        }
  
         
  
  
  
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

  /* GET ORGANISATION DETAILS FOR ADMIN */
  getOrganisationDetailsForTheme: async (req, res) => {

    try {

      let id = parseInt(req.query.id);
      let domain = req.query.domain;
      console.log(req.query);
      let resourceSelected;
      let resourceResult = [];
      let result = [];
      if(domain){
      result = await knex("organisations")
        .select([
          'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
        ])
        .where({ 'organisations.domainName': domain });
      }
      else{
        result = await knex("organisations")
          .select([
            'organisations.id', 'organisations.organisationName', 'organisations.domainName', 'organisations.themeConfig'
          ])
          .where({ 'organisations.id': id });
      }

      return res.status(200).json({
        data: {
          organisationDetails: { ...result[0]}
        },
        message: "Organisation Details!."
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  /* GET ORGANISATION DETAILS FOR USER */
  getOrganisationDetailsForUser: async (req, res) => {

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
        .where({ "organisation_resources_master.orgId": id, "organisation_resources_master.userStatus" : true });


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
          .orderBy('organisationName', 'asc');
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

  },

  /* GET ORGANISATION LOGO */

  updateOrganisationLogo: async (req, res) => {
    try {
      let updatePayload = null;
      let userId = req.me.id;
      let orgId = req.orgId;
      let images = [];

      await knex.transaction(async (trx) => {
        let logoPayload = req.body;
        logoPayload = _.omit(req.body, [
          "orgLogoUrl"          
        ]);       
        
        const currentTime = new Date().getTime();       

        let logoData = req.body.orgLogoUrl;

        if (logoData && logoData.length > 0) {
          for (let image of logoData) {
            let d;  
              // Update If Image is already exits                                    
              d = await knex("organisations")
              .update({
                organisationLogo: image.s3Url,
                updatedAt: currentTime
              })
              .where({id : orgId })
              .returning(["*"]);          
            images.push(d[0]);
          }
        }  
        trx.commit;
      });
      res.status(200).json({
        data: {
          organisationLogo: images,
        },
        message: "Organisation Logo updated successfully !",
      });
    } catch (err) {
      console.log("[controllers][organisation][organisationLogo] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  updateOrganisationTheme: async (req, res) => {
    try {
      let updatePayload = null;
      let userId = req.me.id;
      let orgId = req.body.orgId;
      let id = req.params.id;
      let payload = req.body;


      await knex.transaction(async (trx) => {
        // payload = _.omit(req.body, [
        //   "orgLogoUrl"          
        // ]);
        
        // const schema = Joi.object().keys({
        //   themeConfig: Joi.object().required()
        // });

        // const result = Joi.validate(payload, schema);
        // console.log(
        //   "[controllers][administrationFeatures][updateOrganisationTheme]: JOi Result",
        //   result
        // );

        // if (result && result.hasOwnProperty("error") && result.error) {
        //   return res.status(400).json({
        //     errors: [
        //       { code: "VALIDATION_ERROR", message: result.error.message }
        //     ]
        //   });
        // }
        
        const currentTime = new Date().getTime();       
                                   
        let d = await knex("organisations")
        .update({
          ...payload,
          updatedAt: currentTime
        })
        .where({id : id })
        .returning(["*"]); 

        trx.commit;
      });
      res.status(200).json({
        data: {
          ...payload
        },
        message: "Organisation Theme updated successfully !",
      });
    } catch (err) {
      console.log("[controllers][organisation][updateOrganisationTheme] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

   /*GET ALL ORGANISATION LIST FOR DROP DOWN */
   getOrganisationLogo: async (req, res) => {

    try {
      
      let orgId = req.orgId;
      let result;      
        result = await knex("organisations").select(['id', 'organisationName','organisationLogo']).returning(['*'])
          .where({ id: orgId })
          .orderBy('organisationName', 'asc');
        ;
     
      return res.status(200).json({
        data: result,
        message: "Organisation Logo!."
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }

  },

};

module.exports = organisationsController;

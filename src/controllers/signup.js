const Joi = require("@hapi/joi");
const _ = require("lodash");
const bcrypt = require("bcrypt");

const moment = require("moment");
const emailHelper = require('../helpers/email')
const saltRounds = 10;

const knex = require("../db/knex");
const XLSX = require("xlsx");
const uuid = require('uuid/v4')

const singupController = {
  getCompaniesList: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let companies;
      if (orgId) {
        companies = await knex("companies")
          .where({ orgId })
          .orderBy('companies.companyName', 'asc')
          .returning(["*"]);
      } else {
        companies = await knex("companies")
          .orderBy('companies.companyName', 'asc')
          .returning(["*"]);
      }

      return res.status(200).json({
        data: {
          companies
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
  getProjectsByCompany: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let companyId = req.query.companyId;
      let projects;
      if (orgId) {

        projects = await knex("projects")
          .where({
            "projects.companyId": Number(companyId),
            orgId: Number(orgId)
          })
          .returning(["*"]);
      } else {
        projects = await knex("projects")
          .where({
            "projects.companyId": Number(companyId)
          })
          .returning(["*"]);
      }
      return res.status(200).json({
        data: {
          projects
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
  getBuildingsByProject: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let projectId = req.query.projectId;
      let buildings;
      if (orgId) {
        buildings = await knex("buildings_and_phases")
          .where({
            "buildings_and_phases.projectId": Number(projectId),
            orgId: Number(orgId)
          })
          .returning(["*"]);
      } else {
        buildings = await knex("buildings_and_phases")
          .where({
            "buildings_and_phases.projectId": Number(projectId)
          })
          .returning(["*"]);
      }

      return res.status(200).json({
        data: {
          buildings
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
  getFloorByBuilding: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let buildingId = req.query.buildingPhaseId;
      let floors;
      if (orgId) {
        floors = await knex("floor_and_zones")
          .where({
            "floor_and_zones.buildingPhaseId": Number(buildingId),
            orgId: Number(orgId)
          })
          .returning(["*"]);
      } else {
        floors = await knex("floor_and_zones")
          .where({
            "floor_and_zones.buildingPhaseId": Number(buildingId)
          })
          .returning(["*"]);
      }

      return res.status(200).json({
        data: {
          floors
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
  getUnitByFloor: async (req, res) => {
    try {
      let orgId = req.query.orgId;
      let floorZoneId = req.query.floorZoneId;
      let units;
      if (orgId) {
        units = await knex("property_units")
          .where({ floorZoneId: Number(floorZoneId), orgId: Number(orgId) })
          .returning(["*"]);
      } else {
        units = await knex("property_units")
          .where({ floorZoneId: Number(floorZoneId) })
          .returning(["*"]);
      }
      return res.status(200).json({
        data: {
          units
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
  addSignUpUrl: async (req, res) => {
    try {
      const payload = _.omit(req.body, [
        "expireAfter",
        "uuid",
        "orgId",
        "signUpUrl",
        "houseNo"
      ]);

      console.log("===============", payload, "======================")
      const signUpDetails = { ...payload };
      let expiryDate = moment().add(Number(req.body.expireAfter), "days");
      let currentTime = new Date().getTime();

      // Check for already existance
      let data = await knex("sign_up_urls")
        .select("id")
        .where({ uuid: req.body.uuid });
      if (data && data.length) {
        console.log("Already exists");
        return res.status(500).json({
          errors: [
            { code: "ALREADY_EXISTS_ERROR", message: "UUID already exists" }
          ]
        });
      }

      const result = await knex("sign_up_urls")
        .insert({
          signUpDetails: {
            ...signUpDetails,
            houseNo: req.body.houseNo,
            orgId: req.body.orgId,
            expireAfter: req.body.expireAfter
          },
          uuid: req.body.uuid,
          expiryDate,
          orgId: req.body.orgId,
          createdAt: currentTime,
          updatedAt: currentTime,
          signUpUrl: req.body.signUpUrl
        })
        .returning(["*"]);
      const finalInsertedUrl = result[0];
      return res.status(200).json({
        data: {
          insertedUrl: finalInsertedUrl
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
  updateSignUpUrl: async (req, res) => {
    try {
      const payload = _.omit(req.body, [
        "expireAfter",
        "uuid",
        "orgId",
        "signUpUrl",
        "id"
      ]);
      const signUpDetails = { ...payload };
      let expiryDate = moment().add(Number(req.body.expireAfter), "days");
      let currentTime = new Date().getTime();

      const result = await knex("sign_up_urls")
        .update({
          signUpDetails: {
            ...signUpDetails,
            orgId: req.body.orgId,
            expireAfter: req.body.expireAfter
          },
          uuid: req.body.uuid,
          expiryDate,
          orgId: req.body.orgId,
          //createdAt: currentTime,
          updatedAt: currentTime,
          signUpUrl: req.body.signUpUrl
        })
        .where({ id: req.body.id })
        .returning(["*"]);
      const finalInsertedUrl = result[0];
      return res.status(200).json({
        data: {
          updatedUrl: finalInsertedUrl
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
  getSignUpUrls: async (req, res) => {
    try {
      let reqData = req.query;
      let total, rows;
      let filters = req.body;

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      // console.log('Offset: ',offset)
      // console.log('Page: ',page)
      [total, rows] = await Promise.all([
        knex("sign_up_urls")
          .select("*")
          .where(qb => {
            qb.where({ orgId: req.orgId })
            if (filters && filters.uuid) {
              qb.where("uuid", "iLIKE", `%${filters.uuid.trim()}%`);
            }
            if (filters && filters.companyName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'companyName' iLIKE ? `,
                [`%${filters.companyName.trim()}%`]
              );
            }
            if (filters && filters.projectName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'projectName' iLIKE ? `,
                [`%${filters.projectName.trim()}%`]
              );
            }
          }),
        knex("sign_up_urls")
          //.innerJoin('companies', '')
          .select("*")
          .where(qb => {
            qb.where({ orgId: req.orgId });
            if (filters && filters.uuid) {
              qb.where("uuid", "iLIKE", `%${filters.uuid.trim()}%`);
            }

            if (filters && filters.companyName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'companyName' iLIKE ? `,
                [`%${filters.companyName.trim()}%`]
              );
            }
            if (filters && filters.projectName) {
              qb.whereRaw(
                `"sign_up_urls"."signUpDetails"->>'projectName' iLIKE ? `,
                [`%${filters.projectName.trim()}%`]
              );
            }
          })
          .orderBy("createdAt", "desc")
          .limit(per_page)
          .offset(offset)
      ]);

      //console.log('Page: ',page)
      //console.log('Per Page: ',per_page)

      //console.log('TOTAL ______________________________',total)

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
          pagination
        },
        message: "Sign up urls list"
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
  getSignUpFormDataByUUID: async (req, res) => {
    try {
      const formResult = await knex("sign_up_urls")
        .select("*")
        .where({ uuid: req.body.uuid });
      let form = formResult[0];
      return res.status(200).json({
        data: {
          formData: form
        },
        message: "Form data"
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
  createUser: async (req, res) => {
    try {
      let roleInserted;
      let insertedUser;
      await knex.transaction(async trx => {
        let orgId = req.body.orgId;

        if (!orgId) {
          companyResult = await knex.from('companies').where({ id: req.body.companyId }).returning(['*'])
          orgId = companyResult[0].orgId;
        }

        console.log("======================", orgId)
        let payload = _.omit(req.body, [
          "company",
          "project",
          "building",
          "floor",
          "unitNumber",
          "companyId",
          "floorZoneId",
          "buildingId",
          "projectId",
          "unitId",
          "houseId",
          "houseNo"
        ]);

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

        let hash = await bcrypt.hash(payload.password, saltRounds);
        payload.password = hash;
        let uuidv4 = uuid()
        let currentTime = new Date().getTime()
        insertedUser = await knex("users")
          .insert({ ...payload, verifyToken: uuidv4, emailVerified: true, createdAt: currentTime, updatedAt: currentTime, orgId: orgId })
          .returning(["*"])
          .transacting(trx);
        console.log(payload);

        /*INSERT HOUSE ID OPEN */
        let houseResult = await knex("user_house_allocation")
          .insert({ houseId: req.body.unitId, userId: insertedUser[0].id, status: 1, orgId: orgId, createdAt: currentTime, updatedAt: currentTime })
          .returning(["*"])
          .transacting(trx);
        /*INSERT HOUSE ID CLOSE */

        // Insert this users role as customer
        roleInserted = await knex('application_user_roles').insert({ userId: insertedUser[0].id, roleId: 4, createdAt: currentTime, updatedAt: currentTime, orgId: orgId })
          .returning(['*']).transacting(trx)

        let user = insertedUser[0]
        console.log('User: ', insertedUser)
        if (insertedUser && insertedUser.length) {
          await emailHelper.sendTemplateEmail({
            to: user.email,
            subject: 'Verify Account',
            template: 'test-email.ejs',
            templateData: {
              fullName: user.name,
              OTP: 'https://dj47f2ckirq9d.cloudfront.net/signup/verify-account/' + user.verifyToken
            }
          })
          let orgAdmins = await knex('application_user_roles')
            .select('userId')
            .where({ 'application_user_roles.orgId': orgId, roleId: 2 })
          let Parallel = require('async-parallel')
          let admins = await Parallel.map(orgAdmins, async admin => {
            let adminres = await knex('users').where({ id: admin.userId }).select(['name', 'email']).first()
            return adminres;
          })
          for (let admin of admins) {
            await emailHelper.sendTemplateEmail({
              to: admin.email,
              subject: 'New user added to your organization',
              template: 'message.ejs',
              templateData: { fullName: admin.name, message: 'New user ' + insertedUser[0].name + ' added to your organization. username is ' + insertedUser[0].userName + '.' },
            })
          }

        }
        trx.commit;
      })
      return res.status(200).json({ insertedUser, roleInserted });
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
  verifyAccount: async (req, res) => {
    try {
      let user = await knex('users').select('*').where({ verifyToken: req.params.token })
      if (user && user.length) {
        await knex('users').update({ emailVerified: true }).where({ id: user[0].id })
        return res.status(200).json({ verified: true, message: 'Successfully Verified!' })
      } else {
        return res.status(200).json({ verified: false, message: "Failed! Token Invalid." });
      }
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
  /*FORGOT PASSWORD */
  forgotPassword: async (req, res) => {

    try {
      let url;
      let org;
      let payload = req.body;
      let emailExistResult = await knex.from('users').where({ email: payload.email }).returning(['*']);
      if (emailExistResult.length) {

        if(emailExistResult[0].orgId === '56' && process.env.SITE_URL == 'https://d3lw11mvhjp3jm.cloudfront.net'){
          url = 'https://cbreconnect.servicemind.asia';
          org = "CBRE Connect";
        }else if(emailExistResult[0].orgId === '89' && process.env.SITE_URL == 'https://d3lw11mvhjp3jm.cloudfront.net'){
          url = 'https://senses.servicemind.asia';
          org = "Senses";
        }else{
          url = process.env.SITE_URL;
          org = "ServiceMind";
        }
        

        let uid = uuid();
        await emailHelper.sendTemplateEmail({
          to: emailExistResult[0].email,
          subject: 'Reset Password',
          template: 'forgot-email.ejs',
          templateData: {
            fullName: emailExistResult[0].name,
            URL: url+'/reset-password/' + uid,
            Org: org
          }
        })
        let result = await knex.from('users').update({ verifyToken: uid }).where({ email: emailExistResult[0].email }).returning(['*']);
        res.status(200).json({ message: "Password reset link sent. Please check your email!" })

      } else {
        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: "This email address does not exist!" }]
        });
      }
    } catch (err) {
      console.log(
        "[controllers][signup][forgotPassword] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  /*RESET PASSWORD */
  resetPassword: async (req, res) => {

    try {

      let payload = req.body;
      let checkResult = await knex.from('users').where({ verifyToken: payload.uid }).returning(['*']);
      if (checkResult.length) {

        let hash = await bcrypt.hash(payload.newPassword, saltRounds);
        let resetResult = await knex.from('users').update({ password: hash, verifyToken: "" ,emailVerified:true}).where({ verifyToken: checkResult[0].verifyToken }).returning(['*']);
        res.status(200).json({ message: "Password reset successfully!" })

      } else {
        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: "Please use valid reset password url!" }]
        });
      }

    } catch (err) {
      console.log(
        "[controllers][signup][resetPassword] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = singupController;

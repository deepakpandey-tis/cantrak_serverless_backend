const Joi = require('@hapi/joi');
const _ = require('lodash');
const bcrypt = require("bcrypt");
const saltRounds = 10;
const knex = require('../db/knex');
const XLSX = require("xlsx");

const fs = require('fs');
const path = require('path');
const emailHelper = require('../helpers/email')
const uuid = require('uuid/v4')
const peopleController = {
  addPeople: async (req, res) => {
    try {

      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          password: Joi.string().allow(null).allow("").optional(),
          mobileNo: Joi.string().required()
        })
        let result = Joi.validate(payload, schema);
        console.log('[controllers][people][addPeople]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        const existEmail = await knex('users').where({ email: payload.email });
        const existUser = await knex('users').where({ userName: payload.userName });
        const existMobile = await knex('users').where({ mobileNo: payload.mobileNo });

        if (existEmail && existEmail.length) {
          return res.status(400).json({
            errors: [
              { code: 'EMAIL_EXIST_ERROR', message: 'Email already exist !' }
            ],
          });
        }

        if (existUser && existUser.length) {
          return res.status(400).json({
            errors: [
              { code: 'USER_EXIST_ERROR', message: 'Username already exist !' }
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

        let random = Math.floor((Math.random() * 1000000) + 1);
        let pass = "" + random + "";
        if (payload.password) {
          pass = payload.password
        }

        console.log("passssssssssssssss", pass, "ppppppppppppppppppppppppppp")

        const hash = await bcrypt.hash(
          pass,
          saltRounds
        );
        payload.password = hash;

        let uid = uuid();
        payload.verifyToken = uid;
        let currentTime = new Date().getTime();
        const people = await knex('users').insert({ ...payload, orgId: req.orgId, createdAt: currentTime, updatedAt: currentTime,createdBy:req.me.id}).returning(['*'])

        //Insert Application Role
        let applicationUserRole = await knex(
          "application_user_roles"
        ).insert({
          roleId: 3,
          userId: people[0].id,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        });


        // Insert Organisation Role
        //let organisationUserRole = await knex('organisation_user_roles').insert({roleId:payload.roleId, userId:people[0].id,createdAt:currentTime,updatedAt:currentTime,orgId:req.orgId})

        // let peopleResult = await knex('users').where({email:peoplePayload.email}).returning(['*']);
        // people = peopleResult[0]

        // if(!people){
        //     return res.status(400).json(
        //       {
        //       message :"User does not exist!"
        //     }
        //     )
        // }



        // Insert into user_roles table

        // let insertRoleData = { roleId: peoplePayload.roleId, userId: people.id,orgId:orgId,createdAt: currentTime, updatedAt: currentTime }

        // let roleResult = await knex.insert(insertRoleData).returning(['*']).transacting(trx).into('organisation_user_roles');
        // role = roleResult[0];

        await emailHelper.sendTemplateEmail({ to: payload.email, subject: 'Welcome to Service Mind', template: 'welcome-org-admin-email.ejs', templateData: { fullName: payload.name, username: payload.userName, password: pass, uuid: uid } })

        trx.commit;
        res.status(200).json({
          data: { people, applicationUserRole },
          message: "People added successfully !"
        });
      })
    } catch (err) {
      console.log('[controllers][people][addPeople] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updatePeopleDetails: async (req, res) => {
    try {

      let people = null;
      let roleResult = null;
      let role = null;
      await knex.transaction(async (trx) => {
        let peoplePayload = _.omit(req.body, 'company', 'building', 'floor', 'houseId', 'project', 'unitNumber', 'houseId', 'id');
        let id = req.body.id
        let payload = req.body;
        console.log('[controllers][people][payload]', peoplePayload);
        peoplePayload = _.omit(peoplePayload, ['id'])
        // validate keys
        const schema = Joi.object().keys({
          //  name: Joi.string().required(),
          //lastName: Joi.string().required(),
          //mobileNo: Joi.string().required(),
          //userName: Joi.string().required(),
          roleId: Joi.string().required(),
          email: Joi.string().required()
        });

        let result = Joi.validate(peoplePayload, schema);
        console.log('[controllers][people][updatePeopleDetails]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        // Update in users table,
        let currentTime = new Date().getTime();
        let finalPayload = _.omit(peoplePayload, ['id', 'firstName', 'lastName'])
        let insertData = { ...finalPayload, name: peoplePayload.firstName + ' ' + peoplePayload.lastName, updatedAt: currentTime, isActive: true };

        console.log('[controllers][people][updatePeopleDetails]: Update Data', insertData);

        let peopleResult = await knex.update({ name: payload.name, email: payload.email }).where({ id: id }).returning(['*']).transacting(trx).into('users');

        people = peopleResult[0]

        //console.log(roleId)

        let roleResult = await knex.update({ roleId: payload.roleId }).where({ 'userId': payload.id }).returning('*').transacting(trx).into('user_roles');
        role = roleResult[0]
        trx.commit;
      });

      res.status(200).json({
        data: {
          people: { ...people, role }
        },
        message: "People details updated successfully !"
      });

    } catch (err) {
      console.log('[controllers][people][UpdatePeople] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getPeopleList: async (req, res) => {
    try {


      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "users.name";
        sortPayload.orderBy = "asc"
      }

      let { name, email, accountType } = req.body;
      let peopleData = null;
      let pagination = {}
      let reqData = req.query;
      let total, rows
      let page = reqData.current_page || 1;
      let per_page = reqData.per_page || 10;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (name || email || accountType) {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("users")
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
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .whereNotIn('application_user_roles.roleId', [2, 4])
            .where(qb => {
              qb.where({ "users.orgId": req.orgId });
              if (name) {
                qb.where("users.name", "iLIKE", `%${name}%`);
              }
              if (email) {
                qb.where("users.email", "iLIKE", `%${email}%`);
              }
              //   if (accountType) {
              //     qb.where("organisation_user_roles.roleId", accountType);
              //   }
            })
            // .whereNotIn("organisation_roles.name", [
            //   "superAdmin",
            //   "admin"
            // ])
            .first(),
          knex
            .from("users")
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

            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .whereNotIn('application_user_roles.roleId', [2, 4])
            .where(qb => {
              qb.where({ "users.orgId": req.orgId });
              if (name) {
                qb.where("users.name", "iLIKE", `%${name}%`);
              }
              if (email) {
                qb.where("users.email", "iLIKE", `%${email}%`);
              }
              //   if (accountType) {
              //     qb.where("organisation_user_roles.roleId", accountType);
              //   }
            })
            // .whereNotIn("organisation_roles.name", [
            //   "superAdmin",
            //   "admin"
            // ])
            .select([
              "users.id as userId",
              "users.name as name",
              "users.email as email",
              "users.userName",
              "users.mobileNo",
              "property_units.id",
              "users.lastLogin as lastVisit",
              "users.isActive"
              //"companies.id as companyId",
              //"companies.companyName",
              //   "organisation_roles.name as roleName"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("users")
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
            // .leftJoin(
            //   "companies",
            //   "property_units.companyId",
            //   "companies.id"
            // )
            // .leftJoin(
            //   "organisation_user_roles",
            //   "users.id",
            //   "organisation_user_roles.userId"
            // )
            // .leftJoin(
            //   "organisation_roles",
            //   "organisation_user_roles.roleId",
            //   "organisation_roles.id"
            // )
            // .whereNotIn("organisation_roles.name", [
            //   "superAdmin",
            //   "admin"
            // ])
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .whereNotIn('application_user_roles.roleId', [2, 4])
            .where({ "users.orgId": req.orgId })
            .first(),
          knex
            .from("users")
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
            // .leftJoin(
            //   "organisation_user_roles",
            //   "users.id",
            //   "organisation_user_roles.userId"
            // )
            // .leftJoin(
            //   "organisation_roles",
            //   "organisation_user_roles.roleId",
            //   "organisation_roles.id"
            // )
            // .whereNotIn("organisation_roles.name", [
            //   "superAdmin",
            //   "admin"
            // ])
            .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
            .whereNotIn('application_user_roles.roleId', [2, 4])
            .select([
              "users.id as userId",
              "users.name as name",
              "users.email as email",
              "users.userName",
              "users.mobileNo",
              // "user_house_allocation.houseId",
              "users.lastLogin as lastVisit",
              "users.isActive"
              //"companies.id as companyId",
              //"companies.companyName",
              //   "organisation_roles.name as roleName"
            ])
            .orderBy(sortPayload.sortBy, sortPayload.orderBy)
            .offset(offset)
            .limit(per_page)
            .where({ "users.orgId": req.orgId })
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



      res.status(200).json({
        data: {
          peopleData: pagination
        },
        message: "People List"
      });


    } catch (err) {
      console.log('[controllers][people][getPeopleList] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getPeopleDetails: async (req, res) => {
    try {

      let peopleData = null;
      let id = req.body.id;
      let userResult;
      let projectResult;
      peopleData = await knex("users")
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
        .leftJoin("companies", "property_units.companyId", "companies.id")
        .leftJoin("organisations", "users.orgId", "organisations.id")
        .leftJoin("team_users", "users.id", "team_users.userId")
        .leftJoin("teams", "team_users.teamId", "teams.teamId")
        .leftJoin("team_roles_project_master", "team_users.teamId", "team_roles_project_master.teamId")
        .leftJoin('projects', 'team_roles_project_master.projectId', 'projects.id')
        .leftJoin('organisation_roles', 'team_roles_project_master.roleId', 'organisation_roles.id')
        .select([
          "users.id as userId",
          "users.name ",
          "users.userName as userName",
          "users.mobileNo",
          "users.email",
          "organisations.organisationName",
          'team_roles_project_master.projectId',
          'team_roles_project_master.roleId',
          'projects.projectName',
          'organisation_roles.name as roleName',
          "teams.teamId",
          "teams.teamName",
          "teams.teamCode",
          'users.isActive'
        ])
        .where({ "users.id": id })
        .orderBy("users.createdAt", "desc");
      //.whereNotIn('roles.name',['superAdmin','admin'])

      let peopleDataResult = peopleData[0];
      let omitedPeopleDataResult = _.omit(peopleDataResult, ['createdAt'], ['updatedAt'], ['password', 'verifyToken'])

      console.log('[controllers][people][getPeopleDetails]: People Details', peopleDataResult);

      res.status(200).json({
        data: { people: omitedPeopleDataResult, projectData: peopleData },
        message: "People Details"
      });


    } catch (err) {
      console.log('[controllers][people][peopleDetails] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  removePeople: async (req, res) => {
    try {
      let people = null;
      let message;
      await knex.transaction(async trx => {
        let peoplePayload = req.body;
        let id = req.body.id
        const schema = Joi.object().keys({
          id: Joi.string().required()
        })
        const result = Joi.validate(peoplePayload, schema);
        console.log('[controllers][people][removePeople]: JOi Result', result);

        if (result && result.hasOwnProperty('error') && result.error) {
          return res.status(400).json({
            errors: [
              { code: 'VALIDATION_ERROR', message: result.error.message }
            ],
          });
        }

        let currentTime = new Date().getTime();
        let peopleData;
        let checkStatus = await knex.from('users').where({ id: id }).returning(['*'])
        if (checkStatus && checkStatus.length) {

          if (checkStatus[0].isActive == true) {
            peopleData = await knex.update({ isActive: false, updatedAt: currentTime }).where({ id: id }).returning(['*']).transacting(trx).into('users');
            message = "Status Inactive Successfully";
          } else {
            peopleData = await knex.update({ isActive: true, updatedAt: currentTime }).where({ id: id }).returning(['*']).transacting(trx).into('users');
            message = "Status Active Successfully";
          }
        }
        people = peopleData[0];
        trx.commit
      })
      res.status(200).json({
        data: {
          people: people
        },
        message: message
      });
    } catch (err) {

    }
  },
  /**EXPORT PEOPLE DATA */
  exportPeopleData: async (req, res) => {
    try {
      let peopleData = null;
      let reqData = req.query;
      let rows
      [rows] = await Promise.all([


        knex
          .from("users")
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
          .leftJoin('application_user_roles', 'users.id', 'application_user_roles.userId')
          .leftJoin('team_users', 'users.id', 'team_users.userId')
          .leftJoin(
            "teams",
            "team_users.teamId",
            "teams.teamId"
          )
          .whereNotIn('application_user_roles.roleId', [2, 4])
          .select([
            "users.name as NAME",
            "users.email as EMAIL",
            "teams.teamCode as TEAM_CODE",
            //"users.nameThai as ALTERNATE_LANGUAGE_NAME",
            "users.mobileNo as MOBILE_NO",
            "users.phoneNo as PHONE_NO"
          ])
          .orderBy('users.name', 'asc')
          .where({ "users.orgId": req.orgId })
      ]);

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = 'sls-app-resources-bucket';
        tempraryDirectory = 'tmp/';
      } else {
        tempraryDirectory = '/tmp/';
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws;
      if (rows && rows.length) {
        ws = XLSX.utils.json_to_sheet(rows);
      } else {
        ws = XLSX.utils.json_to_sheet([
          {
            NAME: "",
            EMAIL: "",
            TEAM_CODE: "",
            MOBILE_NO: "",
            PHONE_NO: ""
          }
        ]);
      }
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "PeopleData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/People/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            res.status(500).json({
              errors: [
                { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
              ],
            });
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            //let deleteFile = fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/People/" + filename;
            res.status(200).json({
              data: rows,
              message: "People data export successfully!",
              url: url
            });
          }
        });
      })
    } catch (err) {
      console.log('[controllers][people][getPeopleList] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  /**IMPORT HUMANS/PEOPLE DATA */
  importPeopleData: async (req, res) => {

    try {
      let orgId = req.orgId;
      let resultData = null;
      let data = req.body;
      let totalData = data.length - 1;
      let fail = 0;
      let success = 0;
      console.log("=======", data[0], "+++++++++++++++")
      let result = null;
      let errors = []
      let header = Object.values(data[0]);
      header.unshift('Error');
      errors.push(header)

      if (data[0].A == "Ã¯Â»Â¿NAME" || data[0].A == "NAME" &&
        data[0].B == "EMAIL" &&
        data[0].C == "TEAM_CODE" &&
        data[0].D == "MOBILE_NO" &&
        data[0].E == "PHONE_NO"
      ) {

        if (data.length > 0) {

          let i = 0;
          for (let peopleData of data) {
            i++;

            if (i > 1) {



              if (!peopleData.A) {
                let values = _.values(peopleData)
                values.unshift('Name can not empty')
                errors.push(values);
                fail++;
                continue;
              }

              if (!peopleData.B) {
                let values = _.values(peopleData)
                values.unshift('Email Id can not empty')
                errors.push(values);
                fail++;
                continue;
              }


              let teamId = null;
              if (peopleData.C) {
                let teamData = await knex('teams').select('teamId').where({ teamCode: peopleData.C, orgId: req.orgId });

                // if (!teamData.length) {
                //   fail++;
                //   continue;
                // }
                if (teamData && teamData.length) {
                  teamId = teamData[0].teamId
                }

              }

              if (peopleData.D) {

                let mobile = peopleData.D;
                mobile = mobile.toString();

                if (mobile.length != 10) {
                  let values = _.values(peopleData)
                  values.unshift('Enter valid mobile No.!')
                  errors.push(values);
                  fail++;
                  continue;
                }
                if (isNaN(mobile)) {
                  let values = _.values(peopleData)
                  values.unshift('Enter valid mobile No.')
                  errors.push(values);
                  fail++;
                  continue;

                }

                let checkMobile = await knex('users').select("id")
                  .where({ mobileNo: peopleData.D })

                if (checkMobile.length) {

                  let values = _.values(peopleData)
                  values.unshift('Mobile number already exists')
                  errors.push(values);
                  fail++;
                  continue;
                }
              }

              let checkExist = await knex('users').select("id")
                .where({ email: peopleData.B })
              let currentTime = new Date().getTime();
              if (checkExist.length < 1) {

                let pass = '123456';
                const hash = await bcrypt.hash(
                  pass,
                  saltRounds
                );

                let mobile = null;
                if (peopleData.D) {
                  mobile = peopleData.D
                }

                let insertData = {
                  orgId: req.orgId,
                  name: peopleData.A,
                  email: peopleData.B,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  emailVerified: false,
                  password: hash,
                  mobileNo: mobile,
                  phoneNo: peopleData.E,
                  createdBy:req.me.id
                }

                resultData = await knex.insert(insertData).returning(['*']).into('users');

                if (resultData[0].id) {
                  let insertRole = {
                    orgId: req.orgId,
                    userId: resultData[0].id,
                    roleId: 3,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  }
                  let roleResult = await knex.insert(insertRole).returning(['*']).into('application_user_roles');

                  if (teamId) {

                    let checkTeam = await knex.from('team_users').where({ userId: resultData[0].id, orgId: orgId })
                    if (!checkTeam.length) {

                      let insertTeam = {
                        orgId: req.orgId,
                        teamId: teamId,
                        userId: resultData[0].id,
                        createdAt: currentTime,
                        updatedAt: currentTime
                      }

                      let teamResult = await knex.insert(insertTeam).returning(['*']).into('team_users');
                    }
                  }

                }

                if (resultData && resultData.length) {
                  success++;
                }
              } else {


                if (teamId) {

                  let checkTeam = await knex.from('team_users').where({ userId: checkExist[0].id, orgId: orgId })
                  if (!checkTeam.length) {

                    let insertTeam = {
                      orgId: orgId,
                      teamId: teamId,
                      userId: checkExist[0].id,
                      createdAt: currentTime,
                      updatedAt: currentTime
                    }
                    let teamResult = await knex.insert(insertTeam).returning(['*']).into('team_users');

                    let values = _.values(peopleData)
                    values.unshift('Email Id already exists, People added in teams')
                    errors.push(values);
                    fail++;

                  } else {

                    let values = _.values(peopleData)
                    values.unshift('Email Id already exists')
                    errors.push(values);
                    fail++;

                  }

                } else {

                  let values = _.values(peopleData)
                  values.unshift('Email Id already exists')
                  errors.push(values);
                  fail++;
                }
              }
            }

          }
          // fail = fail-1;
          let message = null;
          if (totalData == success) {
            message = "System have processed ( " + totalData + " ) entries and added them successfully!";
          } else {
            message = "System have processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
          }

          return res.status(200).json({
            message: message,
            errors, errors
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
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },

  updatePeople: async (req, res) => {
    try {
      let insertedUser;
      await knex.transaction(async trx => {
        let orgId = req.orgId;

        console.log("======================", orgId)
        let payload = _.omit(req.body, "password");


        const schema = Joi.object().keys({

          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          mobileNo: Joi.string().allow("").allow(null).optional(),
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

        let currentTime = new Date().getTime()
        insertedUser = await knex("users")
          .update({ ...payload, updatedAt: currentTime, orgId: orgId })
          .returning(["*"])
          .transacting(trx)
          .where({ id: payload.id });
        console.log(payload);

        trx.commit;
      })
      return res.status(200).json({
        insertedUser,
        message: "People updated successfully!"

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
}

module.exports = peopleController
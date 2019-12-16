const Joi = require('@hapi/joi');
const _ = require('lodash');
const bcrypt = require("bcrypt");
const saltRounds = 10;
const knex = require('../db/knex');
const XLSX = require("xlsx");
//const trx = knex.transaction();
const fs = require('fs');
const path = require('path');
const peopleController = {
  addPeople: async (req, res) => {
    try {

      await knex.transaction(async (trx) => {
        let payload = req.body;
        const schema = Joi.object().keys({
          name: Joi.string().required(),
          userName: Joi.string().required(),
          email: Joi.string().required(),
          password: Joi.string().required(),
          //roleId: Joi.string().required()
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

        const hash = await bcrypt.hash(
          payload.password,
          saltRounds
        );
        payload.password = hash;

        let currentTime = new Date().getTime();
        const people = await knex('users').insert({ ...payload, orgId: req.orgId, createdAt: currentTime, updatedAt: currentTime }).returning(['*'])

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
              "property_units",
              "users.houseId",
              "property_units.houseId"
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
            .where(qb => {
              qb.where({ "users.orgId": req.orgId });
              if (name) {
                qb.where("users.name", "like", `%${name}%`);
              }
              if (email) {
                qb.where("users.email", "like", `%${email}%`);
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
              "property_units",
              "users.houseId",
              "property_units.houseId"
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
            .where(qb => {
              qb.where({ "users.orgId": req.orgId });
              if (name) {
                qb.where("users.name", "like", `%${name}%`);
              }
              if (email) {
                qb.where("users.email", "like", `%${email}%`);
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
              "users.houseId",
              "users.lastLogin as lastVisit",
              "companies.id as companyId",
              "companies.companyName",
              //   "organisation_roles.name as roleName"
            ])
            .offset(offset)
            .limit(per_page)
        ]);

      } else {

        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .from("users")
            .leftJoin(
              "property_units",
              "users.houseId",
              "property_units.houseId"
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
            .where({ "users.orgId": req.orgId })
            .first(),
          knex
            .from("users")
            .leftJoin(
              "property_units",
              "users.houseId",
              "property_units.houseId"
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
            .select([
              "users.id as userId",
              "users.name as name",
              "users.email as email",
              "users.userName",
              "users.mobileNo",
              "users.houseId",
              "users.lastLogin as lastVisit",
              "companies.id as companyId",
              "companies.companyName",
              //   "organisation_roles.name as roleName"
            ])
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

      peopleData = await knex("users")
        .leftJoin(
          "property_units",
          "users.houseId",
          "property_units.houseId"
        )
        .leftJoin("companies", "property_units.companyId", "companies.id")
        //   .innerJoin(
        //     "organisation_user_roles",
        //     "users.id",
        //     "organisation_user_roles.userId"
        //   )
        //   .innerJoin(
        //     "organisation_roles",
        //     "organisation_user_roles.roleId",
        //     "organisation_roles.id"
        //   )
        .select([
          "users.id as userId",
          "users.name ",
          "users.userName as userName",
          "users.mobileNo",
          "users.email",
          "users.houseId",
          // "organisation_roles.id as roleId",
          // "organisation_roles.name as accountType",
          "companies.id as company",
          "companies.companyName as companyName",
          "property_units.projectId as project",
          "property_units.unitNumber",
          "property_units.buildingPhaseId as building",
          "property_units.floorZoneId as floor"
        ])
        .where({ "users.id": id })
        .orderBy("users.createdAt", "desc");
      //.whereNotIn('roles.name',['superAdmin','admin'])

      let peopleDataResult = peopleData[0];
      let omitedPeopleDataResult = _.omit(peopleDataResult, ['createdAt'], ['updatedAt'], ['isActive', 'password', 'verifyToken'])

      console.log('[controllers][people][getPeopleDetails]: People Details', peopleDataResult);

      res.status(200).json({
        data: { people: omitedPeopleDataResult },
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
        let peopleData = await knex.update({ isActive: false, updatedAt: currentTime }).where({ id: id }).returning(['*']).transacting(trx).into('users');
        people = peopleData[0];

        trx.commit
      })
      res.status(200).json({
        data: {
          people: people
        },
        message: "People removed successfully !"
      });
    } catch (err) {

    }
  },
  /**EXPORT PEOPLE DATA */
  exportPeopleData: async (req, res) => {
    try {

      let { name, email, accountType } = req.body;
      let peopleData = null;
      let reqData = req.query;
      let rows
      if (name || email || accountType) {
        [rows] = await Promise.all([
          knex
            .from("team_users")
            .leftJoin(
              "users",
              "team_users.userId",
              "users.id",
            )
            .leftJoin(
              "teams",
              "team_users.teamId",
              "teams.teamId"
            )
            .select([
              //"users.orgId as ORGANIZATION_ID",
              "users.userCode as HUMAN_CODE",
              "users.nameThai as NAME_1",
              "users.name as NAME_2",
              "users.email as EMAIL",
              "users.isActive as STATUS",
              //"users.updatedAt as END_EFFECTIVE_DATE",
              //"users.createdAt as START_EFFECTIVE_DATE",
              "teams.teamCode as DEPARTMENT_CODE"
            ])
            .where(qb => {
              qb.where({ "users.orgId": req.orgId });
              if (name) {
                qb.where("users.name", "like", `%${name}%`);
              }
              if (email) {
                qb.where("users.email", "like", `%${email}%`);
              }
            })
        ]);

      } else {

        [rows] = await Promise.all([
          knex
            .from("team_users")
            .leftJoin(
              "users",
              "team_users.userId",
              "users.id",
            )
            .leftJoin(
              "teams",
              "team_users.teamId",
              "teams.teamId"
            )
            .select([
              //"users.orgId as ORGANIZATION_ID",
              "users.userCode as HUMAN_CODE",
              "users.nameThai as NAME_1",
              "users.name as NAME_2",
              "users.email as EMAIL",
              "users.isActive as STATUS",
              //"users.updatedAt as END_EFFECTIVE_DATE",
              //"users.createdAt as START_EFFECTIVE_DATE",
              "teams.teamCode as DEPARTMENT_CODE"
            ])
            .where({ "users.orgId": req.orgId })
        ]);
      }
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
      var ws = XLSX.utils.json_to_sheet(rows);
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
              message: "People List",
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

      console.log("====================",orgId,"==========================")
      if (req.file) {
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = 'tmp/';
        } else {
          tempraryDirectory = '/tmp/';
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: 'binary' });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });

        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        console.log("=======", data[0], "+++++++++++++++")
        let result = null;

        if (data[0].A == "Ã¯Â»Â¿HUMAN_CODE" || data[0].A == "HUMAN_CODE" &&
          data[0].B == "NAME_1" &&
          data[0].C == "NAME_2" &&
          data[0].D == "EMAIL" &&
          data[0].E == "STATUS" &&
          data[0].F == "DEPARTMENT_CODE"
        ) {

          if (data.length > 0) {

            let i = 0;
            for (let peopleData of data) {
              i++;

              let teamData = await knex('teams').select('teamId').where({ teamCode: peopleData.F });
              let teamId = null;
              if (!teamData && !teamData.length) {
                continue;
              }
              if (teamData && teamData.length) {
                teamId = teamData[0].teamId
              }


              if (i > 1) {

                let checkExist = await knex('users').select("id")
                  .where({name: peopleData.C, userCode: peopleData.A, orgId: req.orgId })
                if (checkExist.length < 1) {


                  //let endDate   = Math.round(new Date().getTime()/1000);
                  //let startDate = Math.round(new Date().getTime()/1000);

                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId    : req.orgId,
                    name     : peopleData.C,
                    nameThai : peopleData.B,
                    email    : peopleData.D,
                    userCode : peopleData.A,
                    isActive : true,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    emailVerified:true
                  }

                  resultData = await knex.insert(insertData).returning(['*']).into('users');

                  if (resultData[0].id) {
                    let insertRole = {
                      orgId  : req.orgId,
                      userId : resultData[0].id,
                      roleId : 3,
                      createdAt: currentTime,
                      updatedAt: currentTime
                    }
                    let roleResult = await knex.insert(insertRole).returning(['*']).into('application_user_roles');

                    let insertTeam = {
                      orgId: req.orgId,
                      teamId: teamId,
                      userId: resultData[0].id,
                      createdAt: currentTime,
                      updatedAt: currentTime
                    }

                    let teamResult = await knex.insert(insertTeam).returning(['*']).into('team_users');

                  }


                  if (resultData && resultData.length) {
                    success++;
                  }
                } else {
                  fail++;
                }
              }

            }

            let message = null;
            if (totalData == success) {
              message = "We have processed ( " + totalData + " ) entries and added them successfully!";
            } else {
              message = "We have processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added and others are failed ( " + fail + " ) due to validation!";
            }

            let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
            return res.status(200).json({
              message: message,
            });

          }

        } else {

          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            ]
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
  }
}

module.exports = peopleController
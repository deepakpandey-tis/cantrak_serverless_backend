const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const knex = require('../../db/knex');
const { RRule, RRuleSet, rrulestr } = require("rrule");
const XLSX = require("xlsx");
const fs = require('fs');
const path = require('path');

const emailHelper = require('../../helpers/email')

const taskGroupController = {

  // Create Task Group Template
  createTaskGroupTemplate: async (req, res) => {

    try {

      let createTask = null;
      let createTemplate = null;
      let createResult = [];
      let createPmTask = null;
      let createPmTemplate = null;
      let payload = req.body;
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required(),
        taskGroupName: Joi.string().required(),
        tasks: Joi.array().items(Joi.string().required()).strict().required(),
        isNew: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      await knex.transaction(async trx => {

        let payload = req.body;
        let currentTime = new Date().getTime();

        if (payload.isNew === "true") {

          // CREATE TASK TEMPLATE OPEN 
          let insertTemplateData = {
            assetCategoryId: payload.assetCategoryId,
            taskGroupName: payload.taskGroupName,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          }

          let insertTemplateResult = await knex.insert(insertTemplateData).returning(['*']).transacting(trx).into('task_group_templates');
          createTemplate = insertTemplateResult[0];
          // CREATE TASK TEMPLATE CLOSE

          // CREATE TASK OPEN 
          let tasksInsertPayload = payload.tasks.map(da => ({
            taskName: da,
            templateId: createTemplate.id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          }));

          let insertTaskResult = await knex.insert(tasksInsertPayload).returning(['*']).transacting(trx).into('template_task');
          createTask = insertTaskResult;
          // CREATE TASK CLOSE

          // CREATE PM TASK GROUP OPEN 

          let insertPmTemplateData = {
            assetCategoryId: payload.assetCategoryId,
            taskGroupName: payload.taskGroupName,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          };

          let insertPmTemplateResult = await knex.insert(insertPmTemplateData).returning(['*']).transacting(trx).into('pm_task_groups');
          createPmTemplate = insertPmTemplateResult[0];
          // CREATE PM TASK GROUP CLOSE 

          // CREATE PM TASK NAME OPEN
          let tasksPmInsertPayload = payload.tasks.map(da => ({
            taskName: da,
            taskGroupId: createPmTemplate.id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          }));

          let insertPmTaskResult = await knex.insert(tasksPmInsertPayload).returning(['*']).transacting(trx).into('pm_task');
          createPmTask = insertPmTaskResult;
          // CREATE PM TASK NAME CLOSE

        } else {

          // CREATE PM TASK GROUP OPEN 

          let insertPmTemplateData = {
            taskGroupName: payload.taskGroupName,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          };

          let insertPmTemplateResult = await knex.insert(insertPmTemplateData).returning(['*']).transacting(trx).into('pm_task_groups');
          createPmTemplate = insertPmTemplateResult[0];
          // CREATE PM TASK GROUP CLOSE 

          // CREATE PM TASK NAME OPEN
          let tasksPmInsertPayload = payload.tasks.map(da => ({
            taskName: da,
            taskGroupId: createPmTemplate.id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          }));
          // PM TASK GROUP TASK
          let insertPmTaskResult = await knex.insert(tasksPmInsertPayload).returning(['*']).transacting(trx).into('pm_task');
          createPmTask = insertPmTaskResult;
        }

        return res.status(200).json({
          data: {
            taskGroupTemplateData: createTemplate,
            taskData: createTask,
            pmTemplateData: createPmTemplate,
            PmTaskData: createPmTask
          },
          message: "Task Group Template Created Successfully!"
        });
      })

    } catch (err) {
      console.log("[controllers][task-group][createTaskGroupTemplate] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // GET TASK GROUP TEMPLATE LIST
  },
  createPMTemplate: async (req, res) => {
    try {
      let taskGroupTemplate = null;
      let insertedTasks = null
      let taskGroupTemplateSchedule = null;
      let assignedAdditionalUser = null;
      let payload = _.omit(req.body, ['teamId', 'repeatFrequency', 'repeatPeriod', 'repeatOn', 'tasks', 'mainUserId', 'additionalUsers', 'startDate', 'endDate'])
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required(),
        // repeatFrequency: Joi.string().required(),
        //repeatOn
        // repeatPeriod: Joi.string().required(),
        taskGroupName: Joi.string().required(),
        // startDate: Joi.string().required(),
        // endDate: Joi.string().required(),
        // teamId: Joi.string().required(),
        orgId: req.orgId

        //tasks: []
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }




      // Check duplicate value open
      const templateExist = await knex("task_group_templates")
        .where('taskGroupName', 'iLIKE', payload.taskGroupName)
        .where({ orgId: req.orgId });

      console.log(
        "[controllers][task-group][createTemplate]: ServiceCode",
        templateExist
      );

      if (templateExist && templateExist.length) {

        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Template already exist!!" }
          ]
        });
      }

      // Check duplicate value close




      let currentTime = new Date().getTime();
      // Insert into task_group_templates
      let tgtInsert = {
        taskGroupName: payload.taskGroupName,
        assetCategoryId: payload.assetCategoryId,
        createdBy: req.body.mainUserId ? req.body.mainUserId : null,
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId
      };
      let taskGroupTemplateResult = await knex('task_group_templates').insert(tgtInsert).returning(['*'])
      taskGroupTemplate = taskGroupTemplateResult[0]

      // Insert tasks into template_task
      let insertPaylaod = req.body.tasks.map(v => ({
        taskName: v.taskName,
        templateId: taskGroupTemplate.id,
        createdAt: currentTime,
        createdBy: req.body.mainUserId ? req.body.mainUserId : null,
        orgId: req.orgId,
        taskSerialNumber: v.taskSerialNumber,
        taskNameAlternate: v.taskNameAlternate,
        updatedAt: currentTime
      }))
      insertedTasks = await knex('template_task').insert(insertPaylaod).returning(['*'])

      // Insert into task_group_template_schedule
      let insertTTData = {
        startDate: req.body.startDate ? req.body.startDate : null,
        endDate: req.body.endDate ? req.body.endDate : null,
        repeatFrequency: req.body.repeatFrequency ? req.body.repeatFrequency : null,
        repeatOn: req.body.repeatOn.join(","),
        repeatPeriod: req.body.repeatPeriod ? req.body.repeatPeriod : null,
        taskGroupId: taskGroupTemplate.id,
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId
      };

      let taskGroupScheduleResult = await knex('task_group_template_schedule').insert(insertTTData).returning(['*'])
      taskGroupTemplateSchedule = taskGroupScheduleResult[0]

      // Insert into teams



      // ASSIGNED ADDITIONAL USER OPEN
      let assignedAdditionalUserResult
      if (typeof req.body.additionalUsers !== "string" && req.body.additionalUsers.length) {
        let insertAssignedAdditionalUserData = req.body.additionalUsers.map(user => ({
          userId: user,
          entityId: taskGroupTemplate.id,
          entityType: "task_group_templates",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }))

        assignedAdditionalUserResult = await knex('assigned_service_additional_users')
          .insert(insertAssignedAdditionalUserData).returning(['*'])
        assignedAdditionalUser = assignedAdditionalUserResult;
      }

      // ASSIGNED ADDITIONAL USER CLOSE

      // ASSIGNED TEAM OPEN
      let insertAssignedServiceTeamData = {
        teamId: req.body.teamId ? req.body.teamId : null,
        userId: req.body.mainUserId ? req.body.mainUserId : null,
        entityId: taskGroupTemplate.id,
        entityType: "task_group_templates",
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId
      };

      let assignedServiceTeamResult = await knex('assigned_service_team').insert(insertAssignedServiceTeamData).returning(['*'])
      assignedServiceTeam = assignedServiceTeamResult[0];

      // ASSIGNED TEAM CLOSE




      return res.status(200).json({
        data: {
          taskGroupTemplate,
          tasks: insertedTasks,
          taskGroupTemplateSchedule,
          assignedAdditionalUser,
          assignedServiceTeam
        },
        mesaage: 'Task Group Template added successfully!'
      })

    } catch (err) {
      console.log("[controllers][task-group][createTaskGroupTemplate] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getGroupTemplateList: async (req, res) => {

    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let templateResult = await knex('task_group_templates').returning('*').where({ "assetCategoryId": payload.assetCategoryId, orgId: req.orgId });

      return res.status(200).json({

        data: { groupTemplateData: templateResult },
        message: "Task Group Template List Successfully!"
      });

    } catch (err) {
      console.log("[controllers][task-group][getGroupTemplateList] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
    // GET GROUP TASK LIST
  },
  getGroupTaskList: async (req, res) => {

    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        templateId: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let taskResult = await knex('template_task').returning('*').where({ "templateId": payload.templateId, orgId: req.orgId });

      return res.status(200).json({
        data: {
          groupTaskData: taskResult
        },
        message: "Group Task List Successfully!"
      });

    } catch (err) {
      console.log("[controllers][task-group][getGroupTaskList] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // CREATE PM TASK GROUP SCHEDULE
  createPmTaskgroupSchedule: async (req, res) => {

    try {
      let createTemplateTask = null;
      let createTemplate = null;
      let createPM = null;
      let createPmTaskGroup = null;
      let assignedServiceTeam = null;
      let taskSchedule = null;
      let assignedAdditionalUser = null;
      let assetResults = [];
      let payload = req.body;
      const schema = Joi.object().keys({
        assetCategoryId: Joi.number().required(),
        companyId: Joi.number().required(),
        projectId: Joi.number().required(),
        pmId: Joi.string().required(),
        teamId: Joi.string().required(),
        mainUserId: Joi.string().required(),
        additionalUsers: Joi.array().items(Joi.string().required()).strict().required(),
        taskGroupName: Joi.string().required(),
        // tasks: Joi.array().items(Joi.string().required()).strict().required(),
        startDateTime: Joi.date().required(),
        endDateTime: Joi.date().required(),
        repeatPeriod: Joi.string().required(),
        repeatFrequency: Joi.number().required(),
        assets: Joi.array().items(Joi.string().required()).strict().required(),

      });

      const result = Joi.validate(_.omit(payload, ['repeatOn', 'tasks']), schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      await knex.transaction(async trx => {

        // Update PM Company and Project
        await knex('pm_master2').update({ companyId: payload.companyId, projectId: payload.projectId }).where({ id: payload.pmId, orgId: req.orgId })

        //   let payload       = req.body;
        let currentTime = new Date().getTime();


        // CREATE PM TASK GROUP OPEN
        let insertPmTaskGroupData = {
          pmId: payload.pmId,
          assetCategoryId: payload.assetCategoryId,
          taskGroupName: payload.taskGroupName,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }

        let insertPmTemplateResult = await knex.insert(insertPmTaskGroupData).returning(['*']).transacting(trx).into('pm_task_groups');
        createPmTaskGroup = insertPmTemplateResult[0];


        // ASSIGNED ADDITIONAL USER OPEN
        let insertAssignedAdditionalUserData = payload.additionalUsers.map(user => ({
          userId: user,
          entityId: createPmTaskGroup.id,
          entityType: "pm_task_groups",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId

        }))

        let assignedAdditionalUserResult = await knex.insert(insertAssignedAdditionalUserData).returning(['*']).transacting(trx).into('assigned_service_additional_users');
        assignedAdditionalUser = assignedAdditionalUserResult;
        // ASSIGNED ADDITIONAL USER CLOSE

        // ASSIGNED TEAM OPEN
        let insertAssignedServiceTeamData = {
          teamId: payload.teamId,
          userId: payload.mainUserId,
          entityId: createPmTaskGroup.id,
          entityType: "pm_task_groups",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }

        let assignedServiceTeamResult = await knex.insert(insertAssignedServiceTeamData).returning(['*']).transacting(trx).into('assigned_service_team');
        assignedServiceTeam = assignedServiceTeamResult[0];

        // ASSIGNED TEAM CLOSE

        // TASK GROUP SCHEDULE OPEN
        let insertScheduleData = {
          taskGroupId: createPmTaskGroup.id,
          pmId: payload.pmId,
          startDate: payload.startDateTime,
          endDate: payload.endDateTime,
          repeatPeriod: payload.repeatPeriod,
          repeatOn: payload.repeatOn,
          repeatFrequency: payload.repeatFrequency,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }

        let scheduleResult = await knex.insert(insertScheduleData).returning(['*']).transacting(trx).into('task_group_schedule');
        taskSchedule = scheduleResult[0];
        // TASK GROUP SCHEDULE CLOSE 


        // create recurring pm of this task group open

        let repeatPeriod = payload.repeatPeriod;
        let repeatOn = payload.repeatOn && payload.repeatOn.length ? payload.repeatOn.join(',') : [];
        let repeatFrequency = Number(payload.repeatFrequency);
        let start = new Date(payload.startDateTime);
        let startYear = start.getFullYear();
        let startMonth = start.getMonth();
        let startDate = start.getDate();
        let end = new Date(payload.endDateTime);
        let endYear = end.getFullYear();
        let endMonth = end.getMonth();
        let endDate = end.getDate();
        let performingDates;

        let config = {
          interval: repeatFrequency,
          dtstart: new Date(
            Date.UTC(
              startYear, startMonth, startDate - 1
            )
          ),
          until: new Date(
            Date.UTC(
              endYear, endMonth, endDate
            )
          ) // year, month, date
        };
        if (repeatPeriod === "YEAR") {
          config["freq"] = RRule.YEARLY;
        } else if (repeatPeriod === "MONTH") {
          config["freq"] = RRule.MONTHLY;
        } else if (repeatPeriod === "WEEK") {
          config["freq"] = RRule.WEEKLY;
          let array = [];

          if (repeatOn.includes("MO")) {
            array.push(RRule.MO);
          }
          if (repeatOn.includes("TU")) {
            array.push(RRule.TU);
          }
          if (repeatOn.includes("WE")) {
            array.push(RRule.WE);
          }
          if (repeatOn.includes("TH")) {
            array.push(RRule.TH);
          }
          if (repeatOn.includes("FR")) {
            array.push(RRule.FR);
          }
          if (repeatOn.includes("SA")) {
            array.push(RRule.SA);
          }
          if (repeatOn.includes("SU")) {
            array.push(RRule.SU);
          }
          config["byweekday"] = array;
        } else if (repeatPeriod === "DAY") {
          config["freq"] = RRule.DAILY;
        }

        const rule = new RRule(config);
        performingDates = rule.all();



        for (let i = 0; i < payload.assets.length; i++) {
          const assetId = payload.assets[i];

          for (let j = 0; j < performingDates.length; j++) {
            const date = performingDates[j];
            let assetResult = await knex
              .insert({
                pmDate: date,
                scheduleId: taskSchedule.id,
                assetId,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId
              })
              .returning(["*"])
              .transacting(trx)
              .into("task_group_schedule_assign_assets");

            // CREATE PM TASK OPEN
            let InsertPmTaskPayload = payload.tasks.map(da => ({
              taskName: da.taskName,
              taskNameAlternate: da.taskNameAlternate,
              taskSerialNumber: da.taskSerialNumber,
              taskGroupId: createPmTaskGroup.id,
              taskGroupScheduleAssignAssetId: assetResult[0].id,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId
            }))

            let insertPmTaskResult = await knex.insert(InsertPmTaskPayload).returning(['*']).transacting(trx).into('pm_task');
            createPmTask = insertPmTaskResult;

            // CREATE PM TASK CLOSE
            assetResults.push(assetResult[0]);
          }
        }
        // Send email to the team about pm plan
        // let mainUserId = payload.mainUserId;
        // let mainUser = await knex('users').where({id:mainUserId}).select(['name','email']).first()
        // let Parallel = require('async-parallel')
        // if (payload.additionalUsers.length){
        //   let additionalUserNameIds = await Parallel.map(payload.additionalUsers, async additionalUser => {
        //     let u = await knex('users').where({ id: additionalUser.userId}).select(['name','email'])
        //     return u;
        //   })
        //   let finalUsers = [...additionalUserNameIds,mainUser]
        //   for (let u of finalUsers){
        //     await emailHelper.sendTemplateEmail({
        //       to:u.email,
        //       subject:'[PM] Upcoming PM Plan & Schedule',
        //       template:'pm-plan.ejs',
        //       templateData: { pmSchedules: assetResults }
        //     })
        //   }
        // }

      })

      return res.status(200).json({
        data: {
          templateData: createTemplate,
          taskTemplateData: createTemplateTask,
          pmTaskGroupData: createPmTaskGroup,
          assignedAdditionalUserData: assignedAdditionalUser,
          assignedServiceTeamData: assignedServiceTeam,
          taskScheduleData: taskSchedule,
          assetResultData: assetResults,
          createdPmTasks: createPmTask
        },
        message: "Create Pm Task Group Schedule Successfully!"
      });

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // GET TASK GROUP SCHEDULE LIST
  getTaskGroupScheduleList: async (req, res) => {

    try {
      let scheduleList = null;
      let payload = req.body;

      const schema = Joi.object().keys({
        pmId: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }


      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;



      let [total, rows] = await Promise.all([
        //   knex.count("* as count").from('task_group_schedule')
        //   .innerJoin('pm_task_groups','task_group_schedule.taskGroupId','pm_task_groups.id')
        //  .where({'task_group_schedule.pmId':payload.pmId})
        //  .groupBy(['pm_task_groups.id','task_group_schedule.id'])
        knex
          .from("task_group_schedule")
          .innerJoin(
            "pm_task_groups",
            "task_group_schedule.taskGroupId",
            "pm_task_groups.id"
          )
          .select(["task_group_schedule.*", "pm_task_groups.taskGroupName"])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            "task_group_schedule.orgId": req.orgId
          }),
        knex
          .from("task_group_schedule")
          .innerJoin(
            "pm_task_groups",
            "task_group_schedule.taskGroupId",
            "pm_task_groups.id"
          )
          .select(["task_group_schedule.*", "pm_task_groups.taskGroupName"])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            "task_group_schedule.orgId": req.orgId
          })
          .offset(offset)
          .limit(per_page)
      ]);





      let count = total.length;
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
          taskGroupScheduleData: pagination,
        },
        "message": "Task Group Schedule List Successfully!"
      })

    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPmList: async (req, res) => {
    try {
      const list = await knex('pm_master2').select()
      let reqData = req.query;
      let total, rows
      let { assetCategoryId, pmPlanName, startDate, endDate } = req.body;
      let filters = {}
      if (assetCategoryId) {
        filters['asset_category_master.id'] = assetCategoryId;
      }

      startDate = startDate ? moment(startDate).format("YYYY-MM-DD HH:mm:ss") : ''
      endDate = endDate ? moment(endDate).format("YYYY-MM-DD HH:mm:ss") : ''

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let projects = _.flatten(req.userProjectResources.map(v => v.projects)).map(v => Number(v))
      console.log("Projects Resources: ", projects);
      //console.log('Projects: ',projects)
      //console.log('pppppppppppppppppp',req.userProjectResources)
      // let projects = _.flatten(req.userProjectResources.map(v => v.projects))
      [total, rows] = await Promise.all([
        knex.count('* as count').from("pm_master2")
          .innerJoin('asset_category_master', 'pm_master2.assetCategoryId', 'asset_category_master.id')
          .innerJoin('task_group_schedule', 'pm_master2.id', 'task_group_schedule.pmId')
          .where(qb => {
            qb.where(filters)
            qb.where({ 'pm_master2.orgId': req.orgId });
            qb.whereIn("pm_master2.projectId", projects);
            //qb.where({'pm_master2.projectId':})
            if (pmPlanName) {
              qb.where('pm_master2.name', 'like', `%${pmPlanName}%`)
            }
            if (startDate) {
              qb.where({ 'task_group_schedule.startDate': startDate })
            }
            if (endDate) {
              qb.where({ 'task_group_schedule.endDate': endDate })
            }
          }),
        knex.from('pm_master2')
          .innerJoin('asset_category_master', 'pm_master2.assetCategoryId', 'asset_category_master.id')
          .innerJoin('task_group_schedule', 'pm_master2.id', 'task_group_schedule.pmId')
          .select([

            'asset_category_master.*',
            'pm_master2.*',
            'pm_master2.id as id'
          ]).where(qb => {
            qb.where(filters)
            qb.whereIn("pm_master2.projectId", projects);

            qb.where({ "pm_master2.orgId": req.orgId });

            if (pmPlanName) {
              qb.where('pm_master2.name', 'like', `%${pmPlanName}%`)
            }
            if (startDate) {
              qb.where({ 'task_group_schedule.startDate': startDate })
            }
            if (endDate) {
              qb.where({ 'task_group_schedule.endDate': endDate })
            }
          }).offset(offset).limit(per_page)
      ])

      console.log(JSON.stringify(total, 2, null))
      let count = total[0].count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = _.uniqBy(rows, 'id');
      return res.status(200).json({
        data: {
          pm_list: pagination
        }
      })
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  createBrandNewPm: async (req, res) => {
    try {
      let payload = req.body;
      let currentTime = new Date().getTime();
      // CREATE PM  OPEN
      let insertPmData = { "name": payload.pmName, 'assetCategoryId': payload.assetCategoryId, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId };
      let insertPmResult = await knex('pm_master2').insert(insertPmData).returning(['*'])
      createPM = insertPmResult[0];
      return res.status(200).json({
        data: {
          pm: createPM,
          message: 'Pm created Successfully'
        }
      })
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  // GET TASK GROUP ASSET PMS LIST
  getTaskGroupAssetPmsList: async (req, res) => {

    try {
      let reqData = req.query;
      let payload = req.body

      const schema = Joi.object().keys({
        taskGroupId: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("task_group_schedule")
          .innerJoin(
            "task_group_schedule_assign_assets",
            "task_group_schedule.id",
            "task_group_schedule_assign_assets.scheduleId"
          )
          .innerJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )

          .where({
            "task_group_schedule.taskGroupId": payload.taskGroupId,
            "task_group_schedule.orgId": req.orgId
          }),
        //.offset(offset).limit(per_page),
        knex("task_group_schedule")
          .innerJoin(
            "task_group_schedule_assign_assets",
            "task_group_schedule.id",
            "task_group_schedule_assign_assets.scheduleId"
          )
          .innerJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )

          .select([
            "task_group_schedule_assign_assets.id as workOrderId",
            "task_group_schedule_assign_assets.status as status",
            "task_group_schedule.id as id",
            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_master.barcode as barcode",
            "asset_master.areaName as areaName",
            "asset_master.description as description",
            "asset_master.assetSerial as assetSerial",
            "asset_master.id as assetId",
            // "buildings_and_phases.buildingPhaseCode",
            // "floor_and_zones.floorZoneCode",
            // "property_units.unitNumber as unitNumber",
            "task_group_schedule_assign_assets.pmDate as pmDate",
            knex.raw(
              `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
            ),
            "task_group_schedule.repeatPeriod as repeatPeriod",
            "task_group_schedule.repeatOn as repeatOn",
            "task_group_schedule.repeatFrequency as repeatFrequency"
          ])
          .where({
            "task_group_schedule.taskGroupId": payload.taskGroupId,
            "task_group_schedule.orgId": req.orgId
          })
          .offset(offset)
          .limit(per_page)
          .orderBy("workOrderDate", "asc")
      ]);

      const Parallel = require('async-parallel')
      const rowsWithLocations = await Parallel.map(rows, async row => {
        const location = await knex('asset_location')
          .innerJoin('companies', 'asset_location.companyId', 'companies.id')
          .innerJoin('projects', 'asset_location.projectId', 'projects.id')
          .innerJoin(
            "buildings_and_phases",
            "asset_location.buildingId",
            "buildings_and_phases.id"
          )
          .innerJoin(
            "floor_and_zones",
            "asset_location.floorId",
            "floor_and_zones.id"
          )
          .innerJoin(
            "property_units",
            "asset_location.unitId",
            "property_units.id"
          )
          .select([
            'companies.companyName',
            'projects.projectName',
            'buildings_and_phases.buildingPhaseCode',
            'floor_and_zones.floorZoneCode',
            'property_units.unitNumber'
          ]).where(knex.raw('"asset_location"."updatedAt" = (select max("updatedAt") from asset_location)')).first()
        // ]).max('asset_location.updatedAt').first()
        return { ...row, ...location }
      })

      let count = total[0].count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rowsWithLocations.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rowsWithLocations;

      return res.status(200).json({
        data: {
          taskGroupAssetPmsData: pagination
        },
        message: 'Task Group PMs Asset List Successfully!'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-task-group-asset-pms-list] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getTaskGroupAssetPmsListOnToday: async (req, res) => {

    try {
      let reqData = req.query;
      let payload = req.body

      const schema = Joi.object().keys({
        // taskGroupId: Joi.string().required(),
        pmId: Joi.string().required(),
        // pmDate:Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex("task_group_schedule")
          .innerJoin(
            "task_group_schedule_assign_assets",
            "task_group_schedule.id",
            "task_group_schedule_assign_assets.scheduleId"
          )
          .innerJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )
          .select([
            "task_group_schedule_assign_assets.id as workOrderId",
            "task_group_schedule_assign_assets.status as status",
            "task_group_schedule.id as id",
            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_master.barcode as barcode",
            "asset_master.areaName as areaName",
            "asset_master.description as description",
            "asset_master.assetSerial as assetSerial",
            "task_group_schedule_assign_assets.pmDate as pmDate",
            "task_group_schedule.repeatPeriod as repeatPeriod",
            "task_group_schedule.repeatOn as repeatOn",
            "task_group_schedule.repeatFrequency as repeatFrequency"
          ])
          .where({
            "task_group_schedule.pmId": payload.pmId
            // 'task_group_schedule_assign_assets.pmDate':payload.pmDate })
          })
          .whereRaw(
            `DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`
          ),
        // knex.count('* as count').from("task_group_schedule")
        //   .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        //   .innerJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id'),
        // .where({ "task_group_schedule.taskGroupId": payload.taskGroupId }),
        //.offset(offset).limit(per_page),
        knex("task_group_schedule")
          .innerJoin(
            "task_group_schedule_assign_assets",
            "task_group_schedule.id",
            "task_group_schedule_assign_assets.scheduleId"
          )
          .innerJoin(
            "asset_master",
            "task_group_schedule_assign_assets.assetId",
            "asset_master.id"
          )
          .select([
            "task_group_schedule_assign_assets.id as workOrderId",
            "task_group_schedule.id as id",
            "asset_master.assetName as assetName",
            "asset_master.model as model",
            "asset_master.barcode as barcode",
            "asset_master.areaName as areaName",
            "asset_master.description as description",
            "asset_master.assetSerial as assetSerial",
            "task_group_schedule_assign_assets.pmDate as pmDate",
            "task_group_schedule.repeatPeriod as repeatPeriod",
            "task_group_schedule.repeatOn as repeatOn",
            "task_group_schedule.repeatFrequency as repeatFrequency"
          ])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            "task_group_schedule.orgId": req.orgId
          })
          .whereRaw(
            `DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`
          )
          .offset(offset)
          .limit(per_page)
      ]);

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
          taskGroupAssetPmsData: pagination
        },
        message: 'Task Group PMs Asset List Successfully!'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-task-group-asset-pms-list] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  // CREATE TASK TEMPLATE
  createTaskTemplate: async (req, res) => {

    try {

      let createTemplate = null;
      let createTemplateTask = null;
      let taskSchedule = null;
      let assignedServiceTeam = null;
      let assignedAdditionalUser = null;

      let payload = req.body;

      const schema = Joi.object().keys({
        pmId: Joi.string().required(),
        assetCategoryId: Joi.string().required(),
        taskTemplateName: Joi.string().required(),
        // tasks: Joi.array().items(Joi.object()).strict().required(),
        startDateTime: Joi.date().required(),
        endDateTime: Joi.date().required(),
        repeatPeriod: Joi.string().required(),
        repeatFrequency: Joi.string().required(),
        teamId: Joi.string().required(),
        mainUserId: Joi.string().required(),
        additionalUsers: Joi.array().items(Joi.string().required()).strict().required(),
      });

      const result = Joi.validate(_.omit(payload, ['repeatOn', 'tasks']), schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      await knex.transaction(async trx => {

        let currentTime = new Date().getTime();
        // CREATE TASK TEMPLATE OPEN 
        let insertTemplateData = {
          pmId: payload.pmId,
          assetCategoryId: payload.assetCategoryId,
          taskGroupName: payload.taskTemplateName,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }

        let insertTemplateResult = await knex.insert(insertTemplateData).returning(['*']).transacting(trx).into('task_group_templates');
        createTemplate = insertTemplateResult[0];
        // CREATE TASK TEMPLATE CLOSE

        // CREATE TASK TEMPLATE OPEN 
        let tasksInsertPayload = req.body.tasks.map(da => ({
          taskName: da.taskName,
          taskNameAlternate: da.taskNameAlternate,
          taskSerialNumber: da.taskSerialNumber,
          templateId: createTemplate.id,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }))

        let insertTemplateTaskResult = await knex.insert(tasksInsertPayload).returning(['*']).transacting(trx).into('template_task');
        createTemplateTask = insertTemplateTaskResult;
        // CREATE TASK TEMPLATE CLOSE


        // TASK GROUP SCHEDULE OPEN
        let insertScheduleData = {
          taskGroupId: createTemplate.id,
          pmId: payload.pmId,
          startDate: payload.startDateTime,
          endDate: payload.endDateTime,
          repeatPeriod: payload.repeatPeriod,
          repeatOn: payload.repeatOn ? payload.repeatOn.join(',') : '',
          repeatFrequency: payload.repeatFrequency,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }

        let scheduleResult = await knex.insert(insertScheduleData).returning(['*']).transacting(trx).into('task_group_template_schedule');
        taskSchedule = scheduleResult[0];
        // TASK GROUP SCHEDULE CLOSE 

        // ASSIGNED ADDITIONAL USER OPEN
        let insertAssignedAdditionalUserData = payload.additionalUsers.map(user => ({
          userId: user,
          entityId: createTemplate.id,
          entityType: "task_group_templates",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }))

        let assignedAdditionalUserResult = await knex.insert(insertAssignedAdditionalUserData).returning(['*']).transacting(trx).into('assigned_service_additional_users');
        assignedAdditionalUser = assignedAdditionalUserResult;
        // ASSIGNED ADDITIONAL USER CLOSE

        // ASSIGNED TEAM OPEN
        let insertAssignedServiceTeamData = {
          teamId: payload.teamId,
          userId: payload.mainUserId,
          entityId: createTemplate.id,
          entityType: "task_group_templates",
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId
        }

        let assignedServiceTeamResult = await knex.insert(insertAssignedServiceTeamData).returning(['*']).transacting(trx).into('assigned_service_team');
        assignedServiceTeam = assignedServiceTeamResult[0];

        // ASSIGNED TEAM CLOSE


      })

      return res.status(200).json({
        data: {
          templateData: createTemplate,
          taskTemplateData: createTemplateTask,
          taskScheduleData: taskSchedule,
          assignedAdditionalUserData: assignedAdditionalUser,
          assignedServiceTeamData: assignedServiceTeam
        },
        message: 'Task Template Created Successfully!'
      })

    } catch (err) {

      console.log('[controllers][task-group][create-task-template] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  // GET TASK TEMPLATE LIST
  getTaskTemplateList: async (req, res) => {


    try {

      let payload = req.body;
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required()
      })

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {

        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }


      let templateResult = await knex('task_group_templates').returning('*').where({ "assetCategoryId": payload.assetCategoryId, 'task_group_templates.orgId': req.orgId });

      res.status(200).json({
        data:
        {
          taskTemplateData: templateResult
        },
        message: "Task Template List Successfully!"
      })


    } catch (err) {
      console.log('[controllers][task-group][get-task-template-list] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }

  },
  // GET TASK TEMPLATE COMPLATE DATA LIST
  getTaskTemplateComplateList: async (req, res) => {

    try {
      let reqData = req.query;
      let payload = req.body

      const schema = Joi.object().keys({
        templateId: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex.count('* as count').from("task_group_templates")
          .innerJoin('template_task', 'task_group_templates.id', 'template_task.templateId')
          .innerJoin('task_group_template_schedule', 'task_group_templates.id', 'task_group_template_schedule.taskGroupId')
          .innerJoin('assigned_service_team', 'task_group_templates.id', 'assigned_service_team.entityId')
          .innerJoin('assigned_service_additional_users', 'task_group_templates.id', 'assigned_service_additional_users.entityId')
          .where({ "task_group_templates.id": payload.templateId, 'assigned_service_team.entityType': 'task_group_templates', 'assigned_service_additional_users.entityType': 'task_group_templates', 'task_group_templates.orgId': req.orgId }),
        //.offset(offset).limit(per_page),
        knex("task_group_templates")
          .innerJoin('template_task', 'task_group_templates.id', 'template_task.templateId')
          .innerJoin('task_group_template_schedule', 'task_group_templates.id', 'task_group_template_schedule.taskGroupId')
          .innerJoin('assigned_service_team', 'task_group_templates.id', 'assigned_service_team.entityId')
          .innerJoin('assigned_service_additional_users', 'task_group_templates.id', 'assigned_service_additional_users.entityId')
          .select([
            'assigned_service_additional_users.userId as additional_user',
            'task_group_templates.*',
            'template_task.*',
            'task_group_template_schedule.*',
            'assigned_service_team.*'
          ])
          .where({ "task_group_templates.id": payload.templateId, 'assigned_service_team.entityType': 'task_group_templates', 'assigned_service_additional_users.entityType': 'task_group_templates', "task_group_templates.orgId": req.orgId })
          .offset(offset).limit(per_page)
      ])

      let count = total[0].count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = _.uniqBy(rows, 'taskName');

      return res.status(200).json({
        data: {
          taskTemplateCompleteData: pagination
        },
        message: 'Task Template Complete Data List Successfully!'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-task-group-asset-pms-list] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  // GET TASK GROUP ASSET PM DETAILS
  getTaskgroupAssetPmDetails: async (req, res) => {

    try {
      let payload = req.body;

      const schema = Joi.object().keys({
        taskGroupScheduleId: Joi.string().required(),
        taskGroupScheduleAssignAssetId: Joi.string().required()
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      const pmResult = await knex("task_group_schedule")
        .leftJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        .leftJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
        .leftJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
        .leftJoin('companies', 'asset_location.companyId', 'companies.id')
        .leftJoin('projects', 'asset_location.projectId', 'projects.id')
        .leftJoin('buildings_and_phases', 'asset_location.buildingId', 'buildings_and_phases.id')
        .leftJoin('floor_and_zones', 'asset_location.floorId', 'floor_and_zones.id')
        .leftJoin('property_units', 'asset_location.unitId', 'property_units.id')
        .leftJoin('pm_master2', 'task_group_schedule.pmId', 'pm_master2.id')
        .leftJoin('asset_category_master', 'pm_master2.assetCategoryId', 'asset_category_master.id')
        .leftJoin('pm_task_groups', 'task_group_schedule.taskGroupId', 'pm_task_groups.id')
        .leftJoin('assigned_service_team', 'pm_task_groups.id', 'assigned_service_team.entityId')
        .leftJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
        .leftJoin('users', 'assigned_service_team.userId', 'users.id')
        .select([
          'task_group_schedule.id as id',
          'task_group_schedule_assign_assets.id as taskGroupScheduleAssignAssetId',
          'task_group_schedule.taskGroupId',
          'pm_master2.name as pmName',
          'asset_category_master.categoryName as assetCategoryName',
          'pm_task_groups.taskGroupName as taskGroupName',
          'asset_master.assetName as assetName',
          'asset_master.id as assetId',
          'asset_master.barcode as barCode',
          'asset_master.areaName as areaName',
          'asset_master.model as modelNo',
          'companies.companyName',
          'projects.projectName',
          'buildings_and_phases.buildingPhaseCode',
          'floor_and_zones.floorZoneCode',
          'property_units.unitNumber',
          'task_group_schedule.startDate as startDate',
          'task_group_schedule.endDate as endDate',
          'task_group_schedule.repeatFrequency as repeatFrequency',
          'task_group_schedule.repeatOn as repeatOn',
          'teams.teamName as teamName',
          'assigned_service_team.userId as mainUserId',
          'users.name as mainUser',
          'task_group_schedule_assign_assets.pmDate as pmDate'
        ])
        .where({
          'task_group_schedule.id': payload.taskGroupScheduleId,
          'task_group_schedule_assign_assets.id': payload.taskGroupScheduleAssignAssetId,
          //'task_group_schedule.taskGroupId':payload.taskGroupId,
          'assigned_service_team.entityType': 'pm_task_groups',
          'task_group_schedule.orgId': req.orgId,
        }).where(knex.raw('"asset_location"."updatedAt" = (select max("updatedAt") from asset_location)'))
      //Where()

      // let assetLocation = await knex('asset_location')
      // .innerJoin('companies','asset_location.companyId','companies.id')
      //  .innerJoin('projects','asset_location.projectId','projects.id')
      //  .innerJoin('buildings_and_phases', 'asset_location.buildingId','buildings_and_phases.id')
      //  .innerJoin('floor_and_zones','asset_location.floorId','floor_and_zones.id')
      //  .innerJoin('property_units','asset_location.unitId','property_units.id')
      // .where(knex.raw('"asset_location"."updatedAt" = (select max("updatedAt") from asset_location)'))
      // .select([
      //    'companies.companyName',
      //    'projects.projectName',
      //    'buildings_and_phases.buildingPhaseCode',
      //    'floor_and_zones.floorZoneCode',
      //    'property_units.unitNumber',
      // ]).first()

      // if(!assetLocation){
      //   assetLocation = {}
      // }
      // ADDITIONAL USER OPEN
      let additionalUsers = [];
      let tasks = [];
      if (pmResult && pmResult.length) {
        additionalUsers = await knex('assigned_service_additional_users')
          .innerJoin('users', 'assigned_service_additional_users.userId', 'users.id')
          .select([
            'users.id as additionalUserId',
            'users.name as additionalUser'
          ])
          .where({
            'assigned_service_additional_users.entityType': 'pm_task_groups',
            'assigned_service_additional_users.entityId': pmResult[0].taskGroupId,
            'assigned_service_additional_users.orgId': req.orgId
          })

        // ADDITIONAL USER CLOSE

      }

      // TASK OPEN
      tasks = await knex('pm_task')
        .select([
          'pm_task.id as taskId',
          'pm_task.taskName as taskName',
          'pm_task.status as status',
          'pm_task.taskNameAlternate',
          'pm_task.taskSerialNumber'
        ])
        .where({
          'pm_task.taskGroupScheduleAssignAssetId': payload.taskGroupScheduleAssignAssetId,
          'pm_task.orgId': req.orgId
        })
      let statuses = tasks.filter(t => t.status !== "CMTD")
      if (statuses.length === 0) {
        status = 'complete'
      } else {
        status = 'incomplete'
      }
      // TASK CLOSE
      return res.status(200).json({
        data: {
          taskGroupPmAssetDatails: _.uniqBy(pmResult, 'id'),
          additionalUsers: additionalUsers,
          tasks: tasks,
          status: status
        },
        message: 'Task Group Asset PM Details Successfully!'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-taskgroup-asset-pm-details] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  // GET PM TASK DETAILS
  getPmTaskDetails: async (req, res) => {
    try {

      let {
        taskId, assetId, scheduleId, pmDate
      } = req.body;
      let payload = req.body;

      const schema = Joi.object().keys({
        taskId: Joi.string().required(),
        assetId: Joi.string().required(),
        scheduleId: Joi.string().required(),
        pmDate: Joi.date().required()
      })
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let taskDetails = await knex('pm_task')
        .innerJoin('pm_task_groups', 'pm_task.taskGroupId', 'pm_task_groups.id')
        .innerJoin('pm_master2', 'pm_task_groups.pmId', 'pm_master2.id')
        .innerJoin('task_group_schedule', 'pm_task_groups.id', 'task_group_schedule.taskGroupId')
        .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        .select([
          'pm_task.id as taskId',
          'pm_task.status as status',
          'pm_task.taskName as taskName',
          'pm_master2.name as pmName',
          'pm_task_groups.taskGroupName as taskGroupName',
          'pm_task_groups.id as taskGroupId',
          'task_group_schedule_assign_assets.pmDate as pmDate'
        ])
        .where({
          'pm_task.id': taskId,
          'task_group_schedule.id': scheduleId,
          'task_group_schedule_assign_assets.scheduleId': scheduleId,
          'task_group_schedule_assign_assets.assetId': assetId,
          'task_group_schedule_assign_assets.pmDate': pmDate,
          'pm_task.orgId': req.orgId
        })

      // GERERAL DETAILS OPEN
      let generalDetails = await knex('asset_location')
        .innerJoin('asset_master', 'asset_location.assetId', 'asset_master.id')
        .innerJoin('companies', 'asset_location.companyId', 'companies.id')
        .innerJoin('property_units', 'asset_location.unitId', 'property_units.id')
        .innerJoin('buildings_and_phases', 'asset_location.buildingId', 'buildings_and_phases.id')
        .innerJoin('floor_and_zones', 'asset_location.floorId', 'floor_and_zones.id')
        .innerJoin('projects', 'asset_location.projectId', 'projects.id')
        .select([
          'asset_master.areaName as location',
          'companies.companyName as companyName',
          'property_units.unitNumber as unitNumber',
          'buildings_and_phases.buildingPhaseCode as buildingNumber',
          'floor_and_zones.floorZoneCode as floor',
          'projects.projectName as projectName'
        ])
        .where({
          'asset_location.assetId': assetId,
          'asset_location.orgId': req.orgId
        })
      // GERERAL DETAILS CLOSE


      //IMAGES
      const images = await knex('images').where({ entityId: taskId, entityType: 'pm_task' }).select(['s3Url', 'id'])
      // IMAGES CLOSED

      return res.status(200).json({
        data: {
          pmTaskDetails: _.uniqBy(taskDetails, 'pmDate'),
          generalDetails: generalDetails,
          images
        },
        message: 'PM Task Details Successfully!'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      //trx.rollback
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateTaskStatus: async (req, res) => {
    try {
      const payload = req.body;
      const schema = Joi.object().keys({
        taskGroupId: Joi.string().required(),
        taskId: Joi.string().required(),
        status: Joi.string().required(),
        userId: Joi.string().required()
      })
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      // Get all the tasks of the work order and check if those tasks have status cmtd
      // then 
      let currentTime = new Date().getTime()
      // We need to check whther all the tasks have been updated or not
      let taskUpdated
      if (payload.status === 'CMTD') {
        // check id completedAt i.e current date is greater than pmDate then update completedAt and completedBy
        taskUpdated = await knex('pm_task').update({ status: payload.status, completedAt: currentTime, completedBy: payload.userId }).where({ taskGroupId: payload.taskGroupId, id: payload.taskId, orgId: req.orgId }).returning(['*'])
      } else {

        taskUpdated = await knex('pm_task').update({ status: payload.status }).where({ taskGroupId: payload.taskGroupId, id: payload.taskId, orgId: req.orgId }).returning(['*'])
      }
      return res.status(200).json({
        data: {
          taskUpdated
        },
        message: 'Task updated'
      })
    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  sendFeedbackForTask: async (req, res) => {
    try {
      const payload = req.body;
      const schema = Joi.object().keys({
        taskId: Joi.string().required(),
        taskGroupScheduleId: Joi.string().required(),
        taskGroupId: Joi.string().required(),
        assetId: Joi.string().required(),
        description: Joi.string().required()
      })
      const result = Joi.validate(payload[0], schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let curentTime = new Date().getTime()
      let fbs = req.body.map(v => ({ ...v, createdAt: curentTime, updatedAt: curentTime, orgId: req.orgId }))
      const addedFeedback = await knex('task_feedbacks').insert(fbs).returning(['*'])
      return res.status(200).json({
        data: {
          addedFeedback
        },
        message: 'Feedback added successfully!'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getFeedbacksOfTask: async (req, res) => {
    try {
      const { taskId } = req.body;
      const feedbacks = await knex('task_feedbacks').select('*').where({ taskId, orgId: req.orgId })
      return res.status(200).json({
        data: {
          feedbacks
        }
      })
    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  editWorkOrder: async (req, res) => {
    try {
      const payload = req.body;
      let { workOrderId, teamId, additionalUsers, mainUserId, tasks } = payload
      // First based on that workOrderId update tasks
      let updatedTasks = []
      if (tasks && tasks.length) {
        for (let task of tasks) {
          updatedTask = await knex('pm_task').update({ taskName: task.taskName }).where({ taskGroupScheduleAssignAssetId: workOrderId, id: task.id, orgId: req.orgId }).returning(['*'])
          updatedTasks.push(updatedTask[0]);
        }
      }



      return res.status(200).json({
        data: {
          updatedTasks
        },
        message: 'Tasks updated!'
      })
    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getTaskGroupDetails: async (req, res) => {
    try {

      let taskGroupResult = await knex('task_group_templates')
        .innerJoin('task_group_template_schedule', 'task_group_templates.id', 'task_group_template_schedule.taskGroupId')
        .select([
          'task_group_templates.taskGroupName as taskGroupName',
          'task_group_templates.assetCategoryId as assetCategoryId',
          'task_group_template_schedule.startDate as startDate',
          'task_group_template_schedule.endDate as endDate',
          'task_group_template_schedule.repeatFrequency as repeatFrequency',
          'task_group_template_schedule.repeatPeriod as repeatPeriod',
          'task_group_template_schedule.repeatOn as repeatOn'
        ])
        .where({ 'task_group_templates.id': req.body.id, 'task_group_templates.orgId': req.orgId })
      let taskGroup = taskGroupResult[0]


      const tasks = await knex('template_task').where({ templateId: req.body.id, orgId: req.orgId }).select('taskName', 'id', 'taskNameAlternate', 'taskSerialNumber')

      // Get the team and main user
      let team = await knex('assigned_service_team')
        .innerJoin('teams', 'assigned_service_team.teamId', 'teams.teamId')
        .innerJoin('users', 'assigned_service_team.userId', 'users.id')
        .where({
          'assigned_service_team.entityId': req.body.id, 'assigned_service_team.entityType': 'task_group_templates'
        })
        .select([
          'teams.teamId as teamId',
          'assigned_service_team.userId as mainUserId'
        ])


      const additionalUsers = await knex('assigned_service_additional_users')
        .innerJoin('users', 'assigned_service_additional_users.userId', 'users.id')
        .where({
          'assigned_service_additional_users.entityId': req.body.id,
          'assigned_service_additional_users.entityType': 'task_group_templates',
          'assigned_service_additional_users.orgId': req.orgId
        }).select([
          'users.id as id'
        ])



      return res.status(200).json({
        data: {
          ...taskGroup,
          tasks,
          ...team[0],
          additionalUsers: additionalUsers.map(v => v.id)
        },
        message: 'Task Group Details'
      })
    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateTaskGroupDetails: async (req, res) => {
    try {
      let id = req.body.id
      let payload = _.omit(req.body, ['id', 'additionalUsers', 'tasks', 'taskGroupName', 'assetCategoryId', 'mainUserId', 'teamId', 'deletedTasks']);
      let tasks = req.body.tasks;
      let deletedTasks = req.body.deletedTasks
      let additionalUsers = req.body.additionalUsers;
      let currentTime = new Date().getTime()

      // Delete Tasks
      if (deletedTasks && deletedTasks.length) {
        for (let task of deletedTasks) {
          await knex('template_task').where({ id: task.id }).del()
        }
      }
      // additionalUsers: ["59", "60"]
      // assetCategoryId: "1"
      // endDate: "2019-11-21T18:30:00.000Z"
      // mainUserId: "59"
      // repeatFrequency: "1"
      // repeatOn: []
      // repeatPeriod: "DAY"
      // startDate: "2019-11-19T18:30:00.000Z"
      // taskGroupName: "Test Template"
      // tasks: ["task 1"]
      // teamId: "3"
      let updatedTaskGroupTemplate = null
      let resultScheduleData = null
      let updatedTeam = null
      let result = await knex('task_group_templates').update({ updatedAt: currentTime, taskGroupName: req.body.taskGroupName, assetCategoryId: req.body.assetCategoryId, orgId: req.orgId }).where({ id }).returning('*')
      updatedTaskGroupTemplate = result[0]

      let resultSchedule = await knex('task_group_template_schedule').update({ ...payload, repeatOn: payload.repeatOn.length ? payload.repeatOn.join(',') : '' })
      resultScheduleData = resultSchedule[0]

      let updatedTasks = []
      let updatedUsers = []
      let updatedTaskResult
      for (let task of tasks) {
        if (task.id) {

          updatedTaskResult = await knex('template_task')
            .update({
              taskName: task.taskName,
              taskNameAlternate: task.taskNameAlternate,
              taskSerialNumber: task.taskSerialNumber
            })
            .where({
              templateId: id,
              id: task.id,
              orgId: req.orgId
            }).returning('*')
          updatedTasks.push(updatedTaskResult[0])
        } else {
          updatedTaskResult = await knex('template_task')
            .insert({
              taskName: task.taskName,
              taskNameAlternate: task.taskNameAlternate,
              taskSerialNumber: task.taskSerialNumber,
              templateId: id,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId
            }).returning('*')
          updatedTasks.push(updatedTaskResult[0])
        }

      }

      for (let additionalUser of additionalUsers) {
        let updated = await knex('assigned_service_additional_users').update({ userId: additionalUser }).where({ entityId: id, entityType: 'task_group_templates', orgId: req.orgId })
        updatedUsers.push(updated[0])
      }

      let updatedTeamResult = await knex('assigned_service_team').update({ teamId: req.body.teamId ? req.body.teamId : null, userId: req.body.mainUserId ? req.body.mainUserId : null }).returning('*')
      updatedTeam = updatedTeamResult[0]

      return res.status(200).json({
        data: {
          updatedTaskGroupTemplate,
          resultScheduleData,
          updatedTeam,
          updatedTasks,
          updatedUsers
        }
      })

    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getTaskGroupTemplateList: async (req, res) => {
    try {


      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "taskGroupName";
        sortPayload.orderBy = "asc"
      }

      let reqData = req.query;
      let filters = req.body;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let orgId = req.orgId;

      let [total, rows] = await Promise.all([
        knex('task_group_templates').select('*')
          .where({ "task_group_templates.orgId": orgId })
          .where(qb => {
            if (filters.taskGroupName) {
              qb.where('task_group_templates.taskGroupName', 'iLIKE', `%${filters.taskGroupName}%`)
            }
          }),
        knex('task_group_templates').select('*').offset(offset).limit(per_page)
          .where({ "task_group_templates.orgId": orgId })
          .where(qb => {
            if (filters.taskGroupName) {
              qb.where('task_group_templates.taskGroupName', 'iLIKE', `%${filters.taskGroupName}%`)
            }
          })
          .orderBy(sortPayload.sortBy, sortPayload.orderBy)
      ])

      let count = total.length;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows

      return res.status(200).json({
        data: {
          list: pagination
        },
        message: 'Task group template list'
      })
    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  getTaskGroupScheduleDetails: async (req, res) => {
    try {
      const { scheduleId, taskGroupId } = req.body;
      const scheduleData = await knex('task_group_schedule')
        .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        .select([
          'task_group_schedule.*',
          'task_group_schedule_assign_assets.pmDate as pmDate'
        ]).where({ 'task_group_schedule.id': scheduleId, 'task_group_schedule_assign_assets.orgId': req.orgId })

      const team = await knex('assigned_service_team').select(['teamId', 'userId']).where({ entityType: 'pm_task_groups', entityId: taskGroupId, orgId: req.orgId })
      const additionalUsers = await knex('assigned_service_additional_users').select('userId').where({ entityType: 'pm_task_groups', entityId: taskGroupId, orgId: req.orgId })


      return res.status(200).json({
        data: {
          scheduleData,
          team,
          additionalUsers
        },
        message: 'Schedule Data'
      })

    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  updateOldTaskGroupScheduleWithWorkOrders: async (req, res) => {
    try {
      const { scheduleId, taskGroupId, newData } = req.body;
      const { startDateTime, endDateTime, repeatFrequency, repeatOn, repeatPeriod } = newData;
      const { teamId, mainUserId, additionalUsers } = newData;

      // Generate New Work Orders for the same schedule but from the date which are coming next
      // Previous date should be discarded
      let generatedDates = getRecurringDates({ startDateTime, endDateTime, repeatFrequency, repeatOn, repeatPeriod })

      // Delete work orders which are not yet completed
      await knex('task_group_schedule_assign_assets').where({ scheduleId, orgId: req.orgId }).whereRaw(knex.raw(`DATE("task_group_schedule_assign_assets"."pmDate") > now()`)).select('*').del()

      // Create New Work Orders Now
      // Get tasks for which the pms are to be created
      let tasksResults = await knex('pm_task').select('taskName').where({ taskGroupId, orgId: req.orgId })
      let tasks = _.uniqBy(tasksResults, 'taskName').map(v => v.taskName);

      let assetResults = []
      // Get Asset Ids for which new work orders are to be created
      const assetIdsResult = await knex('task_group_schedule_assign_assets').where({ scheduleId, orgId: req.orgId }).select('assetId')

      const assetIds = _.uniq(assetIdsResult.map(r => r.assetId).map(v => Number(v)))
      let currentTime = new Date().getTime()
      for (let i = 0; i < assetIds.length; i++) {
        const assetId = assetIds[i];
        for (let j = 0; j < generatedDates.length; j++) {
          const date = generatedDates[j];
          let assetResult = await knex("task_group_schedule_assign_assets")
            .insert({
              pmDate: date,
              scheduleId: scheduleId,
              assetId,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId
            })
            .returning(['*']);

          // CREATE PM TASK OPEN
          let InsertPmTaskPayload = tasks.map(da => ({
            taskName: da,
            taskGroupId,
            taskGroupScheduleAssignAssetId: assetResult[0].id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId
          }))

          let insertPmTaskResult = await knex('pm_task').insert(InsertPmTaskPayload).returning(['*']);
          createPmTask = insertPmTaskResult;

          // CREATE PM TASK CLOSE
          assetResults.push(assetResult[0]);
        }
      }

      const updatedSchedule = await knex('task_group_schedule').update({ startDate: startDateTime, endDate: endDateTime, repeatFrequency, repeatOn, repeatPeriod, orgId: req.orgId }).where({ id: scheduleId }).select('*')
      const updatedTeam = await knex('assigned_service_team').update({ teamId, userId: mainUserId }).where({ entityId: taskGroupId, entityType: 'pm_task_groups', orgId: req.orgId })
      let updatedAdditionalUsers = []
      for (let id of additionalUsers) {
        let updatedAdditionalUserResult = await knex('assigned_service_additional_users').update({ userId: id }).where({ entityType: 'pm_task_groups', entityId: taskGroupId, orgId: req.orgId })
        updatedAdditionalUsers.push(updatedAdditionalUserResult[0])
      }
      return res.status(200).json({
        data: {
          //deletedWorkOrders
          generatedDates,
          assetIds,
          tasks,
          assetResults,
          updatedSchedule,
          updatedTeam,
          updatedAdditionalUsers
        },
        message: 'Updated successfully'
      })
    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  }
  ,
  /***EXPORT TASK GROUP TEMPLATE DATA */
  exportTaskGroupTemplateData: async (req, res) => {
    try {

      let reqData = req.query;
      let orgId = req.orgId
      let rows = null;
      [rows] = await Promise.all([
        knex('task_group_templates').
          select([
            'orgId as ORGANIZATION_ID',
            'id as ID',
            'taskGroupName as TASKGROUP_NAME',
            "assetCategoryId as ASSET_CATEGORY_ID",
            "pmId as  PM_ID",
            "isActive as STATUS",
            "createdBy as CREATED BY ID",
            "createdAt as DATE CREATED",
          ])
          .where({ "task_group_templates.orgId": orgId })
          .orderBy('task_group_templates.createdAt', 'desc')
      ])


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
      let filename = "TaskGroupTemplateData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require('aws-sdk');

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Task_Group_Template/" + filename,
          Body: file_buffer,
          ACL: 'public-read'
        }
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let url = "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Task_Group_Template/" + filename;

            return res.status(200).json({
              data: rows,
              message: 'Task group template data export successfully!',
              url: url
            })
          }
        });


      })
      // let deleteFile = await fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })

    } catch (err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  importTaskGroup: async (req, res) => {

  },
  togglePmTemplateStatus: async (req, res) => {
    try {
      const id = req.body.id;
      let pmTemplate = await knex('task_group_templates').select('isActive').where({ id: id, orgId: req.orgId }).first()
      let status = Boolean(pmTemplate.isActive);
      if (status) {
        await knex('task_group_templates').update({ isActive: false, orgId: req.orgId }).where({ id: id })
      } else {
        await knex('task_group_templates').update({ isActive: true, orgId: req.orgId }).where({ id: id })
      }
      return res.status(200).json({
        data: {
          message: 'Successfully updated status!'
        }
      })
    } catch (err) {
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  pmLocationDetail: async (req, res) => {
    try {
      let payload = req.body;
      let pmId;
      let locationData
      if (payload.taskGroupId) {
        pmId = await knex('pm_task_groups').select('pmId').where({ id: payload.taskGroupId }).first()
        locationData = await knex('pm_master2')
          .innerJoin('companies', 'pm_master2.companyId', 'companies.id')
          .innerJoin('projects', 'pm_master2.projectId', 'projects.id')
          .select(["companies.companyName", "projects.projectName", "pm_master2.name as pmName"])
          .where({ 'pm_master2.orgId': req.orgId, 'pm_master2.id': pmId.pmId }).first()
      }

      if (payload.pmId) {
        locationData = await knex('pm_master2')
          .innerJoin('companies', 'pm_master2.companyId', 'companies.id')
          .innerJoin('projects', 'pm_master2.projectId', 'projects.id')
          .select(["companies.companyName", "projects.projectName", "pm_master2.name as pmName"])
          .where({ 'pm_master2.orgId': req.orgId, 'pm_master2.id': payload.pmId }).first()
      }


      return res.status(200).json({
        data: {
          locationData: locationData
        }
      })

    } catch (err) {
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  editWorkOrderDate: async (req, res) => {
    try {
      const payload = req.body
      const updatedWorkOrder = await knex('task_group_schedule_assign_assets')
        .update({ pmDate: payload.newPmDate })
        .where({ id: payload.workOrderId })
      return res.status(200).json({
        data: {
          updatedWorkOrder
        },
        message: 'Work order date updated!'
      })
    } catch (err) {
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  deleteWorkOrder: async (req, res) => {
    try {
      const id = req.body.workOrderId;
      const deletedWorkOrder = await knex('task_group_schedule_assign_assets').where({ id: id }).del().returning(['*'])
      return res.status(200).json({
        data: deletedWorkOrder,
        message: 'Deleted Work order successfully!'
      })
    } catch (err) {

    }
  }
}

module.exports = taskGroupController









function getRecurringDates({ repeatPeriod, repeatOn, repeatFrequency, startDateTime, endDateTime }) {
  repeatPeriod = repeatPeriod;
  repeatOn = repeatOn && repeatOn.length ? repeatOn.join(',') : [];
  repeatFrequency = Number(repeatFrequency);
  let start = new Date(startDateTime);
  let startYear = start.getFullYear();
  let startMonth = start.getMonth();
  let startDate = start.getDate();
  let end = new Date(endDateTime);
  let endYear = end.getFullYear();
  let endMonth = end.getMonth();
  let endDate = end.getDate();
  let performingDates;

  let config = {
    interval: repeatFrequency,
    dtstart: new Date(
      Date.UTC(
        startYear, startMonth, startDate
      )
    ),
    until: new Date(
      Date.UTC(
        endYear, endMonth, endDate
      )
    ) // year, month, date
  };
  if (repeatPeriod === "YEAR") {
    config["freq"] = RRule.YEARLY;
  } else if (repeatPeriod === "MONTH") {
    config["freq"] = RRule.MONTHLY;
  } else if (repeatPeriod === "WEEK") {
    config["freq"] = RRule.WEEKLY;
    let array = [];

    if (repeatOn.includes("MO")) {
      array.push(RRule.MO);
    }
    if (repeatOn.includes("TU")) {
      array.push(RRule.TU);
    }
    if (repeatOn.includes("WE")) {
      array.push(RRule.WE);
    }
    if (repeatOn.includes("TH")) {
      array.push(RRule.TH);
    }
    if (repeatOn.includes("FR")) {
      array.push(RRule.FR);
    }
    if (repeatOn.includes("SA")) {
      array.push(RRule.SA);
    }
    if (repeatOn.includes("SU")) {
      array.push(RRule.SU);
    }
    config["byweekday"] = array;
  } else if (repeatPeriod === "DAY") {
    config["freq"] = RRule.DAILY;
  }

  const rule = new RRule(config);
  performingDates = rule.all();
  return performingDates.map(v => new Date(v).getTime()).filter(v => v > new Date().getTime()).map(v => new Date(v).toISOString())
}







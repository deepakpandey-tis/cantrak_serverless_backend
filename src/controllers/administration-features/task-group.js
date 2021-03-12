const Joi = require("@hapi/joi");
//const moment = require('moment');
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const knex = require("../../db/knex");
const { RRule, RRuleSet, rrulestr } = require("rrule");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const emailHelper = require("../../helpers/email");
const creatPmHelper = require("../../helpers/preventive-maintenance");
const { response } = require("express");

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
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      await knex.transaction(async (trx) => {
        let payload = req.body;
        let currentTime = new Date().getTime();

        if (payload.isNew === "true") {
          // CREATE TASK TEMPLATE OPEN
          let insertTemplateData = {
            assetCategoryId: payload.assetCategoryId,
            taskGroupName: payload.taskGroupName,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          let insertTemplateResult = await knex
            .insert(insertTemplateData)
            .returning(["*"])
            .transacting(trx)
            .into("task_group_templates");
          createTemplate = insertTemplateResult[0];
          // CREATE TASK TEMPLATE CLOSE

          // CREATE TASK OPEN
          let tasksInsertPayload = payload.tasks.map((da) => ({
            taskName: da,
            templateId: createTemplate.id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          }));

          let insertTaskResult = await knex
            .insert(tasksInsertPayload)
            .returning(["*"])
            .transacting(trx)
            .into("template_task");
          createTask = insertTaskResult;
          // CREATE TASK CLOSE

          // CREATE PM TASK GROUP OPEN

          let insertPmTemplateData = {
            assetCategoryId: payload.assetCategoryId,
            taskGroupName: payload.taskGroupName,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          let insertPmTemplateResult = await knex
            .insert(insertPmTemplateData)
            .returning(["*"])
            .transacting(trx)
            .into("pm_task_groups");
          createPmTemplate = insertPmTemplateResult[0];
          // CREATE PM TASK GROUP CLOSE

          // CREATE PM TASK NAME OPEN
          let tasksPmInsertPayload = payload.tasks.map((da) => ({
            taskName: da,
            taskGroupId: createPmTemplate.id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          }));

          let insertPmTaskResult = await knex
            .insert(tasksPmInsertPayload)
            .returning(["*"])
            .transacting(trx)
            .into("pm_task");
          createPmTask = insertPmTaskResult;
          // CREATE PM TASK NAME CLOSE
        } else {
          // CREATE PM TASK GROUP OPEN

          let insertPmTemplateData = {
            taskGroupName: payload.taskGroupName,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          let insertPmTemplateResult = await knex
            .insert(insertPmTemplateData)
            .returning(["*"])
            .transacting(trx)
            .into("pm_task_groups");
          createPmTemplate = insertPmTemplateResult[0];
          // CREATE PM TASK GROUP CLOSE

          // CREATE PM TASK NAME OPEN
          let tasksPmInsertPayload = payload.tasks.map((da) => ({
            taskName: da,
            taskGroupId: createPmTemplate.id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          }));
          // PM TASK GROUP TASK
          let insertPmTaskResult = await knex
            .insert(tasksPmInsertPayload)
            .returning(["*"])
            .transacting(trx)
            .into("pm_task");
          createPmTask = insertPmTaskResult;
        }

        return res.status(200).json({
          data: {
            taskGroupTemplateData: createTemplate,
            taskData: createTask,
            pmTemplateData: createPmTemplate,
            PmTaskData: createPmTask,
          },
          message: "Task Group Template Created Successfully!",
        });
      });

      await knex("pm_task_groups")
        .update({ isActive: true })
        .where({ isActive: true });
    } catch (err) {
      console.log(
        "[controllers][task-group][createTaskGroupTemplate] :  Error",
        err
      );

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
    // GET TASK GROUP TEMPLATE LIST
  },
  createPMTemplate: async (req, res) => {
    try {
      // console.log("Create PM template data", req.body)
      let taskGroupTemplate = null;
      let insertedTasks = [];
      let taskGroupTemplateSchedule = null;
      let partResult = [];
      //let assignedAdditionalUser = null;
      let payload = _.omit(req.body, [
        "teamId",
        "repeatFrequency",
        "repeatPeriod",
        "repeatOn",
        "tasks",
        "mainUserId",
        "additionalUsers",
        "startDate",
        "endDate",
        "frequencyTagId",
        "workOrderDates",
      ]);
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required(),
        // repeatFrequency: Joi.string().required(),
        //repeatOn
        // repeatPeriod: Joi.string().required(),
        taskGroupName: Joi.string().required(),
        // startDate: Joi.string().required(),
        // endDate: Joi.string().required(),
        // teamId: Joi.string().required(),
        orgId: req.orgId,

        //tasks: []
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      // Check duplicate value open
      const templateExist = await knex("task_group_templates")
        .where("taskGroupName", "iLIKE", payload.taskGroupName)
        .where("assetCategoryId", payload.assetCategoryId)
        .where({ orgId: req.orgId })
        .first();

      console.log(
        "[controllers][task-group][createTemplate]: ServiceCode",
        templateExist
      );

      if (templateExist && templateExist.length) {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: "Template already exist for selected asset category!!",
            },
          ],
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
        orgId: req.orgId,
      };
      let taskGroupTemplateResult = await knex("task_group_templates")
        .insert(tgtInsert)
        .returning(["*"]);
      taskGroupTemplate = taskGroupTemplateResult[0];

      for (let k = 0; k < req.body.tasks.length; k++) {
        //   //for (let da of payload.tasks) {

        let insertPaylaod = {
          taskName: req.body.tasks[k].taskName,
          templateId: taskGroupTemplate.id,
          createdAt: currentTime,
          createdBy: req.body.mainUserId ? req.body.mainUserId : null,
          orgId: req.orgId,
          taskSerialNumber: req.body.tasks[k].taskSerialNumber,
          taskNameAlternate: req.body.tasks[k].taskNameAlternate,
          updatedAt: currentTime,
          duration: req.body.tasks[k].duration
            ? req.body.tasks[k].duration
            : 0.0,
          hourlyRate: req.body.tasks[k].hourlyRate
            ? req.body.tasks[k].hourlyRate
            : 0.0,
        };

        let taskResult = await knex("template_task")
          .insert(insertPaylaod)
          .returning(["*"]);

        insertedTasks.push(taskResult);

        if (req.body.tasks[k].linkedParts == undefined) {
        } else {
          // let partPayload = payload.tasks[k].linkedParts.map(ta => ({

          //   taskId: insertPmTaskResult[0].id,
          //   partId: ta.partId,
          //   quantity: ta.quantity,
          //   createdAt: currentTime,
          //   updatedAt: currentTime,
          //   orgId: req.orgId,
          // }))

          for (let part of req.body.tasks[k].linkedParts) {
            let partPayload = {
              taskId: taskResult[0].id,
              partId: part.partId,
              quantity: part.quantity,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
              //workOrderId: assetResult[0].id
            };

            let check = await knex.from("task_assigned_part").where({
              taskId: taskResult[0].id,
              partId: part.partId,
              quantity: part.quantity,
              orgId: req.orgId,
            });

            if (check && check.length) {
            } else {
              let insertPartResult = await knex
                .insert(partPayload)
                .returning(["*"])
                .into("task_assigned_part");

              partResult.push(insertPartResult);
            }
          }
        }
      }

      // Insert into task_group_template_schedule
      let insertTTData = {
        startDate: req.body.startDate ? req.body.startDate : null,
        endDate: req.body.endDate ? req.body.endDate : null,
        repeatFrequency: req.body.repeatFrequency
          ? req.body.repeatFrequency
          : null,
        repeatOn: req.body.repeatOn,
        frequencyTagId: req.body.frequencyTagId
          ? req.body.frequencyTagId
          : null,
        repeatPeriod: req.body.repeatPeriod ? req.body.repeatPeriod : null,
        taskGroupId: taskGroupTemplate.id,
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId,
      };

      let taskGroupScheduleResult = await knex("task_group_template_schedule")
        .insert(insertTTData)
        .returning(["*"]);
      taskGroupTemplateSchedule = taskGroupScheduleResult[0];

      // Insert into teams

      // ASSIGNED ADDITIONAL USER OPEN
      let assignedAdditionalUserResult;
      let assignedAdditionalUser;
      if (
        typeof req.body.additionalUsers !== "string" &&
        req.body.additionalUsers.length
      ) {
        let insertAssignedAdditionalUserData = req.body.additionalUsers.map(
          (user) => ({
            userId: user,
            entityId: taskGroupTemplate.id,
            entityType: "task_group_templates",
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          })
        );

        assignedAdditionalUserResult = await knex(
          "assigned_service_additional_users"
        )
          .insert(insertAssignedAdditionalUserData)
          .returning(["*"]);
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
        orgId: req.orgId,
      };

      let assignedServiceTeamResult = await knex("assigned_service_team")
        .insert(insertAssignedServiceTeamData)
        .returning(["*"]);
      assignedServiceTeam = assignedServiceTeamResult[0];

      // ASSIGNED TEAM CLOSE

      return res.status(200).json({
        data: {
          taskGroupTemplate,
          tasks: insertedTasks,
          taskGroupTemplateSchedule,
          assignedAdditionalUser,
          assignedServiceTeam,
          partResult,
        },
        mesaage: "Task Group Template added successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][createTaskGroupTemplate] :  Error",
        err
      );

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getGroupTemplateList: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let templateResult = await knex("task_group_templates")
        .returning("*")
        .where({
          assetCategoryId: payload.assetCategoryId,
          orgId: req.orgId,
          isActive: true,
        });

      return res.status(200).json({
        data: { groupTemplateData: templateResult },
        message: "Task Group Template List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][getGroupTemplateList] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
    // GET GROUP TASK LIST
  },
  getGroupTaskList: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        templateId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      let taskResult = await knex("template_task")
        .returning("*")
        .where({ templateId: payload.templateId, orgId: req.orgId });

      return res.status(200).json({
        data: {
          groupTaskData: taskResult,
        },
        message: "Group Task List Successfully!",
      });
    } catch (err) {
      console.log("[controllers][task-group][getGroupTaskList] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // CREATE PM TASK GROUP SCHEDULE
  createPmTaskgroupSchedule: async (req, res) => {
    try {
      let orgId = req.orgId;
      let pmWorkOrder;
      let payload = req.body.taskGroups;

      let currentDate = moment().format("YYYY-MM-DD");
      console.log("current date", payload.startDateTime);
      if (!(payload[0].startDateTime >= currentDate)) {
        console.log(currentDate, "current Date");
        return res.status(400).json({
          errors: [
            { code: "LESS_THAN_ERROR", message: "Enter valid start date" },
          ],
        });
      }

      if (!(payload[0].endDateTime >= currentDate)) {
        console.log(currentDate, "Current Date");
        return res.status(400).json({
          errors: [
            { code: "LESS_THAN_ERROR", message: "Enter valid end date" },
          ],
        });
      }

      const schema = Joi.array().items(
        Joi.object().keys({
          assetCategoryId: Joi.number().required(),
          companyId: Joi.number().required(),
          projectId: Joi.number().required(),
          pmId: Joi.string().required(),
          startDateTime: Joi.date().required(),
          endDateTime: Joi.date().required(),
          repeatPeriod: Joi.string().required(),
          repeatFrequency: Joi.number().required(),
          // teamId: Joi.string().required(),
          teamId: Joi.string().allow("").allow(null).optional(),
          mainUserId: Joi.string().allow("").allow(null).optional(),
          // mainUserId: Joi.array().items(Joi.number().allow(null).optional()).allow(null).optional(),
          taskGroupName: Joi.string().required(),
          assets: Joi.array()
            .items(Joi.string().required())
            .strict()
            .required(),
          frequencyTagId: Joi.number().required(),
          additionalUsers: Joi.array()
            .items(Joi.string().allow("").optional())
            .optional(),
          // repeatOn : Joi.string().allow('').allow(null).optional(),
          // repeatOn : Joi.array().items(Joi.object().optional()).optional(),
          repeatOn: Joi.array()
            .items(Joi.string().allow("").allow(null).optional())
            .allow("")
            .allow(null)
            .optional(),
          tasks: Joi.array().items(Joi.object().optional()).optional(),
          workOrderDates: Joi.array()
            .items(Joi.string().allow("").optional())
            .optional(),
        })
      );

      const result = Joi.validate(req.body.taskGroups, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let consolidatedWorkOrders = req.body.consolidatedWorkOrders;
      // consolidatedWorkOrders = consolidatedWorkOrders.map(c => {
      //   delete c.assetCategory;
      //   return c;
      // });
      console.log("consolidatedWorkOrders ======>>>>>", consolidatedWorkOrders);

      let workOrderLength = 0;
      for (let i = 0; i < consolidatedWorkOrders.length; i++) {
        workOrderLength =
          workOrderLength + consolidatedWorkOrders[i].assets.length;
      }

      console.log("work order lengths======>>>>>", workOrderLength);

      if (workOrderLength <= 200) {
        pmWorkOrder = await creatPmHelper.createWorkOrders({
          consolidatedWorkOrders,
          payload,
          orgId,
        });

        console.log("taskgroup data=======", payload);

        return res.status(200).json({
          data: { pmWorkOrder },
          message: "Create Pm Task Group Schedule Successfully!",
        });
      } else {
        console.log("Work order length is > 200");

        let orgMaster = await knex
          .from("organisations")
          .where({ id: req.orgId })
          .first();
        // Import SQS Helper..
        const queueHelper = require("../../helpers/queue");
        await queueHelper.addToQueue(
          {
            consolidatedWorkOrders,
            payload,
            orgId,
            requestedBy: req.me,
            orgMaster: orgMaster,
          },
          "long-jobs",
          "PM_WORK_ORDER_GENERATE"
        );

        return res.status(200).json({
          message:
            "Request is accepted and is being processed. We will notify you once it it done.",
        });
      }
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  // GET TASK GROUP SCHEDULE LIST
  getTaskGroupScheduleList: async (req, res) => {
    try {
      let scheduleList = null;
      let payload = req.body;

      const schema = Joi.object().keys({
        pmId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      await knex("task_group_schedule")
        .update({ isActive: true })
        .where({ isActive: true });

      await knex("task_group_schedule")
        .update({ isActive: true })
        .where({ isActive: true });

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
            "task_group_schedule.orgId": req.orgId,
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
            "task_group_schedule.orgId": req.orgId,
          })
          .offset(offset)
          .limit(per_page),
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
        message: "Task Group Schedule List Successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getPmList: async (req, res) => {
    try {
      const list = await knex("pm_master2").select();
      let payload = req.body;
      let reqData = req.query;
      let total, rows;
      let {
        companyId,
        pmNo,
        assetCategoryId,
        pmPlanName,
        startDate,
        endDate,
      } = req.body;
      let filters = {};
      // if (assetCategoryId) {
      //   filters['asset_category_master.id'] = assetCategoryId;
      // }

      const accessibleProjects = req.userProjectResources[0].projects;

      startDate = startDate
        ? moment(startDate).startOf("date").format("YYYY-MM-DD HH:mm:ss")
        : "";
      endDate = endDate
        ? moment(endDate).endOf("date").format("YYYY-MM-DD HH:mm:ss")
        : "";

      let startTime = new Date(startDate).getTime();
      let endTime = new Date(endDate).getTime();

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let projects = _.flatten(
        req.userProjectResources.map((v) => v.projects)
      ).map((v) => Number(v));

      projects = _.uniq(projects);
      console.log("Projects Resources: ", projects);

      //console.log('Projects: ',projects)
      //console.log('pppppppppppppppppp',req.userProjectResources)
      // let projects = _.flatten(req.userProjectResources.map(v => v.projects))
      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("pm_master2")
          .innerJoin(
            "asset_category_master",
            "pm_master2.assetCategoryId",
            "asset_category_master.id"
          )
          //.innerJoin('task_group_schedule', 'pm_master2.id', 'task_group_schedule.pmId')
          .innerJoin("companies", "pm_master2.companyId", "companies.id")

          .where((qb) => {
            // qb.where(filters);
            qb.where({ "pm_master2.orgId": req.orgId });
            qb.whereIn("pm_master2.projectId", projects);
            if (companyId) {
              qb.where("pm_master2.companyId", companyId);
            }
            if (assetCategoryId) {
              qb.whereIn("pm_master2.assetCategoryId", assetCategoryId);
            }
            if (pmNo) {
              qb.where("pm_master2.displayId", pmNo);
            }

            //qb.where({'pm_master2.projectId':})
            if (pmPlanName) {
              qb.where("pm_master2.name", "iLIKE", `%${pmPlanName}%`);
            }
            if (startDate && endDate) {
              qb.whereBetween("pm_master2.createdAt", [
                payload.startDate,
                payload.endDate,
              ]);
              // qb.where('task_group_schedule.endDate', '<=', endDate)
            }

            // if (startDate && endDate) {
            //   qb.where('task_group_schedule.startDate', '>=', startDate)
            //   qb.where('task_group_schedule.endDate', '<=', endDate)
            // }
            // if (endDate) {
            //    qb.where({ 'task_group_schedule.endDate': endDate })
            // }
            qb.whereIn("pm_master2.projectId", accessibleProjects);
          }),
        knex
          .from("pm_master2")
          .innerJoin(
            "asset_category_master",
            "pm_master2.assetCategoryId",
            "asset_category_master.id"
          )
          //.innerJoin('task_group_schedule', 'pm_master2.id', 'task_group_schedule.pmId')
          .innerJoin("companies", "pm_master2.companyId", "companies.id")
          .select([
            "asset_category_master.*",
            "pm_master2.*",
            "pm_master2.id as id",
            "pm_master2.displayId as PMNo",
            "companies.companyName",
            "companies.companyId",
          ])
          .where((qb) => {
            //qb.where(filters)
            qb.whereIn("pm_master2.projectId", projects);

            qb.where({ "pm_master2.orgId": req.orgId });

            if (companyId) {
              qb.where("pm_master2.companyId", companyId);
            }

            if (assetCategoryId) {
              qb.whereIn("pm_master2.assetCategoryId", assetCategoryId);
            }

            if (pmNo) {
              qb.where("pm_master2.displayId", pmNo);
            }

            if (pmPlanName) {
              qb.where("pm_master2.name", "iLIKE", `%${pmPlanName}%`);
            }
            if (startDate && endDate) {
              qb.whereBetween("pm_master2.createdAt", [
                payload.startDate,
                payload.endDate,
              ]);
              // qb.where('task_group_schedule.endDate', '<=', endDate)
            }
            if (endDate) {
              //  qb.where({ 'task_group_schedule.endDate': endDate })
            }
            qb.whereIn("pm_master2.projectId", accessibleProjects);
          })
          .orderBy("pm_master2.createdAt", "desc")
          .offset(offset)
          .limit(per_page),
      ]);

      console.log(JSON.stringify(total, 2, null));
      let count = total[0].count;
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
          pm_list: pagination,
          startTime,
          endTime,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  createBrandNewPm: async (req, res) => {
    try {
      let payload = req.body;
      let currentTime = new Date().getTime();
      // CREATE PM  OPEN
      let insertPmData = {
        name: payload.pmName,
        assetCategoryId: payload.assetCategoryId,
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId,
      };
      let insertPmResult = await knex("pm_master2")
        .insert(insertPmData)
        .returning(["*"]);
      createPM = insertPmResult[0];

      return res.status(200).json({
        data: {
          pm: createPM,
          message: "Pm created Successfully",
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // GET TASK GROUP ASSET PMS LIST
  getTaskGroupAssetPmsList: async (req, res) => {
    try {
      let reqData = req.query;
      let payLoad = req.body;
      let workOrderDate = req.body.workOrderDate;
      let payloadFilter = req.body;
      let assignedTeam = [];
      if (payloadFilter.assignedTeam && payloadFilter.assignedTeam.length) {
        assignedTeam = payloadFilter.assignedTeam;
      }
      const payload = _.omit(payLoad, [
        "assetCategoryId",
        "workOrderDate",
        "assetName",
        "assetSerial",
        "status",
        "assignedTeam",
        "repeatPeriod",
        "company",
      ]);

      const schema = Joi.object().keys({
        pmId: Joi.string().required(),
        category: Joi.string().allow("").allow(null).optional(),
        workOrderId: Joi.string().allow("").allow(null).optional(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let workOrderTime = moment(req.body.workOrderDate)
        .endOf("date")
        .format("YYYY-MM-DD");
      // console.log("work order time", workOrderTime, req.body.workOrderDate);

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total,
        rows,
        rowsId = [];

      if (payloadFilter.assignedTeam && payloadFilter.assignedTeam.length) {
        ([total, rows, rowsId] = await Promise.all([
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
            .leftJoin(
              "assigned_service_team",
              "task_group_schedule_assign_assets.id",
              "assigned_service_team.workOrderId"
            )
            .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
            .leftJoin("users", "assigned_service_team.userId", "users.id")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .where({
              "task_group_schedule.pmId": payload.pmId,
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.id",
                  payload.workOrderId
                );
              }
              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDate) {
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${req.body.workOrderDate}'`
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.status) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }

              if (payloadFilter.repeatPeriod) {
                qb.whereRaw(
                  `"task_group_schedule_assign_assets"."frequencyTagIds"->>0  iLIKE ? `,
                  [payloadFilter.repeatPeriod]
                )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>1  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>2  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>3  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>4  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>5  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  );
              }
              if (payloadFilter.assignedTeam.length) {
                qb.whereIn(
                  "assigned_service_team.teamId",
                  payloadFilter.assignedTeam
                );
              }
              qb.where({
                "assigned_service_team.entityType": "work_order",
              });
            }),
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
            .leftJoin(
              "assigned_service_team",
              "task_group_schedule_assign_assets.id",
              "assigned_service_team.workOrderId"
            )
            .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
            .leftJoin("users", "assigned_service_team.userId", "users.id")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "task_group_schedule_assign_assets.id as workOrderId",
              "task_group_schedule_assign_assets.displayId as TGAA",
              "task_group_schedule_assign_assets.isActive as status",
              "task_group_schedule_assign_assets.isOverdue",
              "task_group_schedule.id as id",
              "asset_master.assetName as assetName",
              "asset_master.model as model",
              "asset_master.assetSerial as assetSerial",
              "asset_master.id as assetId",
              "asset_master.assetCategoryId",
              "task_group_schedule_assign_assets.pmDate as pmDate",
              knex.raw(
                `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
              ),
              "task_group_schedule.repeatFrequency as repeatFrequency",
              "task_group_schedule_assign_assets.frequencyTagIds",
              "task_group_schedule_assign_assets.status",
              "task_group_schedule.taskGroupId",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",
              "assigned_service_team.teamId",
              "teams.teamName",
              "teams.description",
              "users.userName",
            ])
            .where({
              "task_group_schedule.pmId": payload.pmId,
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }
              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDate) {
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${req.body.workOrderDate}'`
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.status) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }

              if (payloadFilter.repeatPeriod) {
                qb.whereRaw(
                  `"task_group_schedule_assign_assets"."frequencyTagIds"->>0  iLIKE ? `,
                  [payloadFilter.repeatPeriod]
                )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>1  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>2  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>3  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>4  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>5  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  );
              }
              if (payloadFilter.assignedTeam.length) {
                qb.whereIn(
                  "assigned_service_team.teamId",
                  payloadFilter.assignedTeam
                );
              }

              qb.where({
                "assigned_service_team.entityType": "work_order",
              });
            })
            .offset(offset)
            .limit(per_page)
            .orderBy("workOrderDate", "asc"),
        ])),
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
            .leftJoin(
              "assigned_service_team",
              "task_group_schedule_assign_assets.id",
              "assigned_service_team.workOrderId"
            )
            .leftJoin("users", "assigned_service_team.userId", "users.id")
            .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
            .leftJoin("users", "assigned_service_team.userId", "users.id")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "task_group_schedule_assign_assets.id as workOrderId",
              "asset_master.id as assetId",
              "task_group_schedule.taskGroupId",
            ])
            .where({
              "task_group_schedule.pmId": payload.pmId,
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }

              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDate) {
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${req.body.workOrderDate}'`
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.status) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }

              if (payloadFilter.repeatPeriod) {
                qb.whereRaw(
                  `"task_group_schedule_assign_assets"."frequencyTagIds"->>0  iLIKE ? `,
                  [payloadFilter.repeatPeriod]
                )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>1  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>2  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>3  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>4  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>5  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  );
              }
              if (payloadFilter.assignedTeam.length) {
                qb.whereIn(
                  "assigned_service_team.teamId",
                  payloadFilter.assignedTeam
                );
              }

              qb.where({
                "assigned_service_team.entityType": "work_order",
              });
            });
      } else {
        [total, rows, rowsId] = await Promise.all([
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
              "task_group_schedule.pmId": payload.pmId,
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }
              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDate) {
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${req.body.workOrderDate}'`
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.status) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }
              if (payloadFilter.repeatPeriod) {
                qb.whereRaw(
                  `"task_group_schedule_assign_assets"."frequencyTagIds"->>0  iLIKE ? `,
                  [payloadFilter.repeatPeriod]
                )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>1  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>2  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>3  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>4  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>5  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  );
              }
            }),
          knex
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
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "task_group_schedule_assign_assets.id as workOrderId",
              "task_group_schedule_assign_assets.displayId as TGAA",
              "task_group_schedule_assign_assets.isActive as status",
              "task_group_schedule_assign_assets.isOverdue",
              "task_group_schedule.id as id",
              "asset_master.assetName",
              "asset_master.model",
              "asset_master.assetSerial",
              "asset_master.id as assetId",
              "asset_master.assetCategoryId",
              "task_group_schedule_assign_assets.pmDate as pmDate",
              knex.raw(
                `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
              ),
              "task_group_schedule.repeatPeriod as repeatPeriod",
              "task_group_schedule.repeatOn as repeatOn",
              "task_group_schedule.repeatFrequency as repeatFrequency",
              "task_group_schedule_assign_assets.frequencyTagIds",
              "task_group_schedule_assign_assets.status",
              "task_group_schedule.taskGroupId",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",
            ])
            .where({
              "task_group_schedule.pmId": payload.pmId,
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }

              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }

              if (req.body.workOrderDate) {
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${req.body.workOrderDate}'`
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.status) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }
              if (payloadFilter.repeatPeriod) {
                qb.whereRaw(
                  `"task_group_schedule_assign_assets"."frequencyTagIds"->>0  iLIKE ? `,
                  [payloadFilter.repeatPeriod]
                )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>1  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>2  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>3  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>4  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  )
                  .orWhereRaw(
                    `"task_group_schedule_assign_assets"."frequencyTagIds"->>5  iLIKE ? `,
                    [payloadFilter.repeatPeriod]
                  );
              }
            })
            // .as("X");
            // })
            .offset(offset)
            .limit(per_page)
            .orderBy("workOrderId", "asc"),

          knex
            .distinct("workOrderId")
            .select("*")
            .from(function () {
              this.from("task_group_schedule")
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
                .leftJoin(
                  "asset_location",
                  "asset_master.id",
                  "asset_location.assetId"
                )
                .leftJoin(
                  "companies",
                  "asset_location.companyId",
                  "companies.id"
                )
                .leftJoin("projects", "asset_location.projectId", "projects.id")
                .leftJoin(
                  "buildings_and_phases",
                  "asset_location.buildingId",
                  "buildings_and_phases.id"
                )
                .leftJoin(
                  "floor_and_zones",
                  "asset_location.floorId",
                  "floor_and_zones.id"
                )
                .leftJoin(
                  "property_units",
                  "asset_location.unitId",
                  "property_units.id"
                )
                .select(["task_group_schedule_assign_assets.id as workOrderId"])
                .where({
                  "task_group_schedule.pmId": payload.pmId,
                  "task_group_schedule.orgId": req.orgId,
                })
                .where((qb) => {
                  if (payload.workOrderId && payload.workOrderId != null) {
                    qb.where(
                      "task_group_schedule_assign_assets.displayId",
                      payload.workOrderId
                    );
                  }

                  if (
                    req.body.assetCategoryId &&
                    req.body.assetCategoryId.length > 0
                  ) {
                    qb.whereIn(
                      "asset_master.assetCategoryId",
                      req.body.assetCategoryId
                    );
                  }

                  if (req.body.workOrderDate) {
                    console.log(
                      "work order date====>>>>>",
                      req.body.workOrderDate
                    );
                    qb.whereRaw(
                      `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${req.body.workOrderDate}'`
                    );
                  }
                  if (req.body.assetName && req.body.assetName.length > 0) {
                    qb.whereIn(
                      "task_group_schedule_assign_assets.assetId",
                      req.body.assetName
                    );
                  }
                  if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                    qb.whereIn("asset_master.id", req.body.assetSerial);
                  }
                  if (req.body.status) {
                    qb.whereIn(
                      "task_group_schedule_assign_assets.status",
                      req.body.status
                    );
                  }
                  if (payloadFilter.repeatPeriod) {
                    qb.whereRaw(
                      `"task_group_schedule_assign_assets"."frequencyTagIds"->>0  iLIKE ? `,
                      [payloadFilter.repeatPeriod]
                    )
                      .orWhereRaw(
                        `"task_group_schedule_assign_assets"."frequencyTagIds"->>1  iLIKE ? `,
                        [payloadFilter.repeatPeriod]
                      )
                      .orWhereRaw(
                        `"task_group_schedule_assign_assets"."frequencyTagIds"->>2  iLIKE ? `,
                        [payloadFilter.repeatPeriod]
                      )
                      .orWhereRaw(
                        `"task_group_schedule_assign_assets"."frequencyTagIds"->>3  iLIKE ? `,
                        [payloadFilter.repeatPeriod]
                      )
                      .orWhereRaw(
                        `"task_group_schedule_assign_assets"."frequencyTagIds"->>4  iLIKE ? `,
                        [payloadFilter.repeatPeriod]
                      )
                      .orWhereRaw(
                        `"task_group_schedule_assign_assets"."frequencyTagIds"->>5  iLIKE ? `,
                        [payloadFilter.repeatPeriod]
                      );
                  }
                })
                .as("X");
            }),
        ]);
      }

      const Parallel = require("async-parallel");
      rows = await Parallel.map(rows, async (row) => {
        const teamData = await knex
          .from("assigned_service_team")
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .select([
            "assigned_service_team.teamId",
            "teams.teamName",
            "teams.description",
            "users.userName",
          ])
          .where({
            "assigned_service_team.entityId": row.workOrderId,
            "assigned_service_team.entityType": "work_order",
          })
          .where((qb) => {
            if (req.body.assignedTeam) {
              qb.whereIn("assigned_service_team.teamId", req.body.assignedTeam);
            }
          })
          .first();
        return { ...row, ...teamData };
      });

      rowsId = await Parallel.map(rowsId, async (row) => {
        const teamData = await knex
          .from("assigned_service_team")
          .select(["assigned_service_team.teamId"])
          .where({
            "assigned_service_team.entityId": row.workOrderId,
            "assigned_service_team.entityType": "work_order",
          })
          .where((qb) => {
            if (req.body.assignedTeam) {
              qb.whereIn("assigned_service_team.teamId", req.body.assignedTeam);
            }
          })
          .first();
        return { ...row, ...teamData };
      });

      let count = total.length ? total[0].count : 0;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = rows;
      pagination.totalWO = rowsId;

      return res.status(200).json({
        data: {
          taskGroupAssetPmsData: pagination,
        },
        message: "Task Group PMs Asset List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-task-group-asset-pms-list] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getWorkOrderListFromDate: async (req, res) => {
    try {
      let payload = req.body;
      let reqData = req.query;

      console.log("data in payload===>>>>>", payload);
      let workOrderDate = moment(payload.workOrderDate).format("YYYY-MM-DD");

      const accessibleProjects = req.userProjectResources[0].projects;

      const schema = Joi.object().keys({
        pmId: Joi.string().allow("").allow(null).optional(),
        workOrderDate: Joi.string().allow("").allow(null).optional(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows;

      [total, rows] = await Promise.all([
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
            "task_group_schedule.pmId": payload.pmId,
            "task_group_schedule.orgId": req.orgId,
          })
          .whereRaw(
            `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${workOrderDate}'`
          ),
        knex
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
          .leftJoin(
            "asset_location",
            "asset_master.id",
            "asset_location.assetId"
          )
          .leftJoin("companies", "asset_location.companyId", "companies.id")
          .leftJoin("projects", "asset_location.projectId", "projects.id")
          .leftJoin(
            "buildings_and_phases",
            "asset_location.buildingId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "asset_location.floorId",
            "floor_and_zones.id"
          )
          .leftJoin(
            "property_units",
            "asset_location.unitId",
            "property_units.id"
          )
          .select([
            "task_group_schedule_assign_assets.id as workOrderId",
            "task_group_schedule_assign_assets.displayId as TGAA",
            "task_group_schedule_assign_assets.isActive as status",
            "task_group_schedule_assign_assets.status as Status",
            "task_group_schedule.id as id",
            "asset_master.assetName",
            "asset_master.model",
            "asset_master.assetSerial",
            "asset_master.id as assetId",
            "asset_master.assetCategoryId",
            "task_group_schedule_assign_assets.pmDate as pmDate",
            knex.raw(
              `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
            ),
            "task_group_schedule.repeatPeriod as repeatPeriod",
            "task_group_schedule.repeatOn as repeatOn",
            "task_group_schedule.repeatFrequency as repeatFrequency",
            "task_group_schedule_assign_assets.frequencyTagIds",
            // knex.raw(
            //   `("task_group_schedule_assign_assets"."frequencyTagIds"::text)`
            // ),
            "task_group_schedule_assign_assets.status",
            "task_group_schedule.taskGroupId",
            "buildings_and_phases.buildingPhaseCode",
            "floor_and_zones.floorZoneCode",
            "property_units.unitNumber",
          ])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            "task_group_schedule.orgId": req.orgId,
          })
          .whereRaw(
            `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${workOrderDate}'`
          )
          .orderBy("workOrderId", "asc"),
      ]);
      let count = total.length ? total[0].count : 0;
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
          taskGroupAssetPmsData: pagination,
        },
        message: "Task Group PMs Asset List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-task-group-asset-pms-list] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getWorkOrderList: async (req, res) => {
    try {
      let reqData = req.query;
      let payLoad = req.body;
      let workOrderDate = req.body.workOrderDate;
      let overDueStatus = req.body.overdue;
      let payloadFilter = req.body;
      let assignedTeam = [];

      if (payloadFilter.assignedTeam && payloadFilter.assignedTeam.length) {
        assignedTeam = payloadFilter.assignedTeam;
      }

      console.log("work order list data", req.body);

      const payload = _.omit(payLoad, [
        "assetCategoryId",
        "workOrderDate",
        "assetName",
        "assetSerial",
        "pmName",
        "status",
        "workOrderDateTo",
        "workOrderDateFrom",
        "assignedTeam",
        "repeatPeriod",
        "company",
        "overdue",
      ]);

      const accessibleProjects = req.userProjectResources[0].projects;

      const schema = Joi.object().keys({
        category: Joi.string().allow("").allow(null).optional(),
        workOrderId: Joi.string().allow("").allow(null).optional(),
        // workOrderDateTo:Joi.string().required(),
        // workOrderDateFrom: Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let total, rows;

      if (payloadFilter.assignedTeam && payloadFilter.assignedTeam.length) {
        [total, rows] = await Promise.all([
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
            .innerJoin(
              "pm_master2",
              "task_group_schedule.pmId",
              "pm_master2.id"
            )
            .leftJoin(
              "assigned_service_team",
              "task_group_schedule_assign_assets.id",
              "assigned_service_team.workOrderId"
            )
            .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
            .leftJoin("users", "assigned_service_team.userId", "users.id")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .where({
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }

              if (req.body.overdue && req.body.overdue != null) {
                qb.where(
                  "task_group_schedule_assign_assets.isOverdue",
                  req.body.overdue
                );
              }

              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDateTo && req.body.workOrderDateFrom) {
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD') BETWEEN '${req.body.workOrderDateFrom}' and '${req.body.workOrderDateTo}' `
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.pmName && req.body.pmName != null) {
                console.log("pm name", req.body.pmName);
                qb.where("pm_master2.name", "iLIKE", `%${req.body.pmName}%`);
              }
              if (req.body.status) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }

              if (payloadFilter.company) {
                if (payloadFilter.company.length) {
                  qb.whereIn("pm_master2.companyId", payloadFilter.company);
                }
              }

              if (payloadFilter.repeatPeriod) {
                if (payloadFilter.repeatPeriod.length) {
                  qb.whereIn(
                    "task_group_schedule.repeatPeriod",
                    payloadFilter.repeatPeriod
                  );
                }
              }

              if (payloadFilter.assignedTeam.length) {
                console.log("assigned team", payloadFilter.assignedTeam);
                qb.whereIn(
                  "assigned_service_team.teamId",
                  payloadFilter.assignedTeam
                );
              }
              qb.whereIn("pm_master2.projectId", accessibleProjects);

              qb.where({
                "assigned_service_team.entityType": "work_order",
              });
            }),
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
            .innerJoin(
              "pm_master2",
              "task_group_schedule.pmId",
              "pm_master2.id"
            )
            .leftJoin(
              "assigned_service_team",
              "task_group_schedule_assign_assets.id",
              "assigned_service_team.workOrderId"
            )
            .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
            .leftJoin("users", "assigned_service_team.userId", "users.id")
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "task_group_schedule_assign_assets.id as workOrderId",
              "task_group_schedule_assign_assets.displayId as TGAA",
              "task_group_schedule_assign_assets.isOverdue",
              "task_group_schedule.id as id",
              "asset_master.assetName as assetName",
              "asset_master.model as model",
              "asset_master.barcode as barcode",
              "asset_master.areaName as areaName",
              "asset_master.description as description",
              "asset_master.assetSerial as assetSerial",
              "asset_master.id as assetId",
              "asset_master.assetCategoryId",
              "pm_master2.name as pmName",
              "pm_master2.id as pmId",
              "task_group_schedule_assign_assets.pmDate as pmDate",
              knex.raw(
                `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
              ),
              "task_group_schedule.repeatPeriod as repeatPeriod",
              "task_group_schedule.repeatOn as repeatOn",
              "task_group_schedule.repeatFrequency as repeatFrequency",
              "task_group_schedule_assign_assets.frequencyTagIds",
              "task_group_schedule_assign_assets.status",
              "task_group_schedule_assign_assets.id",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",
              "assigned_service_team.teamId",
              "teams.teamName",
              "teams.description",
            ])
            .where({
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }

              if (req.body.overdue && req.body.overdue != null) {
                qb.where(
                  "task_group_schedule_assign_assets.isOverdue",
                  req.body.overdue
                );
              }
              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDateTo && req.body.workOrderDateFrom) {
                let workDateFrom = moment(req.body.workOrderDateFrom).startOf(
                  "date"
                );
                let workDateTo = moment(req.body.workOrderDateTo).endOf("date");
                console.log(
                  "work order date from and to",
                  req.body.workOrderDateTo,
                  workDateTo
                );
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD') BETWEEN '${req.body.workOrderDateFrom}' and '${req.body.workOrderDateTo}' `
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.pmName && req.body.pmName != null) {
                qb.where("pm_master2.name", "iLIKE", `%${req.body.pmName}%`);
              }
              if (req.body.status) {
                console.log("status of wo", req.body.status);
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }

              if (payloadFilter.company) {
                if (payloadFilter.company.length) {
                  qb.whereIn("pm_master2.companyId", payloadFilter.company);
                }
              }

              if (payloadFilter.repeatPeriod) {
                if (payloadFilter.repeatPeriod.length) {
                  qb.whereIn(
                    "task_group_schedule.repeatPeriod",
                    payloadFilter.repeatPeriod
                  );
                }
              }

              if (payloadFilter.assignedTeam.length) {
                qb.whereIn(
                  "assigned_service_team.teamId",
                  payloadFilter.assignedTeam
                );
              }
              qb.whereIn("pm_master2.projectId", accessibleProjects);

              qb.where({
                "assigned_service_team.entityType": "work_order",
              });
            })
            .offset(offset)
            .limit(per_page)
            .orderBy("workOrderDate", "asc"),
        ]);
      } else {
        [total, rows] = await Promise.all([
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
            .innerJoin(
              "pm_master2",
              "task_group_schedule.pmId",
              "pm_master2.id"
            )
            .where({
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }

              if (req.body.overdue && req.body.overdue != null) {
                qb.where(
                  "task_group_schedule_assign_assets.isOverdue",
                  req.body.overdue
                );
              }

              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDateTo && req.body.workOrderDateFrom) {
                let workDateFrom = moment(req.body.workOrderDateFrom).startOf(
                  "date"
                );
                let workDateTo = moment(req.body.workOrderDateTo).endOf("date");
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD') BETWEEN '${req.body.workOrderDateFrom}' and '${req.body.workOrderDateTo}' `
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                console.log("Asset name");
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.pmName && req.body.pmName != null) {
                console.log("pm name", req.body.pmName);
                qb.where("pm_master2.name", "iLIKE", `%${req.body.pmName}%`);
              }
              if (req.body.status) {
                console.log("status of wo", req.body.status);
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }

              if (payloadFilter.company) {
                if (payloadFilter.company.length) {
                  qb.whereIn("pm_master2.companyId", payloadFilter.company);
                }
              }

              if (payloadFilter.repeatPeriod) {
                if (payloadFilter.repeatPeriod.length) {
                  qb.whereIn(
                    "task_group_schedule.repeatPeriod",
                    payloadFilter.repeatPeriod
                  );
                }
              }
              qb.whereIn("pm_master2.projectId", accessibleProjects);
            }),
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
            .innerJoin(
              "pm_master2",
              "task_group_schedule.pmId",
              "pm_master2.id"
            )
            .leftJoin(
              "asset_location",
              "asset_master.id",
              "asset_location.assetId"
            )
            .leftJoin("companies", "asset_location.companyId", "companies.id")
            .leftJoin("projects", "asset_location.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "asset_location.buildingId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "asset_location.floorId",
              "floor_and_zones.id"
            )
            .leftJoin(
              "property_units",
              "asset_location.unitId",
              "property_units.id"
            )
            .select([
              "task_group_schedule_assign_assets.id as workOrderId",
              "task_group_schedule_assign_assets.displayId as TGAA",
              "task_group_schedule_assign_assets.isOverdue",
              "task_group_schedule.id as id",
              "asset_master.assetName as assetName",
              "asset_master.model as model",
              "asset_master.barcode as barcode",
              "asset_master.areaName as areaName",
              "asset_master.description as description",
              "asset_master.assetSerial as assetSerial",
              "asset_master.id as assetId",
              "asset_master.assetCategoryId",
              "pm_master2.name as pmName",
              "pm_master2.id as pmId",
              "task_group_schedule_assign_assets.pmDate as pmDate",
              knex.raw(
                `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
              ),
              "task_group_schedule.repeatPeriod as repeatPeriod",
              "task_group_schedule.repeatOn as repeatOn",
              "task_group_schedule.repeatFrequency as repeatFrequency",
              "task_group_schedule_assign_assets.frequencyTagIds",
              "task_group_schedule_assign_assets.status",
              "buildings_and_phases.buildingPhaseCode",
              "floor_and_zones.floorZoneCode",
              "property_units.unitNumber",
            ])
            .where({
              "task_group_schedule.orgId": req.orgId,
            })
            .where((qb) => {
              if (payload.workOrderId && payload.workOrderId != null) {
                qb.where(
                  "task_group_schedule_assign_assets.displayId",
                  payload.workOrderId
                );
              }

              if (req.body.overdue && req.body.overdue != null) {
                qb.where(
                  "task_group_schedule_assign_assets.isOverdue",
                  req.body.overdue
                );
              }

              if (
                req.body.assetCategoryId &&
                req.body.assetCategoryId.length > 0
              ) {
                qb.whereIn(
                  "asset_master.assetCategoryId",
                  req.body.assetCategoryId
                );
              }
              if (req.body.workOrderDateTo && req.body.workOrderDateFrom) {
                let workDateFrom = moment(req.body.workOrderDateFrom).startOf(
                  "date"
                );
                let workDateTo = moment(req.body.workOrderDateTo).endOf("date");
                console.log(
                  "work order date from and to",
                  req.body.workOrderDateTo,
                  workDateTo
                );
                qb.whereRaw(
                  `to_date(task_group_schedule_assign_assets."pmDate",  'YYYY-MM-DD') BETWEEN '${req.body.workOrderDateFrom}' and '${req.body.workOrderDateTo}'`
                );
              }
              if (req.body.assetName && req.body.assetName.length > 0) {
                qb.whereIn(
                  "task_group_schedule_assign_assets.assetId",
                  req.body.assetName
                );
              }
              if (req.body.assetSerial && req.body.assetSerial.length > 0) {
                qb.whereIn("asset_master.id", req.body.assetSerial);
              }
              if (req.body.pmName && req.body.pmName != null) {
                qb.where("pm_master2.name", "iLIKE", `%${req.body.pmName}%`);
              }
              if (req.body.status) {
                console.log("status of wo", req.body.status);
                qb.whereIn(
                  "task_group_schedule_assign_assets.status",
                  req.body.status
                );
              }
              if (payloadFilter.company) {
                if (payloadFilter.company.length) {
                  qb.whereIn("pm_master2.companyId", payloadFilter.company);
                }
              }

              if (payloadFilter.repeatPeriod) {
                if (payloadFilter.repeatPeriod.length) {
                  qb.whereIn(
                    "task_group_schedule.repeatPeriod",
                    payloadFilter.repeatPeriod
                  );
                }
              }
              qb.whereIn("pm_master2.projectId", accessibleProjects);
            })
            .offset(offset)
            .limit(per_page)
            .orderBy("workOrderDate", "asc"),
        ]);
      }

      const Parallel = require("async-parallel");

      rows = await Parallel.map(rows, async (row) => {
        console.log("team called");
        const teamData = await knex
          .from("assigned_service_team")
          .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
          .leftJoin("users", "assigned_service_team.userId", "users.id")
          .select([
            "assigned_service_team.teamId",
            "teams.teamName",
            "teams.description",
            "users.userName",
          ])
          .where({
            "assigned_service_team.entityId": row.workOrderId,
            "assigned_service_team.entityType": "work_order",
          })
          .where((qb) => {
            if (req.body.assignedTeam) {
              qb.whereIn("assigned_service_team.teamId", req.body.assignedTeam);
            }
          })
          .first();
        return { ...row, ...teamData };
      });

      console.log("total rows====>>>", total);
      let count = total.length ? total[0].count : 0;
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
          taskGroupAssetPmsData: pagination,
        },
        total,
        message: "Task Group PMs Asset List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-task-group-asset-pms-list] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getTaskGroupAssetPmsListOnToday: async (req, res) => {
    try {
      let reqData = req.query;
      let payload = req.body;

      const schema = Joi.object().keys({
        // taskGroupId: Joi.string().required(),
        pmId: Joi.string().required(),
        // pmDate:Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      await knex("task_group_schedule_assign_assets")
        .update({ isActive: true })
        .where({ isActive: true });

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
            "task_group_schedule_assign_assets.displayId as TGAA",
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
            "task_group_schedule.repeatFrequency as repeatFrequency",
          ])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            // 'task_group_schedule_assign_assets.pmDate':payload.pmDate })
          })
          .whereRaw(
            `DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`
          ),
        // knex.count('* as count').from("task_group_schedule")
        //   .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        //   .innerJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id'),
        // .where({ "task_group_stask_group_schedule_assign_assetschedule.taskGroupId": payload.taskGroupId }),
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
            "task_group_schedule_assign_assets.displayId as TGAA",
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
            "task_group_schedule.frequencyTagIds",
            "task_group_schedule.repeatFrequency as repeatFrequency",
          ])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            "task_group_schedule.orgId": req.orgId,
          })
          .whereRaw(
            `DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`
          )
          .offset(offset)
          .limit(per_page),
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
          taskGroupAssetPmsData: pagination,
        },
        message: "Task Group PMs Asset List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-task-group-asset-pms-list] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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

      let payload = _.omit(req.body, ["additionalUsers"]);

      const schema = Joi.object().keys({
        pmId: Joi.string().required(),
        assetCategoryId: Joi.string().required(),
        taskTemplateName: Joi.string().required(),
        // tasks: Joi.array().items(Joi.object()).strict().required(),
        startDateTime: Joi.date().allow("").allow(null).optional(),
        endDateTime: Joi.date().allow("").allow(null).optional(),
        repeatPeriod: Joi.string().allow("").allow(null).optional(),
        repeatFrequency: Joi.string().allow("").allow(null).optional(),
        teamId: Joi.string().allow("").allow(null).optional(),
        mainUserId: Joi.string().allow("").allow(null).optional(),
        // additionalUsers: Joi.array().items(Joi.string().required()).strict().required(),
      });

      const result = Joi.validate(
        _.omit(payload, ["repeatOn", "tasks"]),
        schema
      );
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      await knex.transaction(async (trx) => {
        let currentTime = new Date().getTime();
        // CREATE TASK TEMPLATE OPEN
        let insertTemplateData = {
          pmId: payload.pmId,
          assetCategoryId: payload.assetCategoryId,
          taskGroupName: payload.taskTemplateName,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        };

        let insertTemplateResult = await knex
          .insert(insertTemplateData)
          .returning(["*"])
          .transacting(trx)
          .into("task_group_templates");
        createTemplate = insertTemplateResult[0];
        // CREATE TASK TEMPLATE CLOSE

        // CREATE TASK TEMPLATE OPEN
        let tasksInsertPayload = req.body.tasks.map((da) => ({
          taskName: da.taskName,
          taskNameAlternate: da.taskNameAlternate,
          taskSerialNumber: da.taskSerialNumber ? da.taskSerialNumber : "",
          templateId: createTemplate.id,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: req.orgId,
        }));

        let insertTemplateTaskResult = await knex
          .insert(tasksInsertPayload)
          .returning(["*"])
          .transacting(trx)
          .into("template_task");
        createTemplateTask = _.orderBy(
          insertTemplateTaskResult,
          "taskSerialNumber",
          "asc"
        );

        // CREATE TASK TEMPLATE CLOSE

        // TASK GROUP SCHEDULE OPEN

        if (
          payload.startDateTime &&
          payload.endDateTime &&
          payload.repeatPeriod
        ) {
          let insertScheduleData = {
            taskGroupId: createTemplate.id,
            pmId: payload.pmId,
            startDate: payload.startDateTime,
            endDate: payload.endDateTime,
            repeatPeriod: payload.repeatPeriod,
            repeatOn: payload.repeatOn.length ? payload.repeatOn.join(",") : [],
            repeatFrequency: payload.repeatFrequency,

            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          let scheduleResult = await knex
            .insert(insertScheduleData)
            .returning(["*"])
            .transacting(trx)
            .into("task_group_template_schedule");
          taskSchedule = scheduleResult[0];
        }
        // TASK GROUP SCHEDULE CLOSE

        if (req.body.additionalUsers && req.body.additionalUsers.length) {
          // ASSIGNED ADDITIONAL USER OPEN
          let insertAssignedAdditionalUserData = req.body.additionalUsers.map(
            (user) => ({
              userId: user,
              entityId: createTemplate.id,
              entityType: "task_group_templates",
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
            })
          );

          let assignedAdditionalUserResult = await knex
            .insert(insertAssignedAdditionalUserData)
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_additional_users");
          assignedAdditionalUser = assignedAdditionalUserResult;
        }

        // ASSIGNED ADDITIONAL USER CLOSE

        // ASSIGNED TEAM OPEN

        if (payload.teamId && payload.mainUserId && createTemplate.id) {
          let insertAssignedServiceTeamData = {
            teamId: payload.teamId,
            userId: payload.mainUserId,
            entityId: createTemplate.id,
            entityType: "task_group_templates",
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          let assignedServiceTeamResult = await knex
            .insert(insertAssignedServiceTeamData)
            .returning(["*"])
            .transacting(trx)
            .into("assigned_service_team");
          assignedServiceTeam = assignedServiceTeamResult[0];
        }

        // ASSIGNED TEAM CLOSE
      });

      return res.status(200).json({
        data: {
          templateData: createTemplate,
          taskTemplateData: createTemplateTask,
          taskScheduleData: taskSchedule,
          assignedAdditionalUserData: assignedAdditionalUser,
          assignedServiceTeamData: assignedServiceTeam,
        },
        message: "Task Template Created Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][create-task-template] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // GET TASK TEMPLATE LIST
  getTaskTemplateList: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let templateResult = await knex("task_group_templates")
        .returning("*")
        .where({
          assetCategoryId: payload.assetCategoryId,
          "task_group_templates.orgId": req.orgId,
        });

      res.status(200).json({
        data: {
          taskTemplateData: templateResult,
        },
        message: "Task Template List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-task-template-list] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // GET TASK TEMPLATE COMPLATE DATA LIST
  getTaskTemplateComplateList: async (req, res) => {
    try {
      let reqData = req.query;
      let payload = req.body;
      let assignedPart = [];

      const schema = Joi.object().keys({
        templateId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
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
          .from("task_group_templates")
          .leftJoin(
            "template_task",
            "task_group_templates.id",
            "template_task.templateId"
          )
          .leftJoin(
            "task_group_template_schedule",
            "task_group_templates.id",
            "task_group_template_schedule.taskGroupId"
          )
          //.leftJoin('assigned_service_team', 'task_group_templates.id', 'assigned_service_team.entityId')
          //.leftJoin('assigned_service_additional_users', 'task_group_templates.id', 'assigned_service_additional_users.entityId')
          .where({
            "task_group_templates.id": payload.templateId,
            "task_group_templates.orgId": req.orgId,
          }),
        //.where({ "task_group_templates.id": payload.templateId, 'assigned_service_team.entityType': 'task_group_templates', 'assigned_service_additional_users.entityType': 'task_group_templates', 'task_group_templates.orgId': req.orgId }),
        //.offset(offset).limit(per_page),
        knex("task_group_templates")
          .leftJoin(
            "template_task",
            "task_group_templates.id",
            "template_task.templateId"
          )
          .leftJoin(
            "task_group_template_schedule",
            "task_group_templates.id",
            "task_group_template_schedule.taskGroupId"
          )
          //.leftJoin('assigned_service_team', 'task_group_templates.id', 'assigned_service_team.entityId')
          //.leftJoin('assigned_service_additional_users', 'task_group_templates.id', 'assigned_service_additional_users.entityId')
          .select([
            //'assigned_service_additional_users.userId as additional_user',
            "task_group_templates.*",
            "template_task.*",
            "task_group_template_schedule.*",
            //'template_task.id as taskId'
            //'assigned_service_team.*'
          ])
          .where({
            "task_group_templates.id": payload.templateId,
            "task_group_templates.orgId": req.orgId,
          })
          //.where({ "task_group_templates.id": payload.templateId, 'assigned_service_team.entityType': 'task_group_templates', 'assigned_service_additional_users.entityType': 'task_group_templates', "task_group_templates.orgId": req.orgId })
          .orderBy("template_task.taskSerialNumber", "asc"),
        // .offset(offset).limit(per_page)
      ]);

      let count = total[0].count;
      pagination.total = count;
      pagination.per_page = per_page;
      pagination.offset = offset;
      pagination.to = offset + rows.length;
      pagination.last_page = Math.ceil(count / per_page);
      pagination.current_page = page;
      pagination.from = offset;
      pagination.data = _.uniqBy(rows, "taskName");

      const Parallel = require("async-parallel");
      pagination.data = await Parallel.map(
        _.uniqBy(rows, "taskName"),
        async (row) => {
          //return row;

          let teamResult = await knex("assigned_service_team")
            .where({
              "assigned_service_team.entityId": payload.templateId,
              "assigned_service_team.entityType": "task_group_templates",
            })
            .first();
          let addUser = await knex("assigned_service_additional_users")
            .select(
              "assigned_service_additional_users.userId as additional_user"
            )
            .where({
              "assigned_service_additional_users.entityId": payload.templateId,
              "assigned_service_additional_users.entityType":
                "task_group_templates",
            })
            .first();

          let id;
          let teamId = null;
          let userId = null;
          let entityId = null;
          let entityType = null;
          let additional_user = null;
          if (teamResult) {
            id = teamResult.id;
            teamId = teamResult.teamId;
            userId = teamResult.userId;
            entityId = teamResult.entityId;
            entityType = teamResult.entityType;
          }
          if (addUser) {
            additional_user = addUser.additional_user;
          }

          return {
            ...row,
            id,
            teamId,
            userId,
            entityId,
            entityType,
            additional_user,
          };
        }
      );

      /*GET ADDITIONAL USER OPEN */
      let userResult = [];
      let additionalResult = await knex("assigned_service_additional_users")
        .select("assigned_service_additional_users.userId as additional_user")
        .where({
          "assigned_service_additional_users.entityId": payload.templateId,
          "assigned_service_additional_users.entityType":
            "task_group_templates",
          "assigned_service_additional_users.orgId": req.orgId,
        });
      userResult = _.uniqBy(additionalResult, "additional_user");
      /*GET ADDITIONAL USER CLOSE */

      let templateTask = await knex("template_task")
        .where({ templateId: payload.templateId, orgId: req.orgId })
        .orderBy("taskSerialNumber", "asc");

      // let i = 0;
      // let assignedPart = await Parallel.map(templateTask, async data => {

      //   index = i;
      //   i++;
      //   let partResult = await knex('task_assigned_part')
      //     .leftJoin('part_master', 'task_assigned_part.partId', 'part_master.id')
      //     .select([
      //       'task_assigned_part.*',
      //       'part_master.partName'

      //     ])
      //     .where({ 'task_assigned_part.taskId': data.id, 'task_assigned_part.orgId': req.orgId });

      //   return {
      //     ...partResult,
      //     index: index
      //   }

      // })

      for (let task of templateTask) {
        let partResult = await knex("task_assigned_part")
          .leftJoin(
            "part_master",
            "task_assigned_part.partId",
            "part_master.id"
          )
          .select(["task_assigned_part.*", "part_master.partName"])
          .where({
            "task_assigned_part.taskId": task.id,
            "task_assigned_part.orgId": req.orgId,
          });
        if (partResult.length) {
          assignedPart.push(partResult);
        } else {
          assignedPart.push([]);
        }
      }

      return res.status(200).json({
        data: {
          taskTemplateCompleteData: pagination,
          assignedPart,
          userResult,
        },
        message: "Task Template Complete Data List Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-task-group-asset-pms-list] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // GET TASK GROUP ASSET PM DETAILS
  getTaskgroupAssetPmDetails: async (req, res) => {
    try {
      let payload = req.body;
      console.log("payload data in PM details", payload);

      const schema = Joi.object().keys({
        taskGroupScheduleId: Joi.string().required(),
        taskGroupScheduleAssignAssetId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      const pmResult2 = await knex("task_group_schedule")
        .leftJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .leftJoin(
          "asset_master",
          "task_group_schedule_assign_assets.assetId",
          "asset_master.id"
        )
        .leftJoin("asset_location", "asset_master.id", "asset_location.assetId")
        .leftJoin("companies", "asset_location.companyId", "companies.id")
        .leftJoin("projects", "asset_location.projectId", "projects.id")
        .leftJoin(
          "buildings_and_phases",
          "asset_location.buildingId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "asset_location.floorId",
          "floor_and_zones.id"
        )
        .leftJoin(
          "property_units",
          "asset_location.unitId",
          "property_units.id"
        )
        .leftJoin("pm_master2", "task_group_schedule.pmId", "pm_master2.id")
        .leftJoin(
          "asset_category_master",
          "pm_master2.assetCategoryId",
          "asset_category_master.id"
        )
        .leftJoin(
          "pm_task_groups",
          "task_group_schedule.taskGroupId",
          "pm_task_groups.id"
        )
        .leftJoin(
          "assigned_service_team",
          "task_group_schedule_assign_assets.id",
          "assigned_service_team.entityId"
        )
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .leftJoin("users", "assigned_service_team.userId", "users.id")
        .select([
          "task_group_schedule.id as id",
          "task_group_schedule_assign_assets.id as taskGroupScheduleAssignAssetId",
          "task_group_schedule.taskGroupId",
          "pm_master2.name as pmName",
          "asset_category_master.categoryName as assetCategoryName",
          "pm_task_groups.taskGroupName as taskGroupName",
          "asset_master.assetName as assetName",
          "asset_master.id as assetId",
          "asset_master.barcode as barCode",
          "asset_master.areaName as areaName",
          "asset_master.model as modelNo",
          "asset_master.assetSerial",
          "asset_master.assetCode",
          "companies.logoFile",
          "companies.companyAddressEng",
          "task_group_schedule.startDate as startDate",
          "task_group_schedule.endDate as endDate",
          "task_group_schedule.repeatFrequency as repeatFrequency",
          "task_group_schedule.repeatOn as repeatOn",
          "task_group_schedule.repeatPeriod",
          "teams.teamName as teamName",
          "assigned_service_team.userId as mainUserId",
          "users.name as mainUser",
          "task_group_schedule_assign_assets.pmDate as pmDate",
          "task_group_schedule_assign_assets.displayId",
          "task_group_schedule_assign_assets.status as woStatus",
          "task_group_schedule_assign_assets.id as workOrderId",
          "companies.taxId",
          "companies.telephone",
        ])
        .where({
          "task_group_schedule_assign_assets.id":
            payload.taskGroupScheduleAssignAssetId,
          "assigned_service_team.entityType": "work_order",
          "task_group_schedule_assign_assets.orgId": req.orgId,
        });

      /// Update by Deepak Tiwari
      console.log("Details for team user", pmResult2);

      const Parallel = require("async-parallel");
      const pmResult = await Parallel.map(pmResult2, async (row) => {
        console.log("rows", row);

        const location = await knex("asset_location")
          .innerJoin("companies", "asset_location.companyId", "companies.id")
          .innerJoin("projects", "asset_location.projectId", "projects.id")
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
            "companies.companyName",
            "companies.companyId",
            "projects.projectName",
            "projects.project as projectCode",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "floor_and_zones.floorZoneCode",
            "floor_and_zones.description as floorDescription",
            "property_units.unitNumber",
          ])
          .where({ "asset_location.assetId": row.assetId })
          .orderBy("asset_location", "desc")
          .limit("1")
          .first();
        // ]).max('asset_location.updatedAt').first()
        return { ...row, ...location };
      });

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
        additionalUsers = await knex("assigned_service_additional_users")
          .innerJoin(
            "users",
            "assigned_service_additional_users.userId",
            "users.id"
          )
          .select([
            "users.id as additionalUserId",
            "users.name as additionalUser",
          ])
          .where({
            "assigned_service_additional_users.entityType": "work_order",
            "assigned_service_additional_users.entityId":
              pmResult[0].workOrderId,
            "assigned_service_additional_users.orgId": req.orgId,
          });

        // ADDITIONAL USER CLOSE
      }

      // TASK OPEN
      tasks = await knex("pm_task")
        .leftJoin(
          "service_status AS status",
          "pm_task.status",
          "status.statusCode"
        )
        .leftJoin("task_feedbacks", "pm_task.id", "task_feedbacks.taskId")
        .leftJoin(
          "task_group_schedule",
          "pm_task.taskGroupId",
          "task_group_schedule.taskGroupId"
        )
        .select([
          "pm_task.id as taskId",
          "pm_task.taskName as taskName",
          "status.descriptionEng as status",
          "status.statusCode",
          "pm_task.taskNameAlternate",
          "pm_task.taskSerialNumber",
          "pm_task.result",
          "task_feedbacks.description as feedbackDescription",
          "pm_task.duration",
          "pm_task.hourlyRate",
          "pm_task.taskMode",
          "pm_task.taskGroupId",
          "pm_task.repeatFrequencyId",
        ])
        .where({
          "pm_task.taskGroupScheduleAssignAssetId":
            payload.taskGroupScheduleAssignAssetId,
          "pm_task.orgId": req.orgId,
        })
        .orderBy("pm_task.repeatFrequencyId", "asc");

      tasks = tasks.map((v) => {
        let standardCost = 0;
        standardCost = Number(v.duration) * Number(v.hourlyRate);

        return {
          ...v,
          standardCost,
        };
      });

      //  tasks = await Parallel.map(tasks , async task =>{
      //     const taskRepeatFrequency = await knex('task_group_schedule')
      //     .select('task_group_schedule.repeatFrequency')
      //     .where({'task_group_schedule.taskGroupId':task.taskGroupId})

      //     return {...task ,taskRepeatFrequency}
      // })

      // let statuses = tasks.filter(t => t.status !== "CMTD")
      // if (statuses.length === 0) {
      //   status = 'complete'
      // } else {
      //   status = 'incomplete'
      // }
      // TASK CLOSE
      let meData = req.me;

      return res.status(200).json({
        data: {
          taskGroupPmAssetDatails: _.uniqBy(pmResult, "id"),
          additionalUsers: additionalUsers,
          tasks: _.uniqBy(tasks, "taskId"),
          printedBy: meData,
        },
        message: "Task Group Asset PM Details Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-asset-pm-details] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getTaskgroupAssetPmDetails1: async (req, res) => {
    try {
      let payload = req.body;

      console.log("work order date in req", req.body.workOrderDate);
      const schema = Joi.object().keys({
        taskGroupScheduleId: Joi.string().required(),
        taskGroupScheduleAssignAssetId: Joi.string().required(),
        // workOrderDate : Joi.string().required(),
        // pmId : Joi.string().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      // let woDate = payload.workOrderDate

      const pmResult2 = await knex("task_group_schedule")
        .leftJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .leftJoin(
          "asset_master",
          "task_group_schedule_assign_assets.assetId",
          "asset_master.id"
        )
        .leftJoin("asset_location", "asset_master.id", "asset_location.assetId")
        .leftJoin("companies", "asset_location.companyId", "companies.id")
        .leftJoin("projects", "asset_location.projectId", "projects.id")
        .leftJoin(
          "buildings_and_phases",
          "asset_location.buildingId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "asset_location.floorId",
          "floor_and_zones.id"
        )
        .leftJoin(
          "property_units",
          "asset_location.unitId",
          "property_units.id"
        )
        .leftJoin("pm_master2", "task_group_schedule.pmId", "pm_master2.id")
        .leftJoin(
          "asset_category_master",
          "pm_master2.assetCategoryId",
          "asset_category_master.id"
        )
        .leftJoin(
          "pm_task_groups",
          "task_group_schedule.taskGroupId",
          "pm_task_groups.id"
        )
        .leftJoin(
          "assigned_service_team",
          "pm_task_groups.id",
          "assigned_service_team.entityId"
        )
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .leftJoin("users", "assigned_service_team.userId", "users.id")
        .select([
          "task_group_schedule.id as id",
          "task_group_schedule_assign_assets.id as taskGroupScheduleAssignAssetId",
          "task_group_schedule.taskGroupId",
          "pm_master2.name as pmName",
          "asset_category_master.categoryName as assetCategoryName",
          "pm_task_groups.taskGroupName as taskGroupName",
          "asset_master.assetName as assetName",
          "asset_master.id as assetId",
          "asset_master.barcode as barCode",
          "asset_master.areaName as areaName",
          "asset_master.model as modelNo",
          "asset_master.assetSerial",
          "asset_master.assetCode",
          "companies.logoFile",
          "companies.companyAddressEng",
          // 'projects.projectName',
          // 'buildings_and_phases.buildingPhaseCode',
          // 'floor_and_zones.floorZoneCode',
          // 'property_units.unitNumber',
          "task_group_schedule.startDate as startDate",
          "task_group_schedule.endDate as endDate",
          "task_group_schedule.repeatFrequency as repeatFrequency",
          "task_group_schedule.repeatOn as repeatOn",
          "task_group_schedule.repeatPeriod",
          "teams.teamName as teamName",
          "assigned_service_team.userId as mainUserId",
          "users.name as mainUser",
          "task_group_schedule_assign_assets.pmDate as pmDate",
          "task_group_schedule_assign_assets.displayId",
          "task_group_schedule_assign_assets.status as woStatus",
        ])
        .where({
          // 'pm_master2.id':payload.pmId,
          // 'task_group_schedule_assign_assets.pmDate':req.workOrderDate,
          "task_group_schedule.id": payload.taskGroupScheduleId,
          "task_group_schedule_assign_assets.id":
            payload.taskGroupScheduleAssignAssetId,
          //'task_group_schedule.taskGroupId':payload.taskGroupId,
          "assigned_service_team.entityType": "work_order",
          "task_group_schedule.orgId": req.orgId,
        });
      // .where(knex.raw('"asset_location"."updatedAt" = (select max("updatedAt") from asset_location)'))

      /// Update by Deepak Tiwari

      const Parallel = require("async-parallel");
      const pmResult = await Parallel.map(pmResult2, async (row) => {
        console.log("rows", row);

        const location = await knex("asset_location")
          .innerJoin("companies", "asset_location.companyId", "companies.id")
          .innerJoin("projects", "asset_location.projectId", "projects.id")
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
            "companies.companyName",
            "companies.companyId",
            "projects.projectName",
            "projects.project as projectCode",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "floor_and_zones.floorZoneCode",
            "floor_and_zones.description as floorDescription",
            "property_units.unitNumber",
          ])
          .where({ "asset_location.assetId": row.assetId })
          .orderBy("asset_location", "desc")
          .limit("1")
          .first();
        // ]).max('asset_location.updatedAt').first()
        return { ...row, ...location };
      });

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
        additionalUsers = await knex("assigned_service_additional_users")
          .innerJoin(
            "users",
            "assigned_service_additional_users.userId",
            "users.id"
          )
          .select([
            "users.id as additionalUserId",
            "users.name as additionalUser",
          ])
          .where({
            "assigned_service_additional_users.entityType": "work_order",
            "assigned_service_additional_users.entityId":
              pmResult[0].taskGroupId,
            "assigned_service_additional_users.orgId": req.orgId,
          });

        // ADDITIONAL USER CLOSE
      }

      // TASK OPEN
      tasks = await knex("pm_task")
        .leftJoin(
          "service_status AS status",
          "pm_task.status",
          "status.statusCode"
        )
        .leftJoin("task_feedbacks", "pm_task.id", "task_feedbacks.taskId")
        .select([
          "pm_task.id as taskId",
          "pm_task.taskName as taskName",
          "status.descriptionEng as status",
          "status.statusCode",
          "pm_task.taskNameAlternate",
          "pm_task.taskSerialNumber",
          "pm_task.result",
          "task_feedbacks.description as feedbackDescription",
          "pm_task.duration",
          "pm_task.hourlyRate",
          "pm_task.taskMode",
          "pm_task.taskGroupId",
        ])
        .where({
          "pm_task.taskGroupScheduleAssignAssetId":
            payload.taskGroupScheduleAssignAssetId,
          "pm_task.orgId": req.orgId,
        })
        .orderBy("pm_task.taskSerialNumber", "asc");

      console.log("task group Id", tasks);

      tasks = tasks.map((v) => {
        let standardCost = 0;
        standardCost = Number(v.duration) * Number(v.hourlyRate);

        return {
          ...v,
          standardCost,
        };
      });

      // let statuses = tasks.filter(t => t.status !== "CMTD")
      // if (statuses.length === 0) {
      //   status = 'complete'
      // } else {
      //   status = 'incomplete'
      // }
      // TASK CLOSE
      let meData = req.me;

      return res.status(200).json({
        data: {
          taskGroupPmAssetDatails: _.uniqBy(pmResult, "id"),
          additionalUsers: additionalUsers,
          tasks: _.uniqBy(tasks, "taskId"),
          printedBy: meData,
        },
        message: "Task Group Asset PM Details Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-asset-pm-details] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // GET PM TASK DETAILS
  getPmTaskDetails: async (req, res) => {
    try {
      let { taskId, assetId, scheduleId, pmDate } = req.body;
      let payload = req.body;

      const schema = Joi.object().keys({
        taskId: Joi.string().required(),
        assetId: Joi.string().required(),
        scheduleId: Joi.string().required(),
        pmDate: Joi.date().required(),
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let taskDetails = await knex("pm_task")
        .innerJoin("pm_task_groups", "pm_task.taskGroupId", "pm_task_groups.id")
        .innerJoin("pm_master2", "pm_task_groups.pmId", "pm_master2.id")
        .innerJoin(
          "task_group_schedule",
          "pm_task_groups.id",
          "task_group_schedule.taskGroupId"
        )
        .innerJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .select([
          "pm_task.id as taskId",
          "pm_task.status as status",
          "pm_task.taskName as taskName",
          "pm_master2.name as pmName",
          "pm_task_groups.taskGroupName as taskGroupName",
          "pm_task_groups.id as taskGroupId",
          "task_group_schedule_assign_assets.pmDate as pmDate",
          "pm_task.taskNameAlternate as taskAlternateName",
          "task_group_schedule_assign_assets.status as woStatus",
        ])
        .where({
          "pm_task.id": taskId,
          "task_group_schedule.id": scheduleId,
          "task_group_schedule_assign_assets.scheduleId": scheduleId,
          "task_group_schedule_assign_assets.assetId": assetId,
          "task_group_schedule_assign_assets.pmDate": pmDate,
          "pm_task.orgId": req.orgId,
        });

      // GERERAL DETAILS OPEN
      let generalDetails = await knex("asset_location")
        .innerJoin("asset_master", "asset_location.assetId", "asset_master.id")
        .innerJoin("companies", "asset_location.companyId", "companies.id")
        .innerJoin(
          "property_units",
          "asset_location.unitId",
          "property_units.id"
        )
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
        .innerJoin("projects", "asset_location.projectId", "projects.id")
        .select([
          "asset_master.areaName as location",
          "companies.companyName as companyName",
          "property_units.unitNumber as unitNumber",
          "buildings_and_phases.buildingPhaseCode as buildingNumber",
          "floor_and_zones.floorZoneCode as floor",
          "projects.projectName as projectName",
        ])
        .where({
          "asset_location.assetId": assetId,
          "asset_location.orgId": req.orgId,
        });
      // GERERAL DETAILS CLOSE

      //IMAGES
      const images = await knex("images")
        .where({ entityId: taskId, entityType: "pm_task" })
        .select(["s3Url", "id"]);
      // IMAGES CLOSED

      return res.status(200).json({
        data: {
          pmTaskDetails: _.uniqBy(taskDetails, "pmDate"),
          generalDetails: generalDetails,
          images,
        },
        message: "PM Task Details Successfully! ",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
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
        userId: Joi.string().required(),
        cancelReason: Joi.string().allow("").allow(null).optional(),
        workOrderId: Joi.string().required(),
        workOrderDate: Joi.date().required(),
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      // Get all the tasks of the work order and check if those tasks have status cmtd
      // then
      let currentTime = new Date().getTime();
      // We need to check whther all the tasks have been updated or not
      let taskUpdated;
      if (payload.status === "COM") {
        // check id completedAt i.e current date is greater than pmDate then update completedAt and completedBy
        taskUpdated = await knex("pm_task")
          .update({
            status: payload.status,
            completedAt: currentTime,
            completedBy: payload.userId,
          })
          .where({
            taskGroupId: payload.taskGroupId,
            id: payload.taskId,
            orgId: req.orgId,
          })
          .returning(["*"]);

        let workResult = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
        });
        let workComplete = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
          status: "COM",
        });

        if (workResult.length == workComplete.length) {
          let scheduleStatus = null;

          let workDate = moment(payload.workOrderDate).format("YYYY-MM-DD");
          let currnetDate = moment().format("YYYY-MM-DD");
          if (workDate == currnetDate || workDate > currnetDate) {
            scheduleStatus = "on";
          } else if (workDate < currnetDate) {
            scheduleStatus = "off";
          }

          let workOrder = await knex("task_group_schedule_assign_assets")
            .update({
              status: payload.status,
              updatedAt: currentTime,
              scheduleStatus: scheduleStatus,
            })
            .where({ id: payload.workOrderId, orgId: req.orgId })
            .returning(["*"]);
        }
      } else {
        await knex("task_group_schedule_assign_assets")
          .update({ status: payload.status, updatedAt: currentTime })
          .where({ id: payload.workOrderId, orgId: req.orgId })
          .returning(["*"]);

        if (payload.status === "C") {
          taskUpdated = await knex("pm_task")
            .update({ status: payload.status, cancelReason: payload.status })
            .where({
              taskGroupId: payload.taskGroupId,
              id: payload.taskId,
              orgId: req.orgId,
            })
            .returning(["*"]);
        } else {
          taskUpdated = await knex("pm_task")
            .update({ status: payload.status })
            .where({
              taskGroupId: payload.taskGroupId,
              id: payload.taskId,
              orgId: req.orgId,
            })
            .returning(["*"]);
        }
      }

      return res.status(200).json({
        data: {
          taskUpdated,
        },
        message: "Task updated",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  sendFeedbackForTask: async (req, res) => {
    try {
      const payload = req.body;
      console.log("Payload Data", payload);

      const schema = Joi.object().keys({
        taskId: Joi.string().required(),
        taskGroupScheduleId: Joi.string().required(),
        taskGroupId: Joi.string().required(),
        assetId: Joi.string().required(),
        description: Joi.string().required(),
        //workOrderId: Joi.string().required()
      });
      const result = Joi.validate(payload[0], schema);

      if (payload[0].description.length == "") {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: "Add Atleast one feedback to save!",
            },
          ],
        });
      }

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      let curentTime = new Date().getTime();
      let fbs = req.body.map((v) => ({
        ...v,
        createdAt: curentTime,
        updatedAt: curentTime,
        orgId: req.orgId,
      }));
      const addedFeedback = await knex("task_feedbacks")
        .insert(fbs)
        .returning(["*"]);
      return res.status(200).json({
        data: {
          addedFeedback,
        },
        message: "Feedback added successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getFeedbacksOfTask: async (req, res) => {
    try {
      const { taskId } = req.body;
      const feedbacks = await knex("task_feedbacks")
        .select("*")
        .where({ taskId, orgId: req.orgId });
      return res.status(200).json({
        data: {
          feedbacks,
        },
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  editWorkOrder: async (req, res) => {
    try {
      const payload = req.body;
      let { workOrderId, teamId, additionalUsers, mainUserId, tasks } = payload;
      // First based on that workOrderId update tasks
      let updatedTasks = [];
      if (tasks && tasks.length) {
        for (let task of tasks) {
          updatedTask = await knex("pm_task")
            .update({
              taskName: task.taskName,
              taskSerialNumber: task.taskSerialNumber,
              taskNameAlternate: task.taskNameAlternate,
            })
            .where({
              taskGroupScheduleAssignAssetId: workOrderId,
              id: task.id,
              orgId: req.orgId,
            })
            .returning(["*"]);
          updatedTasks.push(updatedTask[0]);
        }
      }

      return res.status(200).json({
        data: {
          updatedTasks,
        },
        message: "Tasks updated!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getTaskGroupDetails: async (req, res) => {
    try {
      let taskGroupResult = await knex("task_group_templates")
        .leftJoin(
          "task_group_template_schedule",
          "task_group_templates.id",
          "task_group_template_schedule.taskGroupId"
        )
        .select([
          "task_group_templates.taskGroupName as taskGroupName",
          "task_group_templates.assetCategoryId as assetCategoryId",
          "task_group_template_schedule.startDate as startDate",
          "task_group_template_schedule.endDate as endDate",
          "task_group_template_schedule.repeatFrequency as repeatFrequency",
          "task_group_template_schedule.repeatPeriod as repeatPeriod",
          "task_group_template_schedule.repeatOn as repeatOn",
        ])
        .where({
          "task_group_templates.id": req.body.id,
          "task_group_templates.orgId": req.orgId,
        });
      let taskGroup = taskGroupResult[0];

      const tasks = await knex("template_task")
        .where({ templateId: req.body.id, orgId: req.orgId })
        .select(
          "taskName",
          "id",
          "taskNameAlternate",
          "taskSerialNumber",
          "duration",
          "hourlyRate"
        )
        .orderBy("taskSerialNumber", "asc");

      // const tasks2 = await knex('template_task').where({ templateId: req.body.id, orgId: req.orgId }).select('taskName', 'id', 'taskNameAlternate', 'taskSerialNumber')
      // .orderBy('id', 'asc');

      let assignedPart = [];

      for (let task of tasks) {
        let partResult = await knex("task_assigned_part")
          .leftJoin(
            "part_master",
            "task_assigned_part.partId",
            "part_master.id"
          )
          .select(["task_assigned_part.*", "part_master.partName"])
          .where({
            "task_assigned_part.taskId": task.id,
            "task_assigned_part.orgId": req.orgId,
          });
        if (partResult.length) {
          assignedPart.push(partResult);
        } else {
          assignedPart.push([]);
        }
      }

      // Get the team and main user
      let team = await knex("assigned_service_team")
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .leftJoin("users", "assigned_service_team.userId", "users.id")
        .where({
          "assigned_service_team.entityId": req.body.id,
          "assigned_service_team.entityType": "task_group_templates",
          "assigned_service_team.orgId": req.orgId,
        })
        .select([
          "teams.teamId as teamId",
          "assigned_service_team.userId as mainUserId",
        ]);

      const additionalUsers = await knex("assigned_service_additional_users")
        .leftJoin(
          "users",
          "assigned_service_additional_users.userId",
          "users.id"
        )
        .where({
          "assigned_service_additional_users.entityId": req.body.id,
          "assigned_service_additional_users.entityType":
            "task_group_templates",
          "assigned_service_additional_users.orgId": req.orgId,
        })
        .select(["users.id as id"]);

      return res.status(200).json({
        data: {
          ...taskGroup,
          tasks,
          ...team[0],
          additionalUsers: additionalUsers.map((v) => v.id),
          assignedPart,
        },
        message: "Task Group Details",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  updateTaskGroupDetails: async (req, res) => {
    try {
      let id = req.body.id;
      let payload = _.omit(req.body, [
        "id",
        "additionalUsers",
        "tasks",
        "taskGroupName",
        "assetCategoryId",
        "mainUserId",
        "teamId",
        "deletedTasks",
      ]);
      let tasks = req.body.tasks;
      let deletedTasks = req.body.deletedTasks;
      let additionalUsers = _.uniqBy(req.body.additionalUsers);
      let taskGroupCatId = req.body.assetCategoryId;
      let currentTime = new Date().getTime();
      let partResult = [];

      // Delete Tasks
      if (deletedTasks.length) {
        for (let task of deletedTasks) {
          if(task.id){
            let delTask = await knex("template_task")
            .where({ id: task.id })
            .del();
          }
         
        }
      }

      if (tasks.length) {
        for (let ta of tasks) {
          if (ta.id) {
            let delPart = await knex("task_assigned_part")
              .where({ taskId: ta.id, orgId: req.orgId })
              .del();
          }
        }
      }
     
      const templateExist = await knex("task_group_templates")
        .where("taskGroupName", "iLIKE", req.body.taskGroupName)
        .where("assetCategoryId", taskGroupCatId)
        .where({ orgId: req.orgId })
        .whereNot({ id });

      console.log(
        "[controllers][task-group][createTemplate]: ServiceCode",
        templateExist
      );

      if (templateExist && templateExist.length) {
        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Template already exist!!" },
          ],
        });
      }
      // Check duplicate value close

      let updatedTaskGroupTemplate = null;
      let resultScheduleData = "";
      let updatedTeam = "";
      let result = await knex("task_group_templates")
        .update({
          updatedAt: currentTime,
          taskGroupName: req.body.taskGroupName,
          assetCategoryId: req.body.assetCategoryId,
          orgId: req.orgId,
        })
        .where({ id })
        .returning("*");
      updatedTaskGroupTemplate = result[0];

      let checkScheduleData = await knex("task_group_template_schedule")
        .where({ taskGroupId: id, orgId: req.orgId })
        .first();

      if (checkScheduleData) {
        let resultSchedule = await knex("task_group_template_schedule")
          .update({
            ...payload,
            repeatOn: payload.repeatOn,
            updatedAt: currentTime,
          })
          .where({ taskGroupId: id, orgId: req.orgId })
          .returning("*");
        resultScheduleData = resultSchedule[0];
      } else {
        let insertResult = await knex("task_group_template_schedule")
          .insert({
            ...payload,
            repeatOn: payload.repeatOn,
            taskGroupId: id,
            orgId: req.orgId,
            createdAt: currentTime,
            updatedAt: currentTime,
          })
          .returning("*");
        resultScheduleData = insertResult[0];
      }

      let updatedTasks = [];
      let updatedUsers = [];
      let deletedUser = [];
      let updatedTaskResult;
      for (let task of tasks) {
        if (task.id) {
          updatedTaskResult = await knex("template_task")
            .update({
              taskName: task.taskName,
              taskNameAlternate: task.taskNameAlternate,
              taskSerialNumber: task.taskSerialNumber,
              duration: task.duration,
              hourlyRate: task.hourlyRate,
            })
            .where({
              templateId: id,
              id: task.id,
              orgId: req.orgId,
            })
            .returning("*");
          updatedTasks.push(updatedTaskResult[0]);

          if (task.linkedParts == undefined) {
          } else {
            for (let part of task.linkedParts) {
              let partPayload = {
                taskId: task.id,
                partId: part.partId,
                quantity: part.quantity,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
                //workOrderId: assetResult[0].id
              };

              // let check = await knex.from('task_assigned_part').where({
              //   taskId: task.id,
              //   partId: part.partId,
              //   quantity: part.quantity,
              //   orgId: req.orgId,
              // })

              // if (check && check.length) {

              // } else {

              let insertPartResult = await knex
                .insert(partPayload)
                .returning(["*"])
                .into("task_assigned_part");

              partResult.push(insertPartResult);
              //            }
            }
          }
        } else {
          updatedTaskResult = await knex("template_task")
            .insert({
              taskName: task.taskName,
              taskNameAlternate: task.taskNameAlternate,
              taskSerialNumber: task.taskSerialNumber,
              templateId: id,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: req.orgId,
              duration: task.duration ? task.duration: 0.0 ,
              hourlyRate: task.hourlyRate ? task.hourlyRate: 0.0 ,
            })
            .returning("*");
          updatedTasks.push(updatedTaskResult[0]);

          if (task.linkedParts == undefined) {
          } else {
            for (let part of task.linkedParts) {
              let partPayload = {
                taskId: updatedTaskResult[0].id,
                partId: part.partId,
                quantity: part.quantity,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: req.orgId,
                //workOrderId: assetResult[0].id
              };

              // let check = await knex.from('task_assigned_part').where({
              //   taskId: task.id,
              //   partId: part.partId,
              //   quantity: part.quantity,
              //   orgId: req.orgId,
              // })

              // if (check && check.length) {

              // } else {

              let insertPartResult = await knex
                .insert(partPayload)
                .returning(["*"])
                .into("task_assigned_part");

              partResult.push(insertPartResult);
              //            }
            }
          }
        }
      }

      // If already exists then upldate otherwise insert
      let checkExistsAU = await knex("assigned_service_additional_users")
        .select("id")
        .where({
          entityId: id,
          entityType: "task_group_templates",
          orgId: req.orgId,
        });
      if (checkExistsAU && checkExistsAU.length) {
        for (let i of checkExistsAU) {
          let delUser = await knex("assigned_service_additional_users")
            .where({
              entityId: id,
              entityType: "task_group_templates",
              orgId: req.orgId,
              id: i.id,
            })
            .del();
          deletedUser.push(delUser);
        }
        for (let additionalUser of additionalUsers) {
          let updated = await knex("assigned_service_additional_users")
            .insert({
              userId: additionalUser,
              entityId: id,
              entityType: "task_group_templates",
              orgId: req.orgId,
              updatedAt: currentTime,
            })
            .returning(["*"]);
          updatedUsers.push(updated[0]);
        }
      } else {
        for (let additionalUser of additionalUsers) {
          let updated = await knex("assigned_service_additional_users")
            .insert({
              userId: additionalUser,
              entityId: id,
              entityType: "task_group_templates",
              orgId: req.orgId,
              createdAt: currentTime,
            })
            .returning(["*"]);
          updatedUsers.push(updated[0]);
        }
      }

      // let updatedTeamResult = await knex('assigned_service_team').update({ teamId: req.body.teamId ? req.body.teamId : null, userId: req.body.mainUserId ? req.body.mainUserId : null }).returning('*')
      // updatedTeam = updatedTeamResult[0]

      if (req.body.teamId && req.body.mainUserId) {
        let checkTeamMainUser = await knex("assigned_service_team")
          .where({
            entityId: id,
            entityType: "task_group_templates",
            orgId: req.orgId,
          })
          .returning("*")
          .first();

        if (checkTeamMainUser) {
          let updatedTeamResult = await knex("assigned_service_team")
            .update({
              teamId: req.body.teamId,
              userId: req.body.mainUserId,
              updatedAt: currentTime,
            })
            .where({
              entityId: id,
              entityType: "task_group_templates",
              orgId: req.orgId,
            })
            .returning("*");
          updatedTeam = updatedTeamResult[0];
        } else {
          // ASSIGNED TEAM OPEN
          let insertAssignedServiceTeamData = {
            teamId: req.body.teamId ? req.body.teamId : null,
            userId: req.body.mainUserId ? req.body.mainUserId : null,
            entityId: id,
            entityType: "task_group_templates",
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
          };

          let assignedServiceTeamResult = await knex("assigned_service_team")
            .insert(insertAssignedServiceTeamData)
            .returning(["*"]);
          updatedTeam = assignedServiceTeamResult[0];
          // ASSIGNED TEAM CLOSE
        }
      }

      return res.status(200).json({
        data: {
          updatedTaskGroupTemplate,
          resultScheduleData,
          updatedTeam,
          updatedTasks,
          updatedUsers,
          partResult,
          deletedUser,
        },
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getTaskGroupTemplateList: async (req, res) => {
    try {
      let sortPayload = req.body;

      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "categoryName";
        sortPayload.orderBy = "asc";
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
        knex("task_group_templates")
          .select(
            "task_group_templates.*",
            "asset_category_master.categoryName"
          )
          .innerJoin(
            "asset_category_master",
            "task_group_templates.assetCategoryId",
            "asset_category_master.id"
          )
          .where({ "task_group_templates.orgId": orgId })
          .where((qb) => {
            if (filters.taskGroupName) {
              qb.where(
                "task_group_templates.taskGroupName",
                "iLIKE",
                `%${filters.taskGroupName}%`
              );
            }
            if (filters.categoryId) {
              qb.whereIn(
                "task_group_templates.assetCategoryId",
                filters.categoryId
              );
            }
          }),
        knex("task_group_templates")
          .select(
            "task_group_templates.*",
            "asset_category_master.categoryName"
          )
          .offset(offset)
          .limit(per_page)
          .innerJoin(
            "asset_category_master",
            "task_group_templates.assetCategoryId",
            "asset_category_master.id"
          )
          .where({ "task_group_templates.orgId": orgId })
          .where((qb) => {
            if (filters.taskGroupName) {
              qb.where(
                "task_group_templates.taskGroupName",
                "iLIKE",
                `%${filters.taskGroupName}%`
              );
            }
            if (filters.categoryId) {
              qb.whereIn(
                "task_group_templates.assetCategoryId",
                filters.categoryId
              );
            }
          })
          .orderBy("asset_category_master.categoryName", sortPayload.orderBy)
          .orderBy("task_group_templates.updatedAt", "desc"),
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
          list: pagination,
        },
        message: "Task group template list",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getTaskGroupScheduleDetails: async (req, res) => {
    try {
      const { scheduleId, taskGroupId } = req.body;
      const scheduleData = await knex("task_group_schedule")
        .innerJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .select([
          "task_group_schedule.*",
          "task_group_schedule_assign_assets.pmDate as pmDate",
        ])
        .where({
          "task_group_schedule.id": scheduleId,
          "task_group_schedule_assign_assets.orgId": req.orgId,
        });

      const team = await knex("assigned_service_team")
        .select(["teamId", "userId"])
        .where({
          entityType: "work_order",
          entityId: taskGroupId,
          orgId: req.orgId,
        });
      const additionalUsers = await knex("assigned_service_additional_users")
        .select("userId")
        .where({
          entityType: "work_order",
          entityId: taskGroupId,
          orgId: req.orgId,
        });

      return res.status(200).json({
        data: {
          scheduleData,
          team,
          additionalUsers,
        },
        message: "Schedule Data",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  updateOldTaskGroupScheduleWithWorkOrders: async (req, res) => {
    try {
      const { scheduleId, taskGroupId, newData } = req.body;
      let {
        startDateTime,
        endDateTime,
        repeatFrequency,
        repeatOn,
        repeatPeriod,
      } = newData;
      const { teamId, mainUserId, additionalUsers } = newData;

      let repeat = repeatOn.length ? repeatOn.join(",") : [];

      let currentDate = moment().format("YYYY-MM-DD");
      //return res.json(currentDate)

      if (!(startDateTime >= currentDate)) {
        console.log(currentDate, "currreeeetttttttttttttt");
        return res.status(400).json({
          errors: [
            { code: "LESS_THAN_ERROR", message: "Enter valid start date" },
          ],
        });
      }

      if (!(endDateTime >= currentDate)) {
        console.log(currentDate, "currreeeetttttttttttttt");
        return res.status(400).json({
          errors: [
            { code: "LESS_THAN_ERROR", message: "Enter valid start date" },
          ],
        });
      }

      // Generate New Work Orders for the same schedule but from the date which are coming next
      // Previous date should be discarded
      let generatedDates = getRecurringDates({
        startDateTime,
        endDateTime,
        repeatFrequency,
        repeat,
        repeatPeriod,
      });

      // Create New Work Orders Now
      // Get tasks for which the pms are to be created
      let tasksResults = await knex("pm_task")
        .select("taskName")
        .where({ taskGroupId, orgId: req.orgId });
      let tasks = _.uniqBy(tasksResults, "taskName").map((v) => v.taskName);

      let assetResults = [];
      // Get Asset Ids for which new work orders are to be created
      const assetIdsResult = await knex("task_group_schedule_assign_assets")
        .where({ scheduleId, orgId: req.orgId })
        .select("assetId");

      const assetIds = _.uniq(
        assetIdsResult.map((r) => r.assetId).map((v) => Number(v))
      );

      // Delete work orders which are not yet completed
      if (generatedDates.length > 0) {
        await knex("task_group_schedule_assign_assets")
          .where({ scheduleId, orgId: req.orgId })
          .whereRaw(
            knex.raw(
              `DATE("task_group_schedule_assign_assets"."pmDate") > now()`
            )
          )
          .select("*")
          .del();
      }

      let currentTime = new Date().getTime();
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
              orgId: req.orgId,
            })
            .returning(["*"]);

          // CREATE PM TASK OPEN
          let InsertPmTaskPayload = tasks.map((da) => ({
            taskName: da,
            taskGroupId,
            taskGroupScheduleAssignAssetId: assetResult[0].id,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: req.orgId,
            status: "O",
          }));

          let insertPmTaskResult = await knex("pm_task")
            .insert(InsertPmTaskPayload)
            .returning(["*"]);
          createPmTask = insertPmTaskResult;

          // CREATE PM TASK CLOSE
          assetResults.push(assetResult[0]);
        }
      }

      const updatedSchedule = await knex("task_group_schedule")
        .update({
          startDate: startDateTime,
          endDate: endDateTime,
          repeatFrequency,
          repeatOn,
          repeatPeriod,
          orgId: req.orgId,
        })
        .where({ id: scheduleId })
        .select("*");
      const updatedTeam = await knex("assigned_service_team")
        .update({ teamId, userId: mainUserId })
        .where({
          entityId: taskGroupId,
          entityType: "work_order",
          orgId: req.orgId,
        });
      let updatedAdditionalUsers = [];
      for (let id of additionalUsers) {
        let updatedAdditionalUserResult = await knex(
          "assigned_service_additional_users"
        )
          .update({ userId: id })
          .where({
            entityType: "work_order",
            entityId: taskGroupId,
            orgId: req.orgId,
          });
        updatedAdditionalUsers.push(updatedAdditionalUserResult[0]);
      }

      await knex("task_group_schedule")
        .update({ isActive: true })
        .where({ isActive: true });

      await knex("task_group_schedule_assign_assets")
        .update({ isActive: true })
        .where({ isActive: true });

      return res.status(200).json({
        data: {
          //deletedWorkOrders
          generatedDates,
          assetIds,
          tasks,
          assetResults,
          updatedSchedule,
          updatedTeam,
          updatedAdditionalUsers,
        },
        message: "Updated successfully",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /***EXPORT TASK GROUP TEMPLATE DATA */
  exportTaskGroupTemplateData: async (req, res) => {
    try {
      let reqData = req.query;
      let orgId = req.orgId;
      let rows = null;
      [rows] = await Promise.all([
        knex("task_group_templates")
          .select([
            "orgId as ORGANIZATION_ID",
            "id as ID",
            "taskGroupName as TASKGROUP_NAME",
            "assetCategoryId as ASSET_CATEGORY_ID",
            "pmId as  PM_ID",
            "isActive as STATUS",
            "createdBy as CREATED BY ID",
            "createdAt as DATE CREATED",
          ])
          .where({ "task_group_templates.orgId": orgId })
          .orderBy("task_group_templates.createdAt", "desc"),
      ]);

      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = "sls-app-resources-bucket";
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "TaskGroupTemplateData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");

      fs.readFile(filepath, function (err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Task_Group_Template/" + filename,
          Body: file_buffer,
          ACL: "public-read",
        };
        s3.putObject(params, function (err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
          } else {
            console.log("File uploaded Successfully");
            //next(null, filePath);
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Task_Group_Template/" +
              filename;

            return res.status(200).json({
              data: rows,
              message: "Task group template data export successfully!",
              url: url,
            });
          }
        });
      });
      // let deleteFile = await fs.unlink(filepath, (err) => { console.log("File Deleting Error " + err) })
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  importTaskGroup: async (req, res) => {},
  togglePmTemplateStatus: async (req, res) => {
    try {
      const id = req.body.id;
      let pmTemplate = await knex("task_group_templates")
        .select("isActive")
        .where({ id: id, orgId: req.orgId })
        .first();
      let status = Boolean(pmTemplate.isActive);
      if (status) {
        await knex("task_group_templates")
          .update({ isActive: false, orgId: req.orgId })
          .where({ id: id });
      } else {
        await knex("task_group_templates")
          .update({ isActive: true, orgId: req.orgId })
          .where({ id: id });
      }
      return res.status(200).json({
        data: {
          message: "Successfully updated status!",
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  pmLocationDetail: async (req, res) => {
    try {
      let payload = req.body;
      let pmId;
      let locationData;
      if (payload.taskGroupId) {
        pmId = await knex("pm_task_groups")
          .select("pmId")
          .where({ id: payload.taskGroupId })
          .first();
        locationData = await knex("pm_master2")
          .innerJoin("companies", "pm_master2.companyId", "companies.id")
          .innerJoin("projects", "pm_master2.projectId", "projects.id")
          .select([
            "companies.companyName",
            "projects.projectName",
            "pm_master2.name as pmName",
          ])
          .where({ "pm_master2.orgId": req.orgId, "pm_master2.id": pmId.pmId })
          .first();
      }

      if (payload.pmId) {
        locationData = await knex("pm_master2")
          .innerJoin("companies", "pm_master2.companyId", "companies.id")
          .innerJoin("projects", "pm_master2.projectId", "projects.id")
          .select([
            "companies.companyName",
            "projects.projectName",
            "pm_master2.name as pmName",
          ])
          .where({
            "pm_master2.orgId": req.orgId,
            "pm_master2.id": payload.pmId,
          })
          .first();
      }

      return res.status(200).json({
        data: {
          locationData: locationData,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  editWorkOrderDate: async (req, res) => {
    try {
      const payload = req.body;
      moment.tz.setDefault(payload.timezone);
      payload.newPmDate = moment(payload.newPmDate);
      payload.newPmDate = payload.newPmDate.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
      console.log("payload.newPmDate and Time::", payload);
      let currentTime = new Date().getTime();

      let updatedWorkOrder;
      if (payload.newPmDate == "Invalid date") {
        console.log("Invalid Date");
      } else {
        updatedWorkOrder = await knex("task_group_schedule_assign_assets")
          .update({ pmDate: payload.newPmDate })
          .whereIn("task_group_schedule_assign_assets.id", payload.workOrderId);
      }

      let teamUsersPayload = {
        teamId: payload.teamId,
        userId: payload.mainUserId,
        updatedAt: currentTime,
      };

      console.log("payload.workOrderId to edit", payload.workOrderId);

      let deleteTeamAndUser = knex("assigned_service_team")
        .where({ entityType: "work_order", orgId: req.orgId })
        .whereIn("assigned_service_team.workOrderId", payload.workOrderId)
        .del();

      const updateWorkOrderTeamAndUsers = await knex("assigned_service_team")
        .update(teamUsersPayload)
        .where({ entityType: "work_order", orgId: req.orgId })
        .whereIn("assigned_service_team.entityId", payload.workOrderId);

      let deleteAdditionalUser = knex("assigned_service_additional_users")
        .where({
          "assigned_service_additional_users.entityType": "work_order",
          orgId: req.orgId,
        })
        .whereIn(
          "assigned_service_additional_users.entityId",
          payload.workOrderId
        )
        .del();

      let additionlUser = payload.additionalUsers;

      let updateAdditionalUsers;
      for (let addUser of additionlUser) {
        console.log("Updated additional user loop", addUser);
        updateAdditionalUsers = await knex("assigned_service_additional_users")
          .update({
            userId: addUser,
            updatedAt: currentTime,
          })
          .where({
            "assigned_service_additional_users.entityType": "work_order",
            orgId: req.orgId,
          })
          .whereIn(
            "assigned_service_additional_users.entityId",
            payload.workOrderId
          );
      }

      return res.status(200).json({
        data: {
          updatedWorkOrder,
          updateWorkOrderTeamAndUsers,
          updateAdditionalUsers,
        },
        message: "Work order date updated!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  editWorkOrderDate22: async (req, res) => {
    try {
      const payload = req.body;
      console.log("payloadData", payload);

      moment.tz.setDefault(payload.timezone);
      payload.newPmDate = moment(payload.newPmDate);
      console.log(
        "payload.newPmDate Time:",
        payload.newPmDate.format("MMMM Do YYYY, h:mm:ss a")
      );
      console.log(
        "payload.newPmDate Time2:",
        payload.newPmDate.format("YYYY-MM-DD HH:mm")
      );

      payload.newPmDate = new Date(payload.newPmDate);

      const updatedWorkOrder = await knex("task_group_schedule_assign_assets")
        .update({ pmDate: payload.newPmDate })
        .where({ id: payload.workOrderId });
      return res.status(200).json({
        data: {
          updatedWorkOrder,
        },
        message: "Work order date updated!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  deleteWorkOrder: async (req, res) => {
    try {
      const id = req.body.workOrderId;
      const deletedWorkOrder = await knex("task_group_schedule_assign_assets")
        .where({ id: id })
        .del()
        .returning(["*"]);
      return res.status(200).json({
        data: deletedWorkOrder,
        message: "Deleted Work order successfully!",
      });
    } catch (err) {}
  },

  cancelWorkOrder: async (req, res) => {
    try {
      const id = req.body.workOrderId;
      const cancelReason = req.body.cancelReason;
      let currentTime = new Date().getTime();

      const insertData = {
        entityId: id,
        entityType: "work-orders",
        description: cancelReason,
        orgId: req.orgId,
        createdBy: req.me.id,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      const resultRemarksNotes = await knex
        .insert(insertData)
        .returning(["*"])
        .into("remarks_master");

      const updatedWorkOrder = await knex("task_group_schedule_assign_assets")
        .update({ isActive: false, status: "C" })
        .where({ id: id });

      return res.status(200).json({
        data: resultRemarksNotes,
        message: "Work order cancelled successfully!",
      });
    } catch (err) {}
  },
  cancelPmPlan: async (req, res) => {
    try {
      const id = req.body.pmId;
      const cancelReason = req.body.cancelReason;
      let currentTime = new Date().getTime();
      let assets = [];

      const insertData = {
        entityId: id,
        entityType: "preventive-maintenance",
        description: cancelReason,
        orgId: req.orgId,
        createdBy: req.me.id,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      let assetId = await knex("task_group_schedule_assign_assets")
        .leftJoin(
          "asset_location",
          "task_group_schedule_assign_assets.assetId",
          "asset_location.assetId"
        )
        .leftJoin(
          "task_group_schedule",
          "task_group_schedule_assign_assets.scheduleId",
          "task_group_schedule.id"
        )
        .leftJoin("pm_master2", "task_group_schedule.pmId", "pm_master2.id")
        .select(["asset_location.assetId"])
        .where("pm_master2.id", id);

      assetId = _.uniqBy(assetId, "assetId");

      assets = assetId.map((a) => {
        return a.assetId;
      });

      const resultRemarksNotes = await knex
        .insert(insertData)
        .returning(["*"])
        .into("remarks_master");

      const updatedPmPlan = await knex("pm_master2")
        .update({ isActive: false })
        .where({ id: id });

      const insertWOData = {
        entityId: id,
        entityType: "preventive-maintenance",
        description: cancelReason,
        orgId: req.orgId,
        createdBy: req.me.id,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      const resultWORemarksNotes = await knex
        .insert(insertWOData)
        .returning(["*"])
        .into("remarks_master");

      let taskGroupId = await knex
        .from("task_group_schedule")
        .select("task_group_schedule.id")
        .where("task_group_schedule.pmId", id);

      // console.log("task group id=====>>>>",taskGroupId[0].id)

      const updateWorkOrderOfPm = await knex(
        "task_group_schedule_assign_assets"
      )
        .update({ isActive: false, status: "C" })
        .where({ scheduleId: taskGroupId[0].id, status: "O" });

      // console.log("asset Id for cancellation=====>>>>>",assets)

      let assetAssignedPm = await knex
        .from("task_group_schedule_assign_assets")
        .leftJoin(
          "asset_location",
          "task_group_schedule_assign_assets.assetId",
          "asset_location.assetId"
        )
        .leftJoin(
          "task_group_schedule",
          "task_group_schedule_assign_assets.scheduleId",
          "task_group_schedule.id"
        )
        .leftJoin("pm_master2", "task_group_schedule.pmId", "pm_master2.id")
        .select(["pm_master2.name as pmName", "pm_master2.id as pmId"])
        .whereIn("task_group_schedule_assign_assets.assetId", assets)
        .where({ "pm_master2.isActive": true });

      assetAssignedPm = _.uniqBy(assetAssignedPm, "pmId");

      console.log("total pm data====>>>>", assetAssignedPm.length);
      if (assetAssignedPm.length == 0) {
        let updateAssetMaster = await knex("asset_master")
          .update({ isEngaged: false })
          .whereIn("asset_master.id", assets);
      }

      return res.status(200).json({
        // data: {resultRemarksNotes,resultWORemarksNotes},
        message: "PM cancelled successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  generateWorkDate: async (req, res) => {
    try {
      const {
        startDateTime,
        endDateTime,
        repeatFrequency,
        repeatOn,
        repeatPeriod,
      } = req.body;
      let generatedDates = genrateWork(req.body);

      return res.status(200).json({
        data: generatedDates,
        message: "Work order generate successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  pmScheduleReport: async (req, res) => {
    try {
      let result = await knex("task_group_schedule_assign_assets").where({
        "task_group_scperformingDateshedule_assign_assets.orgId": req.orgId,
      });

      return res.status(200).json({
        data: result,
        message: "Pm plan action schedule successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /** Single update task status with result  */
  updateTaskStatusResult: async (req, res) => {
    try {
      const payload = req.body;
      const schema = Joi.object().keys({
        taskGroupId: Joi.string().required(),
        // result : Joi.number().required(),
        // userId: Joi.string().required(),
        // taskMode:Joi.number().required()
      });

      console.log("status and result", payload);
      const result = Joi.validate(
        _.omit(payload, "taskArr", "result", "status", "taskMode"),
        schema
      );
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let workOrderDate;
      let workOrderId;
      if (payload.taskArr.length) {
        workOrderDate = payload.taskArr[0].pmDate;
        workOrderId = payload.taskArr[0].workOrderId;
      }
      payload.workOrderDate = workOrderDate;
      payload.workOrderId = workOrderId;
      let currentTime = new Date().getTime();
      let taskUpdated = [];
      let updateResult;

      for (let t of payload.taskArr) {
        console.log("payload.taskArr1", payload.taskArr);
        let updateStatus;
        // if(t.desireValue){
        //   updateStatus = t.desireValue
        // }else if(req.body.status){
        //   updateStatus = req.body.status
        // }
        // if (t.desireStatus) {
        //   updateResult = t.desireStatus;
        // } else if(req.body.result) {
        //   updateResult = req.body.result;
        // }
        if (req.body.result) {
          updateResult = req.body.result;
        } else {
          updateResult = t.desireStatus;
        }
        if (req.body.status) {
          updateStatus = req.body.status;
        } else {
          updateStatus = t.desireValue;
        }
        console.log("rasultsAnd Status", updateResult, updateStatus, payload);
        taskUpdate = await knex("pm_task")
          .update({
            status: updateStatus,
            result: updateResult,
            taskMode: req.body.taskMode,
          })
          .where({
            taskGroupId: payload.taskGroupId,
            id: t.taskId,
            orgId: req.orgId,
            taskMode: null,
          })
          .orWhere({
            taskGroupId: payload.taskGroupId,
            id: t.taskId,
            orgId: req.orgId,
            taskMode: 1,
          })
          .returning(["*"]);

        taskUpdated.push(taskUpdate);
      }
      return res.status(200).json({
        data: {
          taskUpdated,
        },
        message: "Task updated",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  taskPerform: async (req, res) => {
    try {
      const payload = req.body;
      // console.log("task payload",payload)
      const schema = Joi.object().keys({
        taskGroupId: Joi.string().required(),
        //taskId: Joi.string().required(),
        // result: Joi.number().required(),
        // status: Joi.string().required(),
        // result: Joi.number().allow(null).optional(),
        // status: Joi.string().allow("").optional(),
        userId: Joi.string().required(),
        taskMode: Joi.number().required(),
        //cancelReason: Joi.string().allow("").allow(null).optional(),
        //workOrderId: Joi.string().required(),
        //workOrderDate: Joi.date().required()
      });
      const result = Joi.validate(
        _.omit(payload, "taskArr", "result", "status"),
        schema
      );
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let workOrderDate;
      let workOrderId;
      if (payload.taskArr.length) {
        workOrderDate = payload.taskArr[0].pmDate;
        workOrderId = payload.taskArr[0].workOrderId;
      }

      payload.workOrderDate = workOrderDate;
      payload.workOrderId = workOrderId;

      let currentTime = new Date().getTime();
      let taskUpdated = [];
      let updateResult;
      // if (payload.status === 'COM' && payload.taskMode == 2) {
      if (payload.taskMode == 2) {
        for (let t of payload.taskArr) {
          if (t.result == 2 || t.result == 3) {
            // let taskUpdate = await knex('pm_task').update({status:'COM',result:req.body.result,taskMode:payload.taskMode}).where({ taskGroupId: payload.taskGroupId, id: t.taskId, orgId: req.orgId }).returning(['*'])
            // taskUpdated.push(taskUpdate)
            if (req.body.result) {
              let taskUpdate = await knex("pm_task")
                .update({
                  status: "COM",
                  result: req.body.result,
                  taskMode: payload.taskMode,
                })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            } else {
              let taskUpdate = await knex("pm_task")
                .update({ status: "COM", taskMode: payload.taskMode })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            }
          } else {
            if (t.status == "Completed") {
              let taskUpdate = await knex("pm_task")
                .update({ taskMode: payload.taskMode })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            } else {
              // let updateStatus
              // if(t.desireValue){
              //   updateStatus = t.desireValue
              // }else{
              //   updateStatus = payload.status
              // }

              if (t.desireStatus) {
                updateResult = t.desireStatus;
              } else {
                updateResult = req.body.result;
              }

              // let taskUpdate = await knex('pm_task').update({ result: updateResult, status: payload.status, completedAt: currentTime, completedBy: payload.userId,taskMode:payload.taskMode }).where({ taskGroupId: payload.taskGroupId, id: t.taskId, orgId: req.orgId }).returning(['*'])
              let taskUpdate = await knex("pm_task")
                .update({
                  result: updateResult,
                  status: "COM",
                  completedAt: currentTime,
                  completedBy: payload.userId,
                  taskMode: payload.taskMode,
                })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            }
          }
        }
        let workResult = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
        });
        let workComplete = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
          status: "COM",
        });

        if (workResult.length == workComplete.length) {
          let scheduleStatus = null;

          let workDate = moment(payload.workOrderDate).format("YYYY-MM-DD");
          let currnetDate = moment().format("YYYY-MM-DD");
          if (workDate == currnetDate || workDate > currnetDate) {
            scheduleStatus = "on";
          } else if (workDate < currnetDate) {
            scheduleStatus = "off";
          }

          let workOrder = await knex("task_group_schedule_assign_assets")
            .update({
              status: "COM",
              updatedAt: currentTime,
              scheduleStatus: scheduleStatus,
            })
            .where({ id: payload.workOrderId, orgId: req.orgId })
            .returning(["*"]);
        }
      } else {
        // console.log("task mode",payload.taskMode)

        // let workOrder = await knex('task_group_schedule_assign_assets').update({ status: 'COM', updatedAt: currentTime, }).where({ id: payload.workOrderId, orgId: req.orgId }).returning(['*'])

        if (payload.status === "C") {
          // taskUpdated = await knex('pm_task').update({ status: payload.status, cancelReason: payload.status,taskMode:payload.taskMode }).where({ taskGroupId: payload.taskGroupId, id: payload.taskId, orgId: req.orgId }).returning(['*'])
          taskUpdated = await knex("pm_task")
            .update({
              status: payload.status,
              cancelReason: payload.status,
              taskMode: payload.taskMode,
            })
            .where({
              taskGroupId: payload.taskGroupId,
              id: t.taskId,
              orgId: req.orgId,
              taskMode: null,
            })
            .orWhere({
              taskGroupId: payload.taskGroupId,
              id: t.taskId,
              orgId: req.orgId,
              taskMode: 1,
            })
            .returning(["*"]);
        } else {
          for (let t of payload.taskArr) {
            // console.log("taskMode is 1",payload)
            // if (t.result == 2 || t.result == 3) {

            // } else {

            // if (t.status == "Completed") {

            // } else {
            let updateStatus;
            if (t.desireValue) {
              updateStatus = t.desireValue;
            } else {
              updateStatus = payload.status;
            }

            if (t.desireStatus) {
              updateResult = t.desireStatus;
            } else {
              updateResult = req.body.result;
            }

            taskUpdate = await knex("pm_task")
              .update({
                status: updateStatus,
                result: updateResult,
                taskMode: payload.taskMode,
              })
              .where({
                taskGroupId: payload.taskGroupId,
                id: t.taskId,
                orgId: req.orgId,
                taskMode: null,
              })
              .orWhere({
                taskGroupId: payload.taskGroupId,
                id: t.taskId,
                orgId: req.orgId,
                taskMode: 1,
              })
              .returning(["*"]);

            taskUpdated.push(taskUpdate);

            // }
            // }
          }
        }
      }

      return res.status(200).json({
        data: {
          taskUpdated,
        },
        message: "Task updated",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /** All update task status with result  */
  allTaskPerform: async (req, res) => {
    try {
      const payload = req.body;
      console.log("task array", payload.taskArr);
      const schema = Joi.object().keys({
        taskGroupId: Joi.string().required(),
        //taskId: Joi.string().required(),
        // result: Joi.number().required(),
        // status: Joi.string().required(),
        // result: Joi.number().allow(null).optional(),
        // status: Joi.string().allow("").optional(),
        userId: Joi.string().required(),
        taskMode: Joi.number().required(),
        //workOrderId: Joi.string().required(),
        //workOrderDate: Joi.date().required()
      });
      const result = Joi.validate(
        _.omit(payload, "taskArr", "result", "status"),
        schema
      );
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let workOrderDate;
      let workOrderId;
      if (payload.taskArr.length) {
        workOrderDate = payload.taskArr[0].pmDate;
        workOrderId = payload.taskArr[0].workOrderId;
      }

      payload.workOrderDate = workOrderDate;
      payload.workOrderId = workOrderId;
      //payload.status = 'COM';
      //payload.result = 1;

      let currentTime = new Date().getTime();
      let taskUpdated = [];
      let updateResult;

      // if (payload.status === 'COM' && payload.taskMode == 2) {
      if (payload.taskMode == 2) {
        for (let t of payload.taskArr) {
          if (t.result == 2 || t.result == 3) {
            if (req.body.result) {
              let taskUpdate = await knex("pm_task")
                .update({
                  status: "COM",
                  result: req.body.result,
                  taskMode: payload.taskMode,
                })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            } else {
              let taskUpdate = await knex("pm_task")
                .update({ status: "COM", taskMode: payload.taskMode })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            }
          } else {
            if (t.status == "Completed") {
              let taskUpdate = await knex("pm_task")
                .update({ taskMode: payload.taskMode })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            } else {
              // let updateStatus
              // if(t.desireValue){
              //   updateStatus = t.desireValue
              // }else{
              //   updateStatus = payload.status
              // }

              if (t.desireStatus) {
                updateResult = t.desireStatus;
              } else if (req.body.result) {
                updateResult = req.body.result;
              } else {
                updateResult = null;
              }

              let taskUpdate = await knex("pm_task")
                .update({
                  result: updateResult,
                  status: "COM",
                  completedAt: currentTime,
                  completedBy: payload.userId,
                  taskMode: payload.taskMode,
                })
                .where({
                  taskGroupId: payload.taskGroupId,
                  id: t.taskId,
                  orgId: req.orgId,
                })
                .returning(["*"]);
              taskUpdated.push(taskUpdate);
            }
          }
        }
        let workResult = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
        });
        let workComplete = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
          status: "COM",
        });

        if (workResult.length == workComplete.length) {
          let scheduleStatus = null;

          let workDate = moment(payload.workOrderDate).format("YYYY-MM-DD");
          let currnetDate = moment().format("YYYY-MM-DD");
          if (workDate == currnetDate || workDate > currnetDate) {
            scheduleStatus = "on";
          } else if (workDate < currnetDate) {
            scheduleStatus = "off";
          }

          let workOrder = await knex("task_group_schedule_assign_assets")
            .update({
              status: "COM",
              updatedAt: currentTime,
              scheduleStatus: scheduleStatus,
            })
            .where({ id: payload.workOrderId, orgId: req.orgId })
            .returning(["*"]);
        }
      } else {
        for (let t of payload.taskArr) {
          // if (t.result == 2 || t.result == 3) {

          // } else {

          //   if (t.status == "Completed") {

          //   } else {
          let updateStatus;
          if (t.desireValue) {
            updateStatus = t.desireValue;
          } else {
            updateStatus = payload.status;
          }

          if (t.desireStatus) {
            updateResult = t.desireStatus;
          } else {
            updateResult = req.body.result;
          }

          let taskUpdate = await knex("pm_task")
            .update({
              result: updateResult,
              status: updateStatus,
              completedAt: currentTime,
              completedBy: payload.userId,
              taskMode: payload.taskMode,
            })
            .where({
              taskGroupId: payload.taskGroupId,
              id: t.taskId,
              orgId: req.orgId,
              taskMode: null,
            })
            .orWhere({
              taskGroupId: payload.taskGroupId,
              id: t.taskId,
              orgId: req.orgId,
              taskMode: 1,
            })
            .returning(["*"]);
          taskUpdated.push(taskUpdate);
          // }
          // }
        }
        let workResult = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
          taskMode: null,
        });
        let workComplete = await knex("pm_task").where({
          taskGroupScheduleAssignAssetId: payload.workOrderId,
          orgId: req.orgId,
          status: "COM",
        });

        if (workResult.length == workComplete.length) {
          let scheduleStatus = null;

          let workDate = moment(payload.workOrderDate).format("YYYY-MM-DD");
          let currnetDate = moment().format("YYYY-MM-DD");
          if (workDate == currnetDate || workDate > currnetDate) {
            scheduleStatus = "on";
          } else if (workDate < currnetDate) {
            scheduleStatus = "off";
          }

          // let workOrder = await knex('task_group_schedule_assign_assets').update({ status: payload.status, updatedAt: currentTime, scheduleStatus: scheduleStatus }).where({ id: payload.workOrderId, orgId: req.orgId }).returning(['*'])
        }
      }

      return res.status(200).json({
        data: {
          taskUpdated,
        },
        message: "Task updated",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /**task feedback */
  taskFeedback: async (req, res) => {
    try {
      const payload = req.body;
      let addedFeedback;
      console.log("Payload Data", payload);

      const schema = Joi.object().keys({
        taskId: Joi.string().required(),
        taskGroupScheduleId: Joi.string().required(),
        taskGroupId: Joi.string().required(),
        assetId: Joi.string().required(),
        description: Joi.string().allow(null).allow("").optional(),
        //workOrderId: Joi.string().required()
      });
      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      let curentTime = new Date().getTime();
      //let fbs = req.body.map(v => ({ ...v, createdAt: curentTime, updatedAt: curentTime, orgId: req.orgId }))

      let checkFeedback;

      checkFeedback = await knex
        .from("task_feedbacks")
        .where({
          taskId: payload.taskId,
          taskGroupScheduleId: payload.taskGroupScheduleId,
          taskGroupId: payload.taskGroupId,
          assetId: payload.assetId,
          orgId: req.orgId,
        })
        .first();

      if (checkFeedback) {
        let updateData = {
          ...payload,
          updatedAt: curentTime,
          orgId: req.orgId,
        };

        addedFeedback = await knex("task_feedbacks")
          .update(updateData)
          .where({
            taskId: payload.taskId,
            taskGroupScheduleId: payload.taskGroupScheduleId,
            taskGroupId: payload.taskGroupId,
            assetId: payload.assetId,
            orgId: req.orgId,
          })
          .returning(["*"]);
      } else {
        let fbs = {
          ...payload,
          createdAt: curentTime,
          updatedAt: curentTime,
          orgId: req.orgId,
        };
        addedFeedback = await knex("task_feedbacks")
          .insert(fbs)
          .returning(["*"]);
      }

      return res.status(200).json({
        data: {
          addedFeedback,
        },
        message: "Feedback added successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-pm-task-details] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /**Work Order Report */
  getWorkOrderReport: async (req, res) => {
    try {
      let payload = req.body;
      console.log("payload data in PM details", payload);

      const schema = Joi.object().keys({
        taskGroupScheduleId: Joi.string().required(),
        taskGroupScheduleAssignAssetId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      const pmResult2 = await knex("task_group_schedule")
        .leftJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .leftJoin(
          "asset_master",
          "task_group_schedule_assign_assets.assetId",
          "asset_master.id"
        )
        .leftJoin("asset_location", "asset_master.id", "asset_location.assetId")
        .leftJoin("companies", "asset_location.companyId", "companies.id")
        .leftJoin("projects", "asset_location.projectId", "projects.id")
        .leftJoin(
          "buildings_and_phases",
          "asset_location.buildingId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "asset_location.floorId",
          "floor_and_zones.id"
        )
        .leftJoin(
          "property_units",
          "asset_location.unitId",
          "property_units.id"
        )
        .leftJoin("pm_master2", "task_group_schedule.pmId", "pm_master2.id")
        .leftJoin(
          "asset_category_master",
          "pm_master2.assetCategoryId",
          "asset_category_master.id"
        )
        .leftJoin(
          "pm_task_groups",
          "task_group_schedule.taskGroupId",
          "pm_task_groups.id"
        )
        .leftJoin(
          "assigned_service_team",
          "pm_task_groups.id",
          "assigned_service_team.entityId"
        )
        .leftJoin("teams", "assigned_service_team.teamId", "teams.teamId")
        .leftJoin("users", "assigned_service_team.userId", "users.id")
        .select([
          "task_group_schedule.id as id",
          "task_group_schedule_assign_assets.id as taskGroupScheduleAssignAssetId",
          "task_group_schedule.taskGroupId",
          "pm_master2.name as pmName",
          "asset_category_master.categoryName as assetCategoryName",
          "pm_task_groups.taskGroupName as taskGroupName",
          "asset_master.assetName as assetName",
          "asset_master.id as assetId",
          "asset_master.barcode as barCode",
          "asset_master.areaName as areaName",
          "asset_master.model as modelNo",
          "asset_master.assetSerial",
          "asset_master.assetCode",
          "companies.logoFile",
          "companies.companyAddressEng",
          "task_group_schedule.startDate as startDate",
          "task_group_schedule.endDate as endDate",
          "task_group_schedule.repeatFrequency as repeatFrequency",
          "task_group_schedule.repeatOn as repeatOn",
          "task_group_schedule.repeatPeriod",
          "teams.teamName as teamName",
          "assigned_service_team.userId as mainUserId",
          "users.name as mainUser",
          "task_group_schedule_assign_assets.pmDate as pmDate",
          "task_group_schedule_assign_assets.displayId",
          "task_group_schedule_assign_assets.status as woStatus",
          "companies.taxId",
          "companies.telephone",
          "task_group_schedule.orgId",
        ])
        .where({
          "task_group_schedule.id": payload.taskGroupScheduleId,
          "task_group_schedule_assign_assets.id":
            payload.taskGroupScheduleAssignAssetId,
          "task_group_schedule.orgId": req.orgId,
        });

      /// Update by Deepak Tiwari
      console.log("Details for team user", pmResult2);

      const Parallel = require("async-parallel");
      const pmResult = await Parallel.map(pmResult2, async (row) => {
        console.log("rows", row);

        const location = await knex("asset_location")
          .innerJoin("companies", "asset_location.companyId", "companies.id")
          .innerJoin("projects", "asset_location.projectId", "projects.id")
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
            "companies.companyName",
            "companies.companyId",
            "projects.projectName",
            "projects.project as projectCode",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingDescription",
            "floor_and_zones.floorZoneCode",
            "floor_and_zones.description as floorDescription",
            "property_units.unitNumber",
          ])
          .where({ "asset_location.assetId": row.assetId })
          .orderBy("asset_location", "desc")
          .limit("1")
          .first();
        // ]).max('asset_location.updatedAt').first()
        return { ...row, ...location };
      });

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
        additionalUsers = await knex("assigned_service_additional_users")
          .innerJoin(
            "users",
            "assigned_service_additional_users.userId",
            "users.id"
          )
          .select([
            "users.id as additionalUserId",
            "users.name as additionalUser",
          ])
          .where({
            "assigned_service_additional_users.entityType": "work_order",
            "assigned_service_additional_users.entityId":
              pmResult[0].taskGroupId,
            "assigned_service_additional_users.orgId": req.orgId,
          });

        // ADDITIONAL USER CLOSE
      }

      // TASK OPEN
      tasks = await knex("pm_task")
        .leftJoin(
          "service_status AS status",
          "pm_task.status",
          "status.statusCode"
        )
        .leftJoin("task_feedbacks", "pm_task.id", "task_feedbacks.taskId")
        .leftJoin(
          "task_group_schedule",
          "pm_task.taskGroupId",
          "task_group_schedule.taskGroupId"
        )
        .leftJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .select([
          "pm_task.id as taskId",
          "pm_task.taskName as taskName",
          "status.descriptionEng as status",
          "status.statusCode",
          "pm_task.taskNameAlternate",
          "pm_task.taskSerialNumber",
          "pm_task.result",
          "task_feedbacks.description as feedbackDescription",
          "pm_task.duration",
          "pm_task.hourlyRate",
          "pm_task.taskMode",
          "pm_task.taskGroupId",
          "pm_task.repeatFrequencyId",
          "task_group_schedule_assign_assets.frequencyTagIds",
        ])
        .where({
          "pm_task.taskGroupScheduleAssignAssetId":
            payload.taskGroupScheduleAssignAssetId,
          "pm_task.orgId": req.orgId,
        })
        .orderBy("pm_task.taskSerialNumber", "asc");

      tasks = tasks.map((v) => {
        let standardCost = 0;
        standardCost = Number(v.duration) * Number(v.hourlyRate);

        return {
          ...v,
          standardCost,
        };
      });

      //  tasks = await Parallel.map(tasks , async task =>{
      //     const taskRepeatFrequency = await knex('task_group_schedule')
      //     .select('task_group_schedule.repeatFrequency')
      //     .where({'task_group_schedule.taskGroupId':task.taskGroupId})

      //     return {...task ,taskRepeatFrequency}
      // })

      // let statuses = tasks.filter(t => t.status !== "CMTD")
      // if (statuses.length === 0) {
      //   status = 'complete'
      // } else {
      //   status = 'incomplete'
      // }
      // TASK CLOSE
      let meData = req.me;

      return res.status(200).json({
        data: {
          taskGroupPmAssetDatails: _.uniqBy(pmResult, "id"),
          additionalUsers: additionalUsers,
          tasks: _.uniqBy(tasks, "taskId"),
          printedBy: meData,
        },
        message: "Work Order Report Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-asset-pm-details] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getTeamDataByWorkOrderId: async (req, res) => {
    try {
      let workOrderId = req.body.workOrderId[0];
      let orgId = req.orgId;

      console.log("team work order id====>>>>>", workOrderId);
      let teamData = await knex
        .from("assigned_service_team")
        .select([
          "assigned_service_team.teamId",
          "assigned_service_team.userId",
        ])
        .where({
          "assigned_service_team.entityId": workOrderId,
          "assigned_service_team.orgId": orgId,
        });

      return res.status(200).json({
        data: {
          teamData: teamData,
        },
        message: "Work Order team data Successfully!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-asset-pm-details] :  Error",
        err
      );
    }
  },

  getAdditionalUsersByWorkOrderId: async (req, res) => {
    try {
      let workOrderId = req.body.workOrderId[0];
      let orgId = req.orgId;

      let additionalUsers = await knex
        .from("assigned_service_additional_users")
        .select(["assigned_service_additional_users.userId as addUser"])
        .where({
          "assigned_service_additional_users.entityId": workOrderId,
          "assigned_service_additional_users.orgId": orgId,
        });

      return res.status(200).json({
        data: {
          additionalUsers: additionalUsers,
        },
        message: "Work Order additional user list!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-workOrderDate] :  Error",
        err
      );
    }
  },
  getWorkOrderDateFromPmId: async (req, res) => {
    try {
      let pmId = req.body.pmId;

      console.log("value of PM id====>>>>", pmId);

      let workDate = await knex("task_group_schedule_assign_assets")
        .leftJoin(
          "task_group_schedule",
          "task_group_schedule_assign_assets.scheduleId",
          "task_group_schedule.id"
        )
        .select([
          // "task_group_schedule_assign_assets.pmDate"
          knex.raw(
            `DATE("task_group_schedule_assign_assets"."pmDate") as "workOrderDate"`
          ),
        ])
        .where({
          "task_group_schedule.pmId": pmId,
          "task_group_schedule_assign_assets.orgId": req.orgId,
        })
        .orderBy("task_group_schedule_assign_assets.pmDate", "asc");

      console.log("work order date", workDate);
      return res.status(200).json({
        data: {
          workOrderDate: workDate,
        },
        message: "Work Order Date!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-pm-workDate] :  Error",
        err
      );
    }
  },

  getTaskNameFromWorkOrderDate: async (req, res) => {
    try {
      let payload = req.body;
      let workOrderDate = moment(payload.workOrderDate).format("YYYY-MM-DD");

      // console.log("payload data====>>>>", workOrderDate)

      let tasks = await knex("pm_task")
        .leftJoin(
          "task_group_schedule",
          "pm_task.taskGroupId",
          "task_group_schedule.taskGroupId"
        )
        .leftJoin(
          "task_group_schedule_assign_assets",
          "task_group_schedule.id",
          "task_group_schedule_assign_assets.scheduleId"
        )
        .select([
          "pm_task.id as taskId",
          "pm_task.taskName as taskName",
          "pm_task.repeatFrequencyId",
        ])
        .where({
          "task_group_schedule.pmId": payload.pmId,
          "pm_task.orgId": req.orgId,
        })
        .whereRaw(
          `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')='${workOrderDate}'`
        );

      tasks = _.uniqBy(tasks, "taskId");
      tasks = _.uniqBy(tasks, "taskName");

      return res.status(200).json({
        data: {
          tasks: tasks,
        },
        message: "Work Order task list!",
      });
    } catch (err) {
      console.log(
        "[controllers][task-group][get-taskgroup-pm-task] :  Error",
        err
      );
    }
  },

  importPmChecklist: async (req, res) => {
    try {
      let data = req.body;
      let updateWOStatus;

      // console.log("request data====>>>>>",data)

      let errors = [];
      let header = Object.values(data[0]);
      header.unshift("Error");
      errors.push(header);

      let currentTime = new Date().getTime();

      console.log("value of data[0]", data[0]);
      if (
        data[0].A == "ITEM" &&
        data[0].B == "WORK_ORDER_NUMBER" &&
        data[0].C == "ASSET_CODE" &&
        data[0].D == "ASSET_NAME" &&
        data[0].E == "LOCATION" &&
        data[0].F == "STATUS"
        // data[0].G == "COMMENT"
      ) {
        if (data.length > 0) {
          let i = 0;
          console.log("Data[0]", data[0]);
          let success = 0;
          let totalData = data.length - 1;
          let fail = 0;

          for (let pm of data) {
            i++;
            console.log("value of pm1======>>>>", pm);

            if (i > 1) {
              if (!pm.A) {
                let values = _.values(pm);
                values.unshift("Item Number can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!pm.B) {
                let values = _.values(pm);
                values.unshift("WORK_ORDER_NUMBER can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!pm.C) {
                let values = _.values(pm);
                values.unshift("ASSET_CODE can not empty!");
                errors.push(values);
                fail++;
                continue;
              }
              if (!pm.D) {
                let values = _.values(pm);
                values.unshift("ASSET_NAME can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!pm.E) {
                let values = _.values(pm);
                values.unshift("LOCATION can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              if (!pm.F) {
                let values = _.values(pm);
                values.unshift("Status can not empty!");
                errors.push(values);
                fail++;
                continue;
              }

              console.log("value of pm======>>>>", pm);

              let updateWOStatusData = {
                status: pm.F,
                updatedAt: currentTime,
              };

              let updateWO = await knex
                .update(updateWOStatusData)
                .where({ id: pm.B, orgId: req.orgId })
                .into("task_group_schedule_assign_assets");

              let keys = Object.keys(data[0]);
              keys.splice(0, 6);

              let taskName = [];
              keys.forEach((k) => {
                let taskId = data[0][k].split("|");
                taskName.push({ taskId: taskId[0], keyName: k });
              });

              const Parallel = require("async-parallel");

              await Parallel.each(taskName, async (pd) => {
                console.log("value of pd", pm[pd.keyName]);
                if(pm[pd.keyName]){
                  let tasks = await knex("pm_task")
                  .update("result", pm[pd.keyName])
                  .where({
                    taskGroupScheduleAssignAssetId: pm.B,
                    orgId: req.orgId,
                    id: pd.taskId,
                  })
                  .returning(["*"]);
                }else{
                  console.log(
                    "[controllers][pm-checklist][importWorkOrders] :  Error"
                    
                  );
                }
                

              });
            }
          }
        }
      }
      return res.status(200).json({
        data: {},
        message: "Work Order Updated successfully.",
      });
    } catch (err) {
      console.log(
        "[controllers][pm-checklist][importWorkOrders] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
};

module.exports = taskGroupController;

function getRecurringDates({
  repeatPeriod,
  repeatOn,
  repeatFrequency,
  startDateTime,
  endDateTime,
}) {
  repeatPeriod = repeatPeriod;
  repeatOn = repeatOn ? repeatOn : ""; //&& repeatOn.length ? repeatOn.join(',') : [];
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
    dtstart: new Date(Date.UTC(startYear, startMonth, startDate)),
    until: new Date(Date.UTC(endYear, endMonth, endDate)), // year, month, date
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
  return performingDates
    .map((v) => new Date(v).getTime())
    .filter((v) => v > new Date().getTime())
    .map((v) => new Date(v).toISOString());
}

function genrateWork(payload) {
  let repeatPeriod = payload.repeatPeriod;
  let repeatOn = payload.repeatOn ? payload.repeatOn : ""; //&& payload.repeatOn.length ? payload.repeatOn.join(',') : [];
  let repeatFrequency = Number(payload.repeatFrequency);
  let start = new Date(payload.startDateTime);

  console.log("=============sss", start, "==========================");
  let startYear = start.getFullYear();
  let startMonth = start.getMonth();
  let startDate = start.getDate();
  let end = new Date(payload.endDateTime);

  console.log(
    "=============sss",
    end,
    "==========================",
    payload.repeatPeriod,
    payload.repeatOn,
    repeatFrequency,
    "================="
  );

  let endYear = end.getFullYear();
  let endMonth = end.getMonth();
  let endDate = end.getDate();
  let performingDates;

  let config = {
    interval: repeatFrequency,
    dtstart: new Date(Date.UTC(startYear, startMonth, startDate)),
    until: new Date(Date.UTC(endYear, endMonth, endDate)), // year, month, date
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

  return performingDates;
}

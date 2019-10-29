const Joi    = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt      = require('jsonwebtoken');
const _      = require('lodash');
const knex   = require('../../db/knex');
const trx    = knex.transaction();
const { RRule, RRuleSet, rrulestr } = require("rrule");

const taskGroupController = {

  // Create Task Group Template
  createTaskGroupTemplate: async (req,res)=>{

    try{

      let createTask       = null;
      let createTemplate   = null;
      let createResult     = [];
      let createPmTask     = null;
      let createPmTemplate = null;
      let payload          = req.body;
      const schema         = Joi.object().keys({
        assetCategoryId : Joi.string().required(),
        taskGroupName   : Joi.string().required(),
        tasks           : Joi.array().items(Joi.string().required()).strict().required(),
        isNew           : Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      
      await knex.transaction(async trx=>{
           
        let payload     = req.body;
        let currentTime = new Date().getTime();

       if(payload.isNew==="true"){

        // CREATE TASK TEMPLATE OPEN 
        let insertTemplateData = {
          assetCategoryId:payload.assetCategoryId,
          taskGroupName:payload.taskGroupName,
          createdAt :currentTime,
          updatedAt :currentTime
        }

        let insertTemplateResult = await knex.insert(insertTemplateData).returning(['*']).transacting(trx).into('task_group_templates');
        createTemplate = insertTemplateResult[0];
        // CREATE TASK TEMPLATE CLOSE

        // CREATE TASK OPEN 
        let tasksInsertPayload = payload.tasks.map(da=>({
            taskName  : da,
            templateId: createTemplate.id,
            createdAt : currentTime,
            updatedAt :currentTime
        }))
 
       let insertTaskResult = await knex.insert(tasksInsertPayload).returning(['*']).transacting(trx).into('template_task');
       createTask           = insertTaskResult;
      // CREATE TASK CLOSE

     // CREATE PM TASK GROUP OPEN 

       let insertPmTemplateData = {
        assetCategoryId:payload.assetCategoryId,
        taskGroupName:payload.taskGroupName,
        createdAt :currentTime,
        updatedAt :currentTime
      }

      let insertPmTemplateResult = await knex.insert(insertPmTemplateData).returning(['*']).transacting(trx).into('pm_task_groups');
      createPmTemplate = insertPmTemplateResult[0];
      // CREATE PM TASK GROUP CLOSE 

      // CREATE PM TASK NAME OPEN
      let tasksPmInsertPayload = payload.tasks.map(da=>({
          taskName  : da,
          taskGroupId: createPmTemplate.id,
          createdAt : currentTime,
          updatedAt :currentTime
      }))

     let insertPmTaskResult = await knex.insert(tasksPmInsertPayload).returning(['*']).transacting(trx).into('pm_task');
     createPmTask           = insertPmTaskResult;
     // CREATE PM TASK NAME CLOSE

  } else {

      // CREATE PM TASK GROUP OPEN 

      let insertPmTemplateData = {
        taskGroupName:payload.taskGroupName,
        createdAt :currentTime,
        updatedAt :currentTime
      }

      let insertPmTemplateResult = await knex.insert(insertPmTemplateData).returning(['*']).transacting(trx).into('pm_task_groups');
      createPmTemplate = insertPmTemplateResult[0];
      // CREATE PM TASK GROUP CLOSE 

      // CREATE PM TASK NAME OPEN
      let tasksPmInsertPayload = payload.tasks.map(da=>({
          taskName  : da,
          taskGroupId: createPmTemplate.id,
          createdAt : currentTime,
          updatedAt :currentTime
      }))
 // PM TASK GROUP TASK
     let insertPmTaskResult = await knex.insert(tasksPmInsertPayload).returning(['*']).transacting(trx).into('pm_task');
     createPmTask           = insertPmTaskResult;
    }

        return res.status(200).json({
          data:{
            taskGroupTemplateData:createTemplate,
            taskData:createTask,
            pmTemplateData:createPmTemplate,
            PmTaskData:createPmTask
            },
          message: "Task Group Template Created Successfully!"});
      })

    }catch(err){
      console.log("[controllers][task-group][createTaskGroupTemplate] :  Error", err);
      
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });  
    }   
    // GET TASK GROUP TEMPLATE LIST
  },getGroupTemplateList: async (req,res)=>{

    try {
      let payload       = req.body;  
      const schema      = Joi.object().keys({
        assetCategoryId : Joi.string().required()       
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let templateResult = await knex('task_group_templates').returning('*').where({"assetCategoryId":payload.assetCategoryId});

      return res.status(200).json({

        data:{groupTemplateData:templateResult},
        message :"Task Group Template List Successfully!"
      });

    }catch(err){
     console.log("[controllers][task-group][getGroupTemplateList] :  Error", err);
    res.status(500).json({
      errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
    });  
  }   
   // GET GROUP TASK LIST
  },getGroupTaskList: async (req,res)=>{

    try {
      let payload          = req.body;  
      const schema         = Joi.object().keys({
        templateId : Joi.string().required()       
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let taskResult = await knex('template_task').returning('*').where({"templateId":payload.templateId});

      return res.status(200).json({
        data:{
          groupTaskData:taskResult
        },
        message :"Group Task List Successfully!"
      });

    }catch(err){
     console.log("[controllers][task-group][getGroupTaskList] :  Error", err);
    res.status(500).json({
      errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
    });  
   }   
  },
  // CREATE PM TASK GROUP SCHEDULE
  createPmTaskgroupSchedule:async (req,res)=>{

    try{
      let createPmTaskGroup      = null;
      let assignedServiceTeam    = null;
      let taskSchedule           = null;
      let assignedAdditionalUser = null;
      let assetResults          =  [];
      let payload                = req.body;  
      const schema               = Joi.object().keys({
        assetCategoryId : Joi.number().required(),
        teamId          : Joi.string().required(),
        mainUserId      : Joi.string().required(),
        additionalUsers : Joi.array().items(Joi.string().required()).strict().required(),
        taskGroupName   : Joi.string().required(),
        tasks: Joi.array().items(Joi.string().required()).strict().required(),
        startDateTime   : Joi.date().required(),
        endDateTime     : Joi.date().required(),
        repeatPeriod    : Joi.string().required(),
        repeatFrequency : Joi.number().required(),
        assets: Joi.array().items(Joi.string().required()).strict().required(),
        
      });

      const result = Joi.validate(_.omit(payload,'repeatOn'), schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      await knex.transaction(async trx=>{
           
        let payload     = req.body;
        let currentTime = new Date().getTime();


      // CREATE PM TASK GROUP OPEN
      let insertPmTaskGroupData = {
                 taskGroupName:payload.taskGroupName,
                 createdAt :currentTime,
                 updatedAt :currentTime
              }

      let insertPmTemplateResult = await knex.insert(insertPmTaskGroupData).returning(['*']).transacting(trx).into('pm_task_groups');
      createPmTaskGroup = insertPmTemplateResult[0];

      // CREATE PM TASK GROUP CLOSE

      // CREATE PM TASK OPEN
      let InsertPmTaskPayload = payload.tasks.map(da=>({
        taskName  : da,
        taskGroupId: createPmTaskGroup.id,
        createdAt : currentTime,
        updatedAt :currentTime
    }))

   let insertPmTaskResult = await knex.insert(InsertPmTaskPayload).returning(['*']).transacting(trx).into('pm_task');
   createPmTask           = insertPmTaskResult;

      // CREATE PM TASK CLOSE

      // ASSIGNED ADDITIONAL USER OPEN
      let insertAssignedAdditionalUserData = payload.additionalUsers.map(user=>({
        userId  :user,
        entityId:createPmTaskGroup.id,
        entityType:"pm_task_groups",
        createdAt:currentTime,
        updatedAt:currentTime
      
    }))

      let assignedAdditionalUserResult = await knex.insert(insertAssignedAdditionalUserData).returning(['*']).transacting(trx).into('assigned_service_additional_users');
      assignedAdditionalUser = assignedAdditionalUserResult[0];
     // ASSIGNED ADDITIONAL USER CLOSE

     // ASSIGNED TEAM OPEN
      let insertAssignedServiceTeamData = {
        teamId  :payload.teamId,
        userId  :payload.mainUserId,
        entityId:createPmTaskGroup.id,
        entityType:"pm_task_groups",
        createdAt:currentTime,
        updatedAt:currentTime
      }

      let assignedServiceTeamResult = await knex.insert(insertAssignedServiceTeamData).returning(['*']).transacting(trx).into('assigned_service_team');
      assignedServiceTeam = assignedServiceTeamResult[0];
      
     // ASSIGNED TEAM CLOSE
    
     // TASK GROUP SCHEDULE OPEN
     let insertScheduleData = {
      taskGroupId   :createPmTaskGroup.id,
      pmId          :payload.pmId,
      startDate     :payload.startDateTime,
      endDate       :payload.endDateTime,
      repeatPeriod  :payload.repeatPeriod,
      repeatOn      :payload.repeatOn,
      repeatNumber  :payload.repeatFrequency,
      createdAt:currentTime,
      updatedAt:currentTime
    }

    let scheduleResult = await knex.insert(insertScheduleData).returning(['*']).transacting(trx).into('task_group_schedule');
    taskSchedule = scheduleResult[0];
    // TASK GROUP SCHEDULE CLOSE 

    // create recurring pm of this task group open

        let repeatPeriod = payload.repeatPeriod;
        let repeatOn = payload.repeatOn && payload.repeatOn.length ? payload.repeatOn.join(','):[];
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
          dtstart: new Date(Date.UTC(startYear, startMonth, startDate)),
          until: new Date(Date.UTC(endYear, endMonth, endDate)) // year, month, date
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
                updatedAt: currentTime
              })
              .returning(["*"])
              .transacting(trx)
              .into("task_group_schedule_assign_assets");
            assetResults.push(assetResult[0]);
          }
        }
    // create recurring pm of this task group close
    
    })

    return res.status(200).json({
      data:{
        pmTaskGroupData:createPmTaskGroup,
        assignedAdditionalUserData:assignedAdditionalUser,
        assignedServiceTeamData:assignedServiceTeam,
        taskScheduleData:taskSchedule,
        assetResultData:assetResults
       },
      message :"Create Pm Task Group Schedule Successfully!"
     });
      
    }catch(err){
      res.status(500).json({
       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
       });  
    }
  },
  // Create Pm
  createPM:async (req,res)=>{

    try{
      let createPM       = null;
      let payload          = req.body;
      const schema         = Joi.object().keys({
        assetCategoryId : Joi.string().required(),
        name            : Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      
      await knex.transaction(async trx=>{
           
        let payload      = req.body;
        let currentTime  = new Date().getTime();
        let insertData   = {...payload,createdAt:currentTime,updatedAt:currentTime};
        let insertResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('pm_master2');
        createPM = insertResult[0];


        res.status(200).json({
          data:{
           pmData:createPM
          },
          "message":"PM Create Successfully!"
        })
      })

    

    }catch(err){
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });  
    }
  }
}

module.exports = taskGroupController














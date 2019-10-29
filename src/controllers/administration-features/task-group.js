const Joi    = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt      = require('jsonwebtoken');
const _      = require('lodash');
const knex   = require('../../db/knex');
const trx    = knex.transaction();

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
  },assignPmTaskGroupTeam:async (req,res)=>{

    try{
      let createPmTaskGroup      = null;
      let assignedServiceTeam    = null;
      let taskSchedule           = null;
      let assignedAdditionalUser = null;
      let payload                = req.body;  
      const schema               = Joi.object().keys({
        teamId          : Joi.string().required(),
        userId          : Joi.string().required(),
        additionalUsers : Joi.array().items(Joi.string().required()).strict().required(),
        taskGroupName   : Joi.string().required(),
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


      // CREATE PM TASK GROUP OPEN
      let insertPmTaskGroupData = {
        taskGroupName:payload.taskGroupName,
        createdAt :currentTime,
        updatedAt :currentTime
      }

      let insertPmTemplateResult = await knex.insert(insertPmTaskGroupData).returning(['*']).transacting(trx).into('pm_task_groups');
      createPmTaskGroup = insertPmTemplateResult[0];
      // CREATE PM TASK GROUP CLOSE

      // ASSIGNED ADDITIONAL USER OPEN
      let insertAssignedAdditionalUserData = payload.additionalUsers.map(user=>({
        userId  :payload.user,
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
        userId  :payload.userId,
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
      taskGroupId :payload.taskGroupId,
      pmId        :payload.userId,
      startDate   :payload.startDate,
      endDate     :payload.endDate,
      repeatType  :payload.repeatType,
      repeatOn    :payload.repeatOn,
      repeatNumber:payload.repeatNumber,
      createdAt:currentTime,
      updatedAt:currentTime
    }

    let scheduleResult = await knex.insert(insertScheduleData).returning(['*']).transacting(trx).into('task_group_schedule');
    taskSchedule = scheduleResult[0];
     
    // TASK GROUP SCHEDULE CLOSE

    return res.status(200).json({
      data:{
        pmTaskGroupData:createPmTaskGroup,
        assignedAdditionalUserData:assignedAdditionalUser,
        assignedServiceTeamData:assignedServiceTeam,
        taskScheduleData:taskSchedule
      },
      message :"Preventive Maintenance Team Assigned Successfully!"
    });
    })
      
    }catch(err){
      res.status(500).json({
       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
       });  
    }
  }
}

module.exports = taskGroupController














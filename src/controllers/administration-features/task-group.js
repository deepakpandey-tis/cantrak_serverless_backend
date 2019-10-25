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
      let payload        = req.body;  
      let templateResult = null;

      let result = await knex('task_group_templates').returning('*').where({"assetCategoryId":payload.assetCategoryId});

      return res.status(200).json({
        data:result});

    }catch(err){
    console.log("[controllers][task-group][getGroupTemplateList] :  Error", err);
    
    res.status(500).json({
      errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
    });  
  }   

  }
}

module.exports = taskGroupController














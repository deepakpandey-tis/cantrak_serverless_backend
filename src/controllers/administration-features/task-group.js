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
  },
  createPMTemplate: async (req,res) => {
    try {
      let taskGroupTemplate = null;
      let insertedTasks = null
      let taskGroupTemplateSchedule = null
      let payload = _.omit(req.body, ['repeatOn','tasks','mainUserId','additionalUsers'])
      const schema = Joi.object().keys({
        assetCategoryId: Joi.string().required(),
        repeatFrequency: Joi.string().required(),
        //repeatOn
        repeatPeriod: Joi.string().required(),
        taskGroupName: Joi.string().required(),
        startDate: Joi.string().required(),
        endDate:Joi.string().required(),
        teamId: Joi.string().required(),
        
        //tasks: []
      })

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let currentTime = new Date().getTime();
      // Insert into task_group_templates
      let tgtInsert = {
        taskGroupName: payload.taskGroupName,
        assetCategoryId:payload.assetCategoryId,
        createdBy: req.body.mainUserId,
        createdAt: currentTime,
        updatedAt:currentTime
      }
      let taskGroupTemplateResult = await knex('task_group_templates').insert(tgtInsert).returning(['*'])
      taskGroupTemplate = taskGroupTemplateResult[0]

      // Insert tasks into template_task
      let insertPaylaod = req.body.tasks.map(v => ({
        taskName: v, templateId: taskGroupTemplate.id, createdAt: currentTime,createdBy:req.body.mainUserId,
        updatedAt: currentTime}))
      insertedTasks = await knex('template_task').insert(insertPaylaod).returning(['*'])

      // Insert into task_group_template_schedule
      let insertTTData = {
        startDate: payload.startDate,
        endDate: payload.endDate,
        repeatFrequency: payload.repeatFrequency,
        repeatOn: req.body.repeatOn.join(','),
        repeatPeriod: payload.repeatPeriod,
        taskGroupId: taskGroupTemplate.id,
        createdAt:currentTime,
        updatedAt:currentTime
      }

      let taskGroupScheduleResult = await knex('task_group_template_schedule').insert(insertTTData).returning(['*'])
      taskGroupTemplateSchedule = taskGroupScheduleResult[0]

      // Insert into teams



      // ASSIGNED ADDITIONAL USER OPEN
      let insertAssignedAdditionalUserData = req.body.additionalUsers.map(user => ({
        userId: user,
        entityId: taskGroupTemplate.id,
        entityType: "task_group_templates",
        createdAt: currentTime,
        updatedAt: currentTime

      }))

      let assignedAdditionalUserResult = await knex('assigned_service_additional_users').insert(insertAssignedAdditionalUserData).returning(['*'])
      assignedAdditionalUser = assignedAdditionalUserResult;
      // ASSIGNED ADDITIONAL USER CLOSE

      // ASSIGNED TEAM OPEN
      let insertAssignedServiceTeamData = {
        teamId: payload.teamId,
        userId: req.body.mainUserId,
        entityId: taskGroupTemplate.id,
        entityType: "task_group_templates",
        createdAt: currentTime,
        updatedAt: currentTime
      }

      let assignedServiceTeamResult = await knex('assigned_service_team').insert(insertAssignedServiceTeamData).returning(['*'])
      assignedServiceTeam = assignedServiceTeamResult[0];

     // ASSIGNED TEAM CLOSE




      return res.status(200).json({
        data: {
          taskGroupTemplate,
          tasks:insertedTasks,
          taskGroupTemplateSchedule,
          assignedAdditionalUser,
          assignedServiceTeam
        },
        mesaage: 'Task Group Template added successfully!'
      })

    } catch(err) {
      console.log("[controllers][task-group][createTaskGroupTemplate] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });  
    }
  },
  getGroupTemplateList: async (req,res)=>{

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
  },
  getGroupTaskList: async (req,res)=>{

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
      let createTemplateTask    = null;
      let createTemplate         = null;
      let createPM               = null;
      let createPmTaskGroup      = null;
      let assignedServiceTeam    = null;
      let taskSchedule           = null;
      let assignedAdditionalUser = null;
      let assetResults           =  [];
      let payload                = req.body; 
      const schema               = Joi.object().keys({
        assetCategoryId : Joi.number().required(),
        pmId            : Joi.string().required(),
        //isNew           : Joi.string().required(),
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
           

      //return res.status(200).json("Heafdksfksdfksdfks");

      //   let payload       = req.body;
         let currentTime   = new Date().getTime();
      //  // CREATE PM  OPEN
      //  let insertPmData   = {"name":payload.pmName,'assetCategoryId':payload.assetCategoryId,createdAt:currentTime,updatedAt:currentTime};
      //  let insertPmResult = await knex.insert(insertPmData).returning(['*']).transacting(trx).into('pm_master2');
      //   createPM          = insertPmResult[0];
      // CREATE PM CLOSE


      // if(payload.isNew==="true"){

      //     // CREATE TASK TEMPLATE OPEN 
      //     let insertTemplateData = {
      //       pmId:payload.pmId,
      //       assetCategoryId:payload.assetCategoryId,
      //       taskGroupName:payload.taskGroupName,
      //       createdAt :currentTime,
      //       updatedAt :currentTime
      //     }
  
      //     let insertTemplateResult = await knex.insert(insertTemplateData).returning(['*']).transacting(trx).into('task_group_templates');
      //     createTemplate = insertTemplateResult[0];
      //     // CREATE TASK TEMPLATE CLOSE
  
      //     // CREATE TASK TEMPLATE OPEN 
      //     let tasksInsertPayload = payload.tasks.map(da=>({
      //         taskName  : da,
      //         templateId: createTemplate.id,
      //         createdAt : currentTime,
      //         updatedAt :currentTime
      //     }))
   
      //    let insertTemplateTaskResult = await knex.insert(tasksInsertPayload).returning(['*']).transacting(trx).into('template_task');
      //    createTemplateTask           = insertTemplateTaskResult;
      //   // CREATE TASK TEMPLATE CLOSE
      //   }

      // CREATE PM TASK GROUP OPEN
      let insertPmTaskGroupData = {
                 pmId:payload.pmId,
                 assetCategoryId : payload.assetCategoryId,
                 taskGroupName :payload.taskGroupName,
                 createdAt :currentTime,
                 updatedAt :currentTime
              }

      let insertPmTemplateResult = await knex.insert(insertPmTaskGroupData).returning(['*']).transacting(trx).into('pm_task_groups');
      createPmTaskGroup          = insertPmTemplateResult[0];

      // CREATE PM TASK GROUP CLOSE

  //     // CREATE PM TASK OPEN
  //     let InsertPmTaskPayload = payload.tasks.map(da=>({
  //       taskName    : da,
  //       taskGroupId : createPmTaskGroup.id,
  //       createdAt   : currentTime,
  //       updatedAt   : currentTime
  //   }))

  //  let insertPmTaskResult = await knex.insert(InsertPmTaskPayload).returning(['*']).transacting(trx).into('pm_task');
  //  createPmTask           = insertPmTaskResult;

  //     // CREATE PM TASK CLOSE

      // ASSIGNED ADDITIONAL USER OPEN
      let insertAssignedAdditionalUserData = payload.additionalUsers.map(user=>({
        userId     : user,
        entityId   : createPmTaskGroup.id,
        entityType : "pm_task_groups",
        createdAt  : currentTime,
        updatedAt  : currentTime
      
    }))

      let assignedAdditionalUserResult = await knex.insert(insertAssignedAdditionalUserData).returning(['*']).transacting(trx).into('assigned_service_additional_users');
      assignedAdditionalUser = assignedAdditionalUserResult;
     // ASSIGNED ADDITIONAL USER CLOSE

     // ASSIGNED TEAM OPEN
      let insertAssignedServiceTeamData = {
        teamId    : payload.teamId,
        userId    : payload.mainUserId,
        entityId  : createPmTaskGroup.id,
        entityType: "pm_task_groups",
        createdAt : currentTime,
        updatedAt : currentTime
      }

      let assignedServiceTeamResult = await knex.insert(insertAssignedServiceTeamData).returning(['*']).transacting(trx).into('assigned_service_team');
      assignedServiceTeam = assignedServiceTeamResult[0];
      
     // ASSIGNED TEAM CLOSE
    
     // TASK GROUP SCHEDULE OPEN
     let insertScheduleData = {
      taskGroupId  : createPmTaskGroup.id,
      pmId         : payload.pmId,
      startDate    : payload.startDateTime,
      endDate      : payload.endDateTime,
      repeatPeriod : payload.repeatPeriod,
      repeatOn     : payload.repeatOn,
      repeatFrequency : payload.repeatFrequency,
      createdAt    : currentTime,
      updatedAt    : currentTime
    }

    let scheduleResult = await knex.insert(insertScheduleData).returning(['*']).transacting(trx).into('task_group_schedule');
    taskSchedule = scheduleResult[0];
    // TASK GROUP SCHEDULE CLOSE 


    // create recurring pm of this task group open

        let repeatPeriod    = payload.repeatPeriod;
        let repeatOn        = payload.repeatOn && payload.repeatOn.length ? payload.repeatOn.join(','):[];
        let repeatFrequency = Number(payload.repeatFrequency);
        let start           = new Date(payload.startDateTime);
        let startYear       = start.getFullYear();
        let startMonth      = start.getMonth();
        let startDate       = start.getDate();
        let end             = new Date(payload.endDateTime);
        let endYear         = end.getFullYear();
        let endMonth        = end.getMonth();
        let endDate         = end.getDate();
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
                pmDate     : date,
                scheduleId : taskSchedule.id,
                assetId,
                createdAt  : currentTime,
                updatedAt  : currentTime
              })
              .returning(["*"])
              .transacting(trx)
              .into("task_group_schedule_assign_assets");

            // CREATE PM TASK OPEN
            let InsertPmTaskPayload = payload.tasks.map(da => ({
              taskName: da,
              taskGroupId: createPmTaskGroup.id,
              taskGroupScheduleAssignAssetId: assetResult[0].id,
              createdAt: currentTime,
              updatedAt: currentTime
            }))

            let insertPmTaskResult = await knex.insert(InsertPmTaskPayload).returning(['*']).transacting(trx).into('pm_task');
            createPmTask = insertPmTaskResult;

      // CREATE PM TASK CLOSE
            assetResults.push(assetResult[0]);
          }
        }
    // create recurring pm of this task group close
    
    })

    return res.status(200).json({
      data:{
        templateData :createTemplate,
        taskTemplateData:createTemplateTask,
        pmTaskGroupData:createPmTaskGroup,
        assignedAdditionalUserData:assignedAdditionalUser,
        assignedServiceTeamData:assignedServiceTeam,
        taskScheduleData:taskSchedule,
        assetResultData:assetResults,
        createdPmTasks:createPmTask
       },
      message :"Create Pm Task Group Schedule Successfully!"
     });
      
    }catch(err){
      res.status(500).json({
       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
       });  
    }
  },
  // GET TASK GROUP SCHEDULE LIST
  getTaskGroupScheduleList:async (req,res)=>{

    try{
      let scheduleList = null;
      let payload      = req.body;

      const schema     = Joi.object().keys({
        pmId : Joi.string().required()
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
      
      

      let [total,rows] = await Promise.all([

      //   knex.count("* as count").from('task_group_schedule')
      //   .innerJoin('pm_task_groups','task_group_schedule.taskGroupId','pm_task_groups.id')
      //  .where({'task_group_schedule.pmId':payload.pmId})
      //  .groupBy(['pm_task_groups.id','task_group_schedule.id'])
        knex.from('task_group_schedule')
          .innerJoin('pm_task_groups', 'task_group_schedule.taskGroupId', 'pm_task_groups.id')
          .select(['task_group_schedule.*', 'pm_task_groups.taskGroupName'])
          .where({ 'task_group_schedule.pmId': payload.pmId })
        ,
        knex.from('task_group_schedule')
        .innerJoin('pm_task_groups','task_group_schedule.taskGroupId','pm_task_groups.id')
        .select(['task_group_schedule.*', 'pm_task_groups.taskGroupName'])
          .where({ 'task_group_schedule.pmId':payload.pmId})
        .offset(offset).limit(per_page)
      ])
      

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
          data:{
           taskGroupScheduleData:pagination
          },
          "message":"Task Group Schedule List Successfully!"
        })

    }catch(err){
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });  
    }
  },
  getPmList: async(req,res) => {
    try {
      const list = await knex('pm_master2').select()
      let reqData = req.query;
      let total, rows
      let {assetCategoryId,pmPlanName,startDate,endDate} = req.body;
      let filters = {}
      if(assetCategoryId){
        filters['asset_category_master.id'] = assetCategoryId;
      }

      startDate = startDate ? moment(startDate).format("YYYY-MM-DD HH:mm:ss") : ''
      endDate = endDate ? moment(endDate).format("YYYY-MM-DD HH:mm:ss") : ''

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      [total, rows] = await Promise.all([
        knex.count('* as count').from("pm_master2")
        .innerJoin('asset_category_master','pm_master2.assetCategoryId','asset_category_master.id')
          .innerJoin('task_group_schedule', 'pm_master2.id', 'task_group_schedule.pmId')
        .where(qb => {
          qb.where(filters)
          if(pmPlanName){
            qb.where('pm_master2.name', 'like', `%${pmPlanName}%`)
          }
          if(startDate){
            qb.where({'task_group_schedule.startDate':startDate})
          }
          if(endDate){
            qb.where({ 'task_group_schedule.endDate': endDate })
          }
        }),
        knex.from('pm_master2')
        .innerJoin('asset_category_master','pm_master2.assetCategoryId','asset_category_master.id')
          .innerJoin('task_group_schedule', 'pm_master2.id', 'task_group_schedule.pmId')
        .select([
          
          'asset_category_master.*',
          'pm_master2.*',
          'pm_master2.id as id'
        ]).where(qb => {
          qb.where(filters)
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

      console.log(JSON.stringify(total,2,null))
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
          pm_list:pagination
        }
      })
    } catch(err){
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      }); 
    }
  },
  createBrandNewPm:async(req,res) => {
    try {
         let payload       = req.body;
        let currentTime   = new Date().getTime();
       // CREATE PM  OPEN
      let insertPmData   = {"name":payload.pmName,'assetCategoryId':payload.assetCategoryId,createdAt:currentTime,updatedAt:currentTime};
      let insertPmResult  = await knex('pm_master2').insert(insertPmData).returning(['*'])
        createPM          = insertPmResult[0];
        return res.status(200).json({
          data: {
            pm: createPM,
            message:'Pm created Successfully'
          }
        })
    } catch(err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });  
    }
  },
  // GET TASK GROUP ASSET PMS LIST
  getTaskGroupAssetPmsList:async (req,res)=>{

    try {
        let reqData = req.query;
        let payload = req.body

        const schema     = Joi.object().keys({
          taskGroupId : Joi.string().required()
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
          knex.count('* as count').from("task_group_schedule")
          .innerJoin('task_group_schedule_assign_assets','task_group_schedule.id','task_group_schedule_assign_assets.scheduleId')
          .innerJoin('asset_master','task_group_schedule_assign_assets.assetId','asset_master.id')
          .where({"task_group_schedule.taskGroupId":payload.taskGroupId}),
          //.offset(offset).limit(per_page),
          knex("task_group_schedule")
          .innerJoin('task_group_schedule_assign_assets','task_group_schedule.id','task_group_schedule_assign_assets.scheduleId')
          .innerJoin('asset_master','task_group_schedule_assign_assets.assetId','asset_master.id')
          .select([
            'task_group_schedule_assign_assets.id as workOrderId',
            'task_group_schedule_assign_assets.status as status',
            'task_group_schedule.id as id',
            'asset_master.assetName as assetName',
            'asset_master.model as model',
            'asset_master.barcode as barcode',
            'asset_master.areaName as areaName',
            'asset_master.description as description',
            'asset_master.assetSerial as assetSerial',
            'task_group_schedule_assign_assets.pmDate as pmDate',
            'task_group_schedule.repeatPeriod as repeatPeriod',
            'task_group_schedule.repeatOn as repeatOn',
            'task_group_schedule.repeatFrequency as repeatFrequency',
          ])
          .where({"task_group_schedule.taskGroupId":payload.taskGroupId})
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
  getTaskGroupAssetPmsListOnToday: async (req, res) => {

    try {
      let reqData = req.query;
      let payload = req.body

      const schema = Joi.object().keys({
        // taskGroupId: Joi.string().required(),
        pmId:Joi.string().required(),
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
          .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
          .innerJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
          .select([
            'task_group_schedule_assign_assets.id as workOrderId',
            'task_group_schedule_assign_assets.status as status',
            'task_group_schedule.id as id',
            'asset_master.assetName as assetName',
            'asset_master.model as model',
            'asset_master.barcode as barcode',
            'asset_master.areaName as areaName',
            'asset_master.description as description',
            'asset_master.assetSerial as assetSerial',
            'task_group_schedule_assign_assets.pmDate as pmDate',
            'task_group_schedule.repeatPeriod as repeatPeriod',
            'task_group_schedule.repeatOn as repeatOn',
            'task_group_schedule.repeatFrequency as repeatFrequency',
          ])
          .where({
            "task_group_schedule.pmId": payload.pmId,
            // 'task_group_schedule_assign_assets.pmDate':payload.pmDate }) 
          }).whereRaw(`DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`),
        // knex.count('* as count').from("task_group_schedule")
        //   .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
        //   .innerJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id'),
          // .where({ "task_group_schedule.taskGroupId": payload.taskGroupId }),
        //.offset(offset).limit(per_page),
        knex("task_group_schedule")
          .innerJoin('task_group_schedule_assign_assets', 'task_group_schedule.id', 'task_group_schedule_assign_assets.scheduleId')
          .innerJoin('asset_master', 'task_group_schedule_assign_assets.assetId', 'asset_master.id')
          .select([
            'task_group_schedule_assign_assets.id as workOrderId',
            'task_group_schedule.id as id',
            'asset_master.assetName as assetName',
            'asset_master.model as model',
            'asset_master.barcode as barcode',
            'asset_master.areaName as areaName',
            'asset_master.description as description',
            'asset_master.assetSerial as assetSerial',
            'task_group_schedule_assign_assets.pmDate as pmDate',
            'task_group_schedule.repeatPeriod as repeatPeriod',
            'task_group_schedule.repeatOn as repeatOn',
            'task_group_schedule.repeatFrequency as repeatFrequency',
          ])
          .where({"task_group_schedule.pmId": payload.pmId,
         // 'task_group_schedule_assign_assets.pmDate':payload.pmDate }) 
          }).whereRaw(`DATE("task_group_schedule_assign_assets"."pmDate") = date(now())`)
          .offset(offset).limit(per_page)
      ])


  //     let str = `select tgs."id" as "id", am."assetName", am."model", am."barcode", am."areaName", am."description", am."assetSerial",
	// "task_group_schedule_assign_assets"."pmDate", tgs."repeatPeriod", tgs."repeatOn", tgs."repeatFrequency" from "task_group_schedule" as tgs
	// 	inner join "task_group_schedule_assign_assets" on tgs."id" = "task_group_schedule_assign_assets"."scheduleId"
	// 	inner join "asset_master" as am on "task_group_schedule_assign_assets"."assetId" = am."id"
	// 	where tgs."pmId" = 139 and DATE("task_group_schedule_assign_assets"."pmDate") = DATE(now()) limit 10;`
  //     pagination.data = await knex.raw(str)
  //     console.log(data)


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
  createTaskTemplate:async (req,res)=>{

    try{
       
      let createTemplate     = null;
      let createTemplateTask = null;
      let taskSchedule       = null;
      let assignedServiceTeam= null;
      let assignedAdditionalUser = null;
      
      let payload            = req.body;

      const schema     =  Joi.object().keys({
        pmId            : Joi.string().required(),
        assetCategoryId : Joi.string().required(),
        taskTemplateName: Joi.string().required(),
        tasks           : Joi.array().items(Joi.string().required()).strict().required(),
        startDateTime   : Joi.date().required(),
        endDateTime     : Joi.date().required(),
        repeatPeriod    : Joi.string().required(),
        repeatFrequency : Joi.string().required(),
        teamId          : Joi.string().required(),
        mainUserId      : Joi.string().required(),
        additionalUsers : Joi.array().items(Joi.string().required()).strict().required(),
      });

      const result = Joi.validate(_.omit(payload,'repeatOn'), schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      await knex.transaction(async trx=>{

               let currentTime = new Date().getTime();
               // CREATE TASK TEMPLATE OPEN 
               let insertTemplateData = {
                pmId:payload.pmId,
                assetCategoryId:payload.assetCategoryId,
                taskGroupName:payload.taskTemplateName,
                createdAt :currentTime,
                updatedAt :currentTime
              }
      
              let insertTemplateResult = await knex.insert(insertTemplateData).returning(['*']).transacting(trx).into('task_group_templates');
              createTemplate = insertTemplateResult[0];
              // CREATE TASK TEMPLATE CLOSE
      
              // CREATE TASK TEMPLATE OPEN 
              let tasksInsertPayload = payload.tasks.map(da=>({
                  taskName  : da,
                  templateId: createTemplate.id,
                  createdAt : currentTime,
                  updatedAt : currentTime
              }))
       
             let insertTemplateTaskResult = await knex.insert(tasksInsertPayload).returning(['*']).transacting(trx).into('template_task');
             createTemplateTask           = insertTemplateTaskResult;
            // CREATE TASK TEMPLATE CLOSE


              // TASK GROUP SCHEDULE OPEN
                let insertScheduleData = {
              taskGroupId  : createTemplate.id,
              pmId         : payload.pmId,
              startDate    : payload.startDateTime,
              endDate      : payload.endDateTime,
              repeatPeriod : payload.repeatPeriod,
              repeatOn     : payload.repeatOn,
              repeatFrequency : payload.repeatFrequency,
              createdAt    : currentTime,
              updatedAt    : currentTime
            }

            let scheduleResult = await knex.insert(insertScheduleData).returning(['*']).transacting(trx).into('task_group_template_schedule');
            taskSchedule = scheduleResult[0];
            // TASK GROUP SCHEDULE CLOSE 

           // ASSIGNED ADDITIONAL USER OPEN
      let insertAssignedAdditionalUserData = payload.additionalUsers.map(user=>({
        userId     : user,
        entityId   : createTemplate.id,
        entityType : "task_group_templates",
        createdAt  : currentTime,
        updatedAt  : currentTime
      
    }))

      let assignedAdditionalUserResult = await knex.insert(insertAssignedAdditionalUserData).returning(['*']).transacting(trx).into('assigned_service_additional_users');
      assignedAdditionalUser = assignedAdditionalUserResult;
     // ASSIGNED ADDITIONAL USER CLOSE

     // ASSIGNED TEAM OPEN
      let insertAssignedServiceTeamData = {
        teamId    : payload.teamId,
        userId    : payload.mainUserId,
        entityId  : createTemplate.id,
        entityType: "task_group_templates",
        createdAt : currentTime,
        updatedAt : currentTime
      }

      let assignedServiceTeamResult = await knex.insert(insertAssignedServiceTeamData).returning(['*']).transacting(trx).into('assigned_service_team');
      assignedServiceTeam = assignedServiceTeamResult[0];
      
     // ASSIGNED TEAM CLOSE


      })

      return res.status(200).json({
        data: {
          templateData: createTemplate,
          taskTemplateData:createTemplateTask,
          taskScheduleData:taskSchedule,
          assignedAdditionalUserData:assignedAdditionalUser,
          assignedServiceTeamData :assignedServiceTeam
        },
        message: 'Task Template Created Successfully!'
      })

    }catch(err){
           
      console.log('[controllers][task-group][create-task-template] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  // GET TASK TEMPLATE LIST
  getTaskTemplateList:async (req,res)=>{

    
     try{
      
      let  payload = req.body;
      const schema =  Joi.object().keys({
        assetCategoryId : Joi.string().required()
      })

      const result = Joi.validate(payload,schema);

       if(result && result.hasOwnProperty("error") && result.error){

        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
       }

      
      let templateResult = await knex('task_group_templates').returning('*').where({"assetCategoryId":payload.assetCategoryId});

      res.status(200).json({
        data:
        {taskTemplateData:templateResult
        },
        message:"Task Template List Successfully!"
      })


     }catch(err){
      console.log('[controllers][task-group][get-task-template-list] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
     }

  },
  // GET TASK TEMPLATE COMPLATE DATA LIST
  getTaskTemplateComplateList: async (req,res)=>{

    try {
      let reqData = req.query;
      let payload = req.body

      const schema     = Joi.object().keys({
        templateId : Joi.string().required()
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
        .innerJoin('template_task','task_group_templates.id','template_task.templateId')
        .innerJoin('task_group_template_schedule','task_group_templates.id','task_group_template_schedule.taskGroupId')
        .innerJoin('assigned_service_team','task_group_templates.id','assigned_service_team.entityId')
        .innerJoin('assigned_service_additional_users','task_group_templates.id','assigned_service_additional_users.entityId')
        .where({"task_group_templates.id":payload.templateId,'assigned_service_team.entityType':'task_group_templates','assigned_service_additional_users.entityType':'task_group_templates'}),
        //.offset(offset).limit(per_page),
        knex("task_group_templates")
        .innerJoin('template_task','task_group_templates.id','template_task.templateId')
        .innerJoin('task_group_template_schedule','task_group_templates.id','task_group_template_schedule.taskGroupId')
        .innerJoin('assigned_service_team','task_group_templates.id','assigned_service_team.entityId')
        .innerJoin('assigned_service_additional_users','task_group_templates.id','assigned_service_additional_users.entityId')
        .select([
          'assigned_service_additional_users.userId as additional_user',
          'task_group_templates.*',
          'template_task.*',
          'task_group_template_schedule.*',
          'assigned_service_team.*'
                ])
        .where({"task_group_templates.id":payload.templateId,'assigned_service_team.entityType':'task_group_templates','assigned_service_additional_users.entityType':'task_group_templates'})
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
      pagination.data = _.uniqBy(rows,'taskName');

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
  getTaskgroupAssetPmDetails:async (req,res)=>{

      try{
       let payload = req.body;

       const schema = Joi.object().keys({
        taskGroupScheduleId : Joi.string().required(),
         taskGroupScheduleAssignAssetId:Joi.string().required()
       })

       const result = Joi.validate(payload,schema);
       if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
   
         const pmResult = await knex("task_group_schedule")
         .innerJoin('task_group_schedule_assign_assets','task_group_schedule.id','task_group_schedule_assign_assets.scheduleId')
         .innerJoin('asset_master','task_group_schedule_assign_assets.assetId','asset_master.id')
         .innerJoin('pm_master2','task_group_schedule.pmId','pm_master2.id')
         .innerJoin('asset_category_master','pm_master2.assetCategoryId','asset_category_master.id')
         .innerJoin('pm_task_groups','task_group_schedule.taskGroupId','pm_task_groups.id')
         .innerJoin('assigned_service_team','pm_task_groups.id','assigned_service_team.entityId')
         .innerJoin('teams','assigned_service_team.teamId','teams.teamId')
         .innerJoin('users','assigned_service_team.userId','users.id')
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
           'task_group_schedule.startDate as startDate',
           'task_group_schedule.endDate as endDate',
           'task_group_schedule.repeatFrequency as repeatFrequency',
           'task_group_schedule.repeatOn as repeatOn',
           'teams.teamName as teamName',
           'assigned_service_team.userId as mainUserId',
           'users.name as mainUser',
           'task_group_schedule_assign_assets.pmDate'
         ])
         .where({
           'task_group_schedule.id':payload.taskGroupScheduleId,
           //'task_group_schedule.taskGroupId':payload.taskGroupId,
           'assigned_service_team.entityType':'pm_task_groups'
          })
        
          // ADDITIONAL USER OPEN
          let additionalUsers = [];
          let tasks           = [];
          if(pmResult && pmResult.length){
      additionalUsers =  await knex('assigned_service_additional_users')
                             .innerJoin('users','assigned_service_additional_users.userId','users.id')
                             .select([
                              'users.id as additionalUserId',
                              'users.name as additionalUser'
                             ])
                            .where({
                              'assigned_service_additional_users.entityType':'pm_task_groups',
                              'assigned_service_additional_users.entityId'  : pmResult[0].taskGroupId
                            })
                          
          // ADDITIONAL USER CLOSE
          // TASK OPEN
        tasks =  await knex('pm_task')
        .select([
          'pm_task.id as taskId',
          'pm_task.taskName as taskName',
          'pm_task.status as status'
        ])
        .where({
          'pm_task.taskGroupScheduleAssignAssetId': payload.taskGroupScheduleAssignAssetId
        })
      }
       // TASK CLOSE
         return res.status(200).json({
          data: {
            taskGroupPmAssetDatails : _.uniqBy(pmResult,'id'),
            additionalUsers         : additionalUsers,
            tasks                   : tasks
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
  getPmTaskDetails: async (req,res)=>{
      try{

         let {
           taskId,assetId ,scheduleId, pmDate
              } = req.body;
         let payload          = req.body;

         const schema = Joi.object().keys({
          taskId     : Joi.string().required(),
          assetId    : Joi.string().required(),
          scheduleId : Joi.string().required(),
          pmDate     : Joi.date().required()
         })
         const result = Joi.validate(payload,schema);
         if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
          });
        }

        let taskDetails = await knex('pm_task')
                          .innerJoin('pm_task_groups','pm_task.taskGroupId','pm_task_groups.id')
                          .innerJoin('pm_master2','pm_task_groups.pmId','pm_master2.id')
                          .innerJoin('task_group_schedule','pm_task_groups.id','task_group_schedule.taskGroupId')                          
                          .innerJoin('task_group_schedule_assign_assets','task_group_schedule.id','task_group_schedule_assign_assets.scheduleId')
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
                             'pm_task.id':taskId,
                             'task_group_schedule.id':scheduleId,
                             'task_group_schedule_assign_assets.scheduleId':scheduleId,
                             'task_group_schedule_assign_assets.assetId':assetId,
                             'task_group_schedule_assign_assets.pmDate':pmDate
                                 })
 
          // GERERAL DETAILS OPEN
          let generalDetails = await knex('asset_location')
          .innerJoin('asset_master','asset_location.assetId','asset_master.id')
          .innerJoin('companies','asset_location.companyId','companies.id')
          .innerJoin('property_units','asset_location.unitId','property_units.id')
          .innerJoin('buildings_and_phases','asset_location.buildingId','buildings_and_phases.id')
          .innerJoin('floor_and_zones','asset_location.floorId','floor_and_zones.id')
          .innerJoin('projects','asset_location.projectId','projects.id')
           .select([
                  'asset_master.areaName as location',
                  'companies.companyName as companyName',
                  'property_units.unitNumber as unitNumber',
                  'buildings_and_phases.buildingPhaseCode as buildingNumber',
                  'floor_and_zones.floorZoneCode as floor',
                  'projects.projectName as projectName'
            ])
          .where({
             'asset_location.assetId':assetId,
                 })
          // GERERAL DETAILS CLOSE

                    return res.status(200).json({
                            data: {
                              pmTaskDetails  : _.uniqBy(taskDetails,'pmDate'),
                              generalDetails : generalDetails
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
  updateTaskStatus: async (req,res) => {
    try {
      const payload = req.body;
      const schema = Joi.object().keys({
        taskGroupId:Joi.string().required(),
        taskId:Joi.string().required(),
        status:Joi.string().required(),
        userId:Joi.string().required()
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
      if(payload.status === 'CMTD'){
        // check id completedAt i.e current date is greater than pmDate then update completedAt and completedBy
        taskUpdated = await knex('pm_task').update({status:payload.status,completedAt:currentTime,completedBy:payload.userId}).where({taskGroupId:payload.taskGroupId,id:payload.taskId}).returning(['*'])
      } else {

        taskUpdated = await knex('pm_task').update({status:payload.status}).where({taskGroupId:payload.taskGroupId,id:payload.taskId}).returning(['*'])
      }
      return res.status(200).json({
        data: {
          taskUpdated
        },
        message: 'Task updated'
      })
    } catch(err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  sendFeedbackForTask: async(req,res) => {
    try {
      const payload = req.body;
      const schema = Joi.object().keys({
        taskId:Joi.string().required(),
        taskGroupScheduleId:Joi.string().required(),
        taskGroupId:Joi.string().required(),
        assetId:Joi.string().required(),
        description:Joi.string().required()
      })
      const result = Joi.validate(payload[0], schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }
      let curentTime = new Date().getTime()
      let fbs = req.body.map(v => ({ ...v, createdAt: curentTime, updatedAt: curentTime}))
      const addedFeedback = await knex('task_feedbacks').insert(fbs).returning(['*'])
      return res.status(200).json({
        data: {
          addedFeedback
        },
        message: 'Feedback added successfully!'
      })

    } catch(err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });
    }
  },
  editWorkOrder: async(req,res) => {
    try {
      const payload = req.body;
      let {workOrderId,teamId,additionalUsers,mainUserId,tasks} = payload
      // First based on that workOrderId update tasks
      let updatedTasks = []
      if(tasks && tasks.length) {
        for(let task of tasks){
          updatedTask = await knex('pm_task').update({taskName:task.taskName}).where({taskGroupScheduleAssignAssetId:workOrderId,id:task.id}).returning(['*'])
          updatedTasks.push(updatedTask[0]);
        }
      }



      return res.status(200).json({
        data: {
          updatedTasks
        },
        message:'Tasks updated!'
      })
   } catch(err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });      
    }
  },
  getTaskGroupDetails: async(req,res) => {
    try {
// taskGroupName: new FormControl('', [Validators.required]), done
//   tasks: new FormArray([this.createTask()]), done
//     assetCategoryId: new FormControl('', [Validators.required]), done
//       repeatFrequency: new FormControl('', [Validators.required]), 
//         repeatPeriod: new FormControl('', [Validators.required]),
//           repeatOn: new FormControl([]),
//             startDate: new FormControl('', [Validators.required]),
//               endDate: new FormControl('', [Validators.required]),
//                 additionalUsers: new FormControl('', [Validators.required]),
//                   mainUserId: new FormControl('', [Validators.required]),
//                     teamId: new FormControl('', [Validators.required])

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
        .where({'task_group_templates.id':req.body.id})
      let taskGroup = taskGroupResult[0]


      const tasks = await knex('template_task').where({templateId:req.body.id}).select('taskName','id')

      // Get the team and main user
      let team = await knex('assigned_service_team')
        .innerJoin('teams','assigned_service_team.teamId','teams.teamId')
        .innerJoin('users','assigned_service_team.userId','users.id')
        .where({
          'assigned_service_team.entityId': req.body.id,'assigned_service_team.entityType':'task_group_templates'
        })
          .select([
            'teams.teamId as teamId',
            'assigned_service_team.userId as mainUserId'
          ])
      

      const additionalUsers = await knex('assigned_service_additional_users')
        .innerJoin('users','assigned_service_additional_users.userId','users.id')
        .where({
          'assigned_service_additional_users.entityId': req.body.id, 'assigned_service_additional_users.entityType':'task_group_templates'
        }).select([
          'users.id as id'
        ])

      

      return res.status(200).json({
        data: {
          ...taskGroup,
          tasks,
          ...team[0],
          additionalUsers:additionalUsers.map(v => v.id)
        },
        message: 'Task Group Details'
      })
    } catch(err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });  
    }
  },
  updateTaskGroupDetails: async(req,res) => {
    try {
      let id = req.body.id
      let payload = _.omit(req.body,['id','additionalUsers','tasks','taskGroupName','assetCategoryId','mainUserId','teamId']);
      let tasks = req.body.tasks;
      let additionalUsers = req.body.additionalUsers;
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
      let result = await knex('task_group_templates').update({taskGroupName:req.body.taskGroupName,assetCategoryId:req.body.assetCategoryId}).where({id}).returning('*')
      updatedTaskGroupTemplate = result[0]

      let resultSchedule = await knex('task_group_template_schedule').update({...payload,repeatOn:payload.repeatOn.length?payload.repeatOn.join(','):''})
      resultScheduleData = resultSchedule[0]

      let updatedTasks = []
      let updatedUsers = []
      let updatedTaskResult
      for(let task in tasks){
        if(task.id){

          updatedTaskResult = await knex('template_task').update({taskName:task}).where({templateId:id,id:task.id}).returning('*')
          updatedTasks.push(updatedTaskResult[0])
        } else {
          updatedTaskResult = await knex('template_task').insert({ taskName: task, templateId: id }).returning('*')
          updatedTasks.push(updatedTaskResult[0])
        } 

      }

      for(let additionalUser of additionalUsers){
        let updated = await knex('assigned_service_additional_users').update({userId:additionalUser}).where({entityId:id,entityType:'task_group_templates'})
        updatedUsers.push(updated[0])
      }

      let updatedTeamResult = await knex('assigned_service_team').update({teamId:req.body.teamId,userId:req.body.mainUserId}).returning('*')
      updatedTeam = updatedTeamResult[0]

      return res.status(200).json({data: {
        updatedTaskGroupTemplate,
        resultScheduleData,
        updatedTeam,
        updatedTasks,
        updatedUsers
      }})

    } catch(err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });  
    }
  },
  getTaskGroupTemplateList: async (req,res) => {
    try {
      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex('task_group_templates').select('*'),
        knex('task_group_templates').select('*').offset(offset).limit(per_page)
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
          list:pagination
        },
        message: 'Task group template list'
      })
    } catch(err) {
      console.log('[controllers][task-group][get-pm-task-details] :  Error', err);
      res.status(500).json({
        errors: [
          { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
        ],
      });   
    }
  }
}

module.exports = taskGroupController














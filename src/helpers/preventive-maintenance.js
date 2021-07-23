const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "ap-southeast-1",
});

const pmHelper = {
  createWorkOrders: async ({ consolidatedWorkOrders, payload, orgId }) => {
    console.log(
      "consolidatedWorkOrders, payload, orgId =======>>>>>",
      consolidatedWorkOrders,
      payload,
      orgId
    );
    try {
      let createPmTaskGroup = null;
      let taskSchedule = null;
      let assetResults = [];
      let createPmTask = [];
      let partResult = [];
      let assignedAdditionalUser;
      let workOrderResult = null;

      await knex("pm_master2")
        .update({
          companyId: payload[0].companyId,
          projectId: payload[0].projectId,
        })
        .where({ id: payload[0].pmId, orgId: orgId });

      let currentPmMaster = await knex("pm_master2")
        .select("*")
        .where({ id: payload[0].pmId, orgId: orgId })
        .first();
      if (!currentPmMaster) {
        return res.status(400).json({
          errors: [
            {
              code: "CREATE_ERROR",
              message: "Failed to create PM! Please try again...",
            },
          ],
        });
      }
      console.log(
        "[controllers][task-group]: createPmTaskgroupSchedule: currentPmMaster::",
        currentPmMaster
      );

      // Amar now make the changes from here...

      await knex.transaction(async (trx) => {
        let currentTime = new Date().getTime();

        // CREATE PM TASK GROUP OPEN
        let insertPmTaskGroupData = {
          pmId: payload[0].pmId,
          assetCategoryId: payload[0].assetCategoryId,
          taskGroupName: payload[0].taskGroupName,
          createdAt: currentTime,
          updatedAt: currentTime,
          orgId: orgId,
          companyId: currentPmMaster.companyId,
        };

        let insertPmTemplateResult = await knex
          .insert(insertPmTaskGroupData)
          .returning(["*"])
          .transacting(trx)
          .into("pm_task_groups");
        console.log(
          "inserted into pm_task_groups step-1",
          insertPmTemplateResult
        );
        createPmTaskGroup = insertPmTemplateResult[0];

        await knex("pm_task_groups")
          .update({ isActive: true })
          .where({ isActive: true });

        // TASK GROUP SCHEDULE OPEN
        let insertScheduleData;
        for (let i = 0; i < payload.length; i++) {
          insertScheduleData = {
            taskGroupId: createPmTaskGroup.id,
            pmId: payload[0].pmId,
            startDate: payload[i].startDateTime,
            endDate: payload[i].endDateTime,
            repeatPeriod: payload[i].repeatPeriod,
            repeatOn: payload[i].repeatOn,
            repeatFrequency: payload[i].repeatFrequency,
            createdAt: currentTime,
            updatedAt: currentTime,
            orgId: orgId,
            companyId: currentPmMaster.companyId,
          };
          // }
        }

        let scheduleResult = await knex
          .insert(insertScheduleData)
          .returning(["*"])
          .transacting(trx)
          .into("task_group_schedule");
        console.log("inserted into task_group_schedule step-3", scheduleResult);
        taskSchedule = scheduleResult[0];

        await knex("task_group_schedule")
          .update({ isActive: true })
          .where({ isActive: true });
        // TASK GROUP SCHEDULE CLOSE

        let assetResult;
        for (let i = 0; i < consolidatedWorkOrders.length; i++) {
          console.log("[count][consolidated][i]", i);
          for (let j = 0; j < consolidatedWorkOrders[i].assets.length; j++) {
            console.log("[count][assets][j]", j);
            const assetId = consolidatedWorkOrders[i].assets[j];

            const date = consolidatedWorkOrders[i].workOrderDate;
            const frequencyTag = consolidatedWorkOrders[i].frequencyTags;

            console.log(
              "pmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm1",
              date,
              "========================"
            );

            let insertDataGroup = {
              pmDate: date,
              frequencyTagIds: JSON.stringify(frequencyTag),
              scheduleId: taskSchedule.id,
              assetId,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: orgId,
            };

            assetResult = await knex
              .insert(insertDataGroup)
              .returning(["*"])
              .transacting(trx)
              .into("task_group_schedule_assign_assets");

            console.log(
              "inserted into task_group_schedule_assign_assets step-4",
              assetResult
            );

            workOrderResult = assetResult[0];

            for (let l = 0; l < consolidatedWorkOrders[i].tasks.length; l++) {

              console.log("task name====>>>>>",consolidatedWorkOrders[i].tasks[l].taskName)
              let InsertPmTaskPayload = {
                taskName: consolidatedWorkOrders[i].tasks[l].taskName,
                taskNameAlternate:
                  consolidatedWorkOrders[i].tasks[l].taskNameAlternate,
                taskSerialNumber:
                  consolidatedWorkOrders[i].tasks[l].taskSerialNumber,
                taskGroupId: createPmTaskGroup.id,
                taskGroupScheduleAssignAssetId: assetResult[0].id,
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId,
                status: "O",
                repeatFrequencyId:
                  consolidatedWorkOrders[i].tasks[l].frequencyTagId,
                duration: consolidatedWorkOrders[i].tasks[l].duration
                  ? consolidatedWorkOrders[i].tasks[l].duration
                  : 0.0,
                hourlyRate: consolidatedWorkOrders[i].tasks[l].hourlyRate
                  ? consolidatedWorkOrders[i].tasks[l].hourlyRate
                  : 0.0,
              };

              let insertPmTaskResult = await knex
                .insert(InsertPmTaskPayload)
                .returning(["*"])
                .transacting(trx)
                .into("pm_task");
              console.log("inserted into pm_task step-5", insertPmTaskResult);

              createPmTask.push(insertPmTaskResult);
              if (consolidatedWorkOrders[i].tasks[l].linkedParts == undefined) {
              } else {
                for (let part of consolidatedWorkOrders[i].tasks[l]
                  .linkedParts) {
                  let partPayload = {
                    taskId: insertPmTaskResult[0].id,
                    partId: part.partId,
                    quantity: part.quantity,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    orgId: orgId,
                    workOrderId: assetResult[0].id,
                  };

                  let check = await knex.from("task_assigned_part").where({
                    taskId: insertPmTaskResult[0].id,
                    partId: part.partId,
                    quantity: part.quantity,
                    orgId: orgId,
                  });

                  if (check && check.length) {
                  } else {
                    let insertPartResult = await knex
                      .insert(partPayload)
                      .returning(["*"])
                      .transacting(trx)
                      .into("task_assigned_part");
                    console.log(
                      "inserted into task_assigned_part step-6",
                      insertPartResult
                    );

                    partResult.push(insertPartResult);
                  }
                }
              }
            }

            // CREATE PM TASK CLOSE
            assetResults.push(assetResult[0]);

            // ASSIGNED ADDITIONAL USER OPEN

            let insertAssignedServiceTeamData;

            insertAssignedServiceTeamData = {
              teamId: consolidatedWorkOrders[i].teamId
                ? consolidatedWorkOrders[i].teamId
                : null,
              userId: consolidatedWorkOrders[i].mainUserId
                ? consolidatedWorkOrders[i].mainUserId
                : null,
              entityId: workOrderResult.id,
              entityType: "work_order",
              workOrderId: assetResult[0].id,
              createdAt: currentTime,
              updatedAt: currentTime,
              orgId: orgId,
            };
            // }
            let assignedServiceTeamResult = await knex
              .insert(insertAssignedServiceTeamData)
              .returning(["*"])
              .transacting(trx)
              .into("assigned_service_team");
            assignedServiceTeam = assignedServiceTeamResult[0];
            console.log(
              "inserted into assigned_service_team step-7",
              assignedServiceTeamResult
            );
            // ASSIGNED ADDITIONAL USER CLOSE

            if (
              consolidatedWorkOrders[i].additionalUsers &&
              consolidatedWorkOrders[i].additionalUsers.length
            ) {
              let insertAssignedAdditionalUserData = consolidatedWorkOrders[
                i
              ].additionalUsers.map((user) => ({
                userId: user,
                entityId: workOrderResult.id,
                entityType: "work_order",
                createdAt: currentTime,
                updatedAt: currentTime,
                orgId: orgId,
              }));

              assignedAdditionalUser = await knex
                .insert(insertAssignedAdditionalUserData)
                .returning(["*"])
                .transacting(trx)
                .into("assigned_service_additional_users");
              console.log(
                "inserted into assigned_service_additional_users step-2",
                assignedAdditionalUser
              );
            }
          }
        }
      });

      let updateAssetMaster = await knex("asset_master")
        .update({ isEngaged: true })
        .whereIn("id", payload[0].assets);

      let updatemaster = await knex("pm_master2")
        .update({ isActive: true })
        .where({ id: payload[0].pmId });
      console.log("STEP - 8=============>", updatemaster);

      let updatetaskGroup = await knex("pm_task_groups")
        .update({ isActive: true })
        .where({ isActive: true, orgId: orgId });
      console.log("STEP - 9 ===========>>>>", updatetaskGroup);

      let updategroupSchedule = await knex("task_group_schedule")
        .update({ isActive: true })
        .where({ isActive: true, orgId: orgId });

      console.log("STEP - 10 ===========>>>>", updategroupSchedule);

      return {
        pmTaskGroupData: createPmTaskGroup,
        assignedAdditionalUserData: assignedAdditionalUser,
        assignedServiceTeamData: assignedServiceTeam,
        taskScheduleData: taskSchedule,
        assetResultData: assetResults,
        createdPmTasks: createPmTask,
        partResult: partResult,
      };
    } catch (err) {
      console.log(
        "[helpers][preventive-maintenance][create-work-orders]:  Error",
        err
      );
      return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    }
  },

  markWorkOrdersOverDue: async () => {
    try {

      // const moment = require("moment-timezone");
      // let timezone = 'Asia/Bangkok';
      // moment.tz.setDefault(timezone);
      // let currentTime = moment().valueOf();
      // console.log('[helpers][preventive-maintenance][markWorkOrdersOverDue]:  Current Time:', currentTime);

      const res = await knex.raw(
        `update task_group_schedule_assign_assets set "isOverdue" = true where (extract(epoch from ("pmDate"::date + interval '1 days')) *1000) < (extract(epoch from now()) * 1000) 
        and (extract(epoch from ("pmDate"::date)) *1000) > (extract(epoch from (now() - interval '2 days')) * 1000) and status = 'O' and "isOverdue" = false returning *;`
      );

      if (res && res.rows) {
        console.log('[helpers][preventive-maintenance][markWorkOrdersOverDue]: WorkOrders Marked as Overdue Count:', res.rows.length);
      }

    } catch (err) {
      console.error('[helpers][preventive-maintenance][markWorkOrdersOverDue]:  Error', err);
      return { code: 'UNKNOWN_ERROR', message: err.message, error: err };
    }
  }
};
module.exports = pmHelper;

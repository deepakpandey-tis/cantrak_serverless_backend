const Joi = require("@hapi/joi");
const _ = require("lodash");
const AWS = require("aws-sdk");
const knex = require("../db/knex");
const moment = require("moment-timezone");

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION || "us-east-1",
});

const testHelper = {
  setCompletedWO: async () => {
    try {
      let currentTime = new Date().getTime();

      let currentDate = moment().format("YYYY-MM-DD");

      console.log("current date", currentDate);

      let workOrders = await knex(
        "task_group_schedule_assign_assets"
      )
        .select(["id", "status", "completedAt"])
        .whereRaw(
          `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')<'${currentDate}'`
        )
        .where((qb) => {
        //   qb.where({ status: "O" })
          qb.orWhere({ status: "COM" });
        })
        .whereNull("completedAt");

      console.log("work orders", workOrders);

      const Parallel = require("async-parallel");
      Parallel.setConcurrency(20);

      await Parallel.each(workOrders, async (pd) => {
        let workResult = await knex("pm_task")
          .count("*")
          .where({
            taskGroupScheduleAssignAssetId: pd.id,
          })
          .first();

        let completedTask = await knex("pm_task")
          .count("*")
          .where({
            taskGroupScheduleAssignAssetId: pd.id,
            status: "COM",
          })
          .first();

        console.log(
          "work result====>>>",
          workResult,
          "=======",
          completedTask
        );

        if (workResult.count == completedTask.count) {
          let maxTime = await knex("pm_task")
            .max("updatedAt")
            .where({
              taskGroupScheduleAssignAssetId: pd.id,
              status: "COM",
            })
            .first();

          console.log("max time====>>>", maxTime);

          if (maxTime) {
            await knex("task_group_schedule_assign_assets")
              .update({
                status: "COM",
                updatedAt: currentTime,
                completedAt: maxTime.max,
              })
              .where({ id: pd.id });
          }
        }
      });
    } catch (err) {
      res.status(200).json({ failed: true, error: err });
    }
  },

  setOpenWorkOrder: async () => {
    try {
      let currentTime = new Date().getTime();

      let currentDate = moment().format("YYYY-MM-DD");

      console.log("current date", currentDate);

      let workOrders = await knex(
        "task_group_schedule_assign_assets"
      )
        .select(["id", "status", "completedAt"])
        .whereRaw(
          `to_date(task_group_schedule_assign_assets."pmDate",'YYYY-MM-DD')<'${currentDate}'`
        )
        .where((qb) => {
          qb.where({ status: "O" })
        //   qb.orWhere({ status: "COM" });
        })
        .whereNull("completedAt");

      console.log("work orders", workOrders);

      const Parallel = require("async-parallel");
      Parallel.setConcurrency(20);

      await Parallel.each(workOrders, async (pd) => {
        let workResult = await knex("pm_task")
          .count("*")
          .where({
            taskGroupScheduleAssignAssetId: pd.id,
          })
          .first();

        let completedTask = await knex("pm_task")
          .count("*")
          .where({
            taskGroupScheduleAssignAssetId: pd.id,
            status: "COM",
          })
          .first();

        console.log(
          "work result====>>>",
          workResult,
          "=======",
          completedTask
        );

        if (workResult.count == completedTask.count) {
          let maxTime = await knex("pm_task")
            .max("updatedAt")
            .where({
              taskGroupScheduleAssignAssetId: pd.id,
              status: "COM",
            })
            .first();

          console.log("max time====>>>", maxTime);

          if (maxTime) {
            await knex("task_group_schedule_assign_assets")
              .update({
                status: "COM",
                updatedAt: currentTime,
                completedAt: maxTime.max,
              })
              .where({ id: pd.id });
          }
        }
      });
    } catch (err) {
      res.status(200).json({ failed: true, error: err });
    }
  },


};

module.exports = testHelper;

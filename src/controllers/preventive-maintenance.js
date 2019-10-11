const Joi = require("@hapi/joi");
const _ = require("lodash");
const moment = require("moment");

const knex = require("../db/knex");

const trx = knex.transaction();

function getYears(mils) {
  let years = Math.ceil(mils / (1000 * 60 * 60 * 24 * 365));
  return years;
}

const pmController = {
  createPmTaskSchedule: async (req, res) => {
    try {
      let noOfDates = null;
      let pmPerformingDates = [];
      await knex.transaction(async trx => {
        let payload = req.body;
        let repeatType = payload.repeatType;
        if (repeatType === "WEEK" && repeatOn) {
          // we know its weekly task
        } else if (repeatType === "MONTH") {
          // its a monthly task
        } else if (repeatType === "YEAR") {
          // its a yealy task
          noOfDates = getYears(
            new Date(payload.pmEndDateTime) - new Date(payload.pmStartDateTime)
          );

          for (let i = 0; i <= noOfDates; i++) {
            pmPerformingDates.push(
              new Date(payload.pmStartDateTime).setFullYear(
                new Date(payload.pmStartDateTime).getFullYear() + i
              )
            );
          }
        } else if (repeatType === "DAY") {
          // its daily task
        }
        trx.commit;
      });
      return res.status(200).json({
        data: {
          noOfDates,
          pmPerformingDates
        }
      });
    } catch (err) {
      console.log("[controllers][people][UpdatePeople] :  Error", err);
      trx.rollback;
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPmTaskScheduleList: async (req, res) => {
    try {
      let pmPayload = req.body;

      let filterList = {};
      let newCreatedDate = "";
      let newCreatedDateTo = "";

      let pagination = {};
      let per_page = req.query.per_page || 10;
      let page = req.query.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      if (pmPayload.isFilterActive == "true") {
        // assetType
        if (
          pmPayload.assetType != "undefined" &&
          pmPayload.assetType != "" &&
          pmPayload.assetType
        ) {
          filterList["pm.assetCategoryId"] = pmPayload.assetType;
        }

        // assetSerial
        if (pmPayload.assetSerial != "undefined" && pmPayload.assetSerial) {
          filterList["asass.assetId"] = pmPayload.assetSerial;
        }

        // project
        if (pmPayload.project != "undefined" && pmPayload.project) {
          filterList["pro.project"] = pmPayload.project;
        }

        // floor
        if (pmPayload.floor != "undefined" && pmPayload.floor) {
          filterList["pro.floor"] = pmPayload.floor;
        }

        // building
        if (
          (pmPayload.building != "undefined",
          pmPayload.building != "" && pmPayload.building)
        ) {
          filterList["pro.building"] = pmPayload.building;
        }

        // assignedTeam
        if (
          pmPayload.assignedTeam != "undefined" &&
          pmPayload.assignedTeam != "" &&
          pmPayload.assignedTeam
        ) {
          filterList["assTeam.teamId"] = pmPayload.assignedTeam;
        }

        // assignedUser
        if (
          pmPayload.assignedUser != "undefined" &&
          pmPayload.assignedUser != "" &&
          pmPayload.assignedUser
        ) {
          filterList["addUser.assignedUser"] = pmPayload.assignedUser;
        }

        // pmFromDate DATES
        if (
          pmPayload.pmFromDate != "undefined" &&
          pmPayload.pmFromDate != "" &&
          pmPayload.pmFromDate &&
          pmPayload.pmToDate != "undefined" &&
          pmPayload.pmToDate != "" &&
          pmPayload.pmToDate
        ) {
          let myDate = pmPayload.pmFromDate;
          console.log("fromDate", myDate);
          newCreatedDate = new Date(myDate).getTime();

          let myDateTo = pmPayload.pmToDate;
          console.log("toDate", myDateTo);
          newCreatedDateTo = new Date(myDateTo).getTime();
        }

        console.log("Filter Query", filterList);

        /* Get List of survey order List By Filter Data */

        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("pm_master As pm")
          .where(qb => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("pm.createdAt", [
                newCreatedDate,
                newCreatedDateTo
              ]);
            }
          })
          .innerJoin("pm_assign_assets as asass", "pm.id", "asass.assetId")
          .leftJoin(
            "assigned_service_team AS assTeam",
            "pm.id",
            "assTeam.entityId"
          )
          .select("pm.id AS pmId", "pm.createdAt AS createdAt")
          .groupBy([
            "pm.id",
            // "pm.id",
            "asass.id",
            "assTeam.id"
          ]);

        // For Get Rows In Pagination With Offset and Limit
        rows = await knex
          .select("pm.id AS pmId", "pm.createdAt AS createdAt")
          .from("pm_master As pm")
          .where(qb => {
            qb.where(filterList);
            if (newCreatedDate || newCreatedDateTo) {
              qb.whereBetween("pm.createdAt", [
                newCreatedDate,
                newCreatedDateTo
              ]);
            }
          })
          .innerJoin("pm_assign_assets as asass", "pm.id", "asass.assetId")
          .leftJoin(
            "assigned_service_team AS assTeam",
            "pm.id",
            "assTeam.entityId"
          )
          .offset(offset)
          .limit(per_page);
      } else if (pmPayload.isFilterActive == "false") {
        /* Get List of All survey order of particular service requests */
        // For get the totalCount
        total = await knex
          .count("* as count")
          .from("pm_master")
          .where({ isActive: "true" })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .groupBy(["pm_master.id"])
          .select(["pm_master.*"]);

        // For get the rows With pagination
        rows = await knex
          .select()
          .from("pm_master")
          .where({ isActive: "true" })
          .innerJoin(
            "service_requests",
            "survey_orders.serviceRequestId",
            "service_requests.id"
          )
          .select(["pm_master.*"])
          .offset(offset)
          .limit(per_page);
      }

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
        data: pagination,
        message: "Preventive Maintenance List"
      });
    } catch (err) {
      console.log("[controllers][pm][getPmTaskScheduleList] :  Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getPmTaskScheduleLists: async (req, res) => {
    try {
      let reqData = req.query;
      let pagination = {};
      console.log("request params", reqData);
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex
          .count("* as count", "pm_master.*")
          .from("pm_master")
          .where({ "pm_master.isActive": "true" })
          .offset(offset)
          .limit(per_page)
          .first(),
        knex
          .from("pm_master")
          .innerJoin(
            "assigned_service_team",
            "pm_master.id",
            "=",
            "assigned_service_team.entityId",
            "assigned_service_team.entityType",
            "=",
            "pm_master"
          )
          .innerJoin(
            "incident_categories",
            "pm_master.assetCategoryId",
            "=",
            "incident_categories.id"
          )
          .offset(offset)
          .limit(per_page)
      ]);

      let count = total.count;
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
          pmTask: pagination
        },
        message: "PM Task Scheduled List!"
      });
    } catch (err) {
      console.log("[controllers][pm][getpmList] : Error", err);
      trx.rollback;
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  viewFeedbacksReport: async (req, res) => {
    try {
      let feedbacksView = null;
      let payload = req.body;
      const schema = Joi.object().keys({
        pmMasterId: Joi.number().required(),
        taskId: Joi.number().required()
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }]
        });
      }

      let feedbacksData = await knex("pm_feedbacks")
        .select()
        .where({ pmMasterId: payload.pmMasterId, taskId: payload.taskId });

      feedbacksView = _.omit(feedbacksData[0], [
        "createdAt",
        "updatedAt",
        "isActive"
      ]);

      return res.status(200).json({
        data: {
          feedbacks: feedbacksView
        },
        message: "Feedback details"
      });

    } catch (err) {
      console.log("[controllers][pm][viewFeedback] : Error", err);
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
};

module.exports = pmController;

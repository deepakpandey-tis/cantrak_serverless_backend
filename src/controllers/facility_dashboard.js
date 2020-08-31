const knex = require("../db/knex");
const Moment = require("moment");
const MomentRange = require("moment-range");
const moment = MomentRange.extendMoment(Moment);
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const { select } = require("underscore");

const facilityDashboardController = {
  getFacilityBookingsBwDates: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let {
        facilityName,
        status,
        queryStartDate,
        queryEndDate,
        clickValue,
      } = req.body;
      let totalFacilityBookings = null;
      console.log("requested", facilityName, status);
      let Status;
      if (status) {
        Status = status.join(",");
      }
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(queryStartDate),
        new Date(queryEndDate)
      );

      console.log("dates", dates);

      let final = [];

      for (d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();
        let currentDate = new Date().getTime();
        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();
        if (
          (facilityName && facilityName.length > 0) ||
          (status && status.length > 0)
        ) {
          console.log("if selected");
          totalFacilityBookings = await knex
            .from("entity_bookings")
            // .leftJoin(
            //   "facility_master",
            //   "entity_bookings.entityId",
            //   "facility_master.id"
            // )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              "entity_bookings.bookedAt",
              "entity_bookings.bookedBy",
              "entity_bookings.noOfSeats",
              "entity_bookings.entityId",
              "entity_bookings.bookingStartDateTime",
              "entity_bookings.bookingEndDateTime",
              "entity_bookings.feesPaid",
              "entity_bookings.isBookingConfirmed",
              "entity_bookings.isBookingCancelled",
              "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            .where({ "entity_bookings.orgId": orgId })
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .where((qb) => {
              if (facilityName) {
                qb.whereIn("facility_master.name", facilityName);
              }
              if (status) {
                console.log("Status of status", Status);
                if (Status == "Pending") {
                  console.log("Pending", status);
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                }
                if (Status == "Approved") {
                  console.log("Approved", status);
                  qb.where({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.confirmedType": 0,
                    "entity_bookings.isBookingCancelled": false,
                  });
                }
                if (Status == "Confirmed") {
                  console.log("Confirmed", status);
                  qb.where({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.isBookingCancelled": false,
                    "entity_bookings.confirmedType": 1,
                  });
                }
                if (Status == "Cancelled") {
                  console.log("Cancelled", status);
                  qb.where("entity_bookings.isBookingCancelled", true);
                }
                if (Status == "Approved,Pending,Cancelled,Confirmed") {
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingCancelled", false);
                }
                if (Status == "Approved,Pending,Cancelled,Confirmed,0") {
                  console.log("All status 0", status);

                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingCancelled", false);
                }
                if (Status === "Approved,Pending,Confirmed") {
                  console.log("Pending, Approved,Confirmed ", status);
                  qb.where({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.confirmedType": 0,
                    "entity_bookings.isBookingCancelled": false,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.confirmedType": null,
                    "entity_bookings.isBookingCancelled": false,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": false,
                    "entity_bookings.isBookingCancelled": false,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.isBookingCancelled": false,
                    "entity_bookings.confirmedType": 1,
                  });
                }
                if (Status === "Approved,Cancelled") {
                  qb.where({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.confirmedType": 0,
                  });
                  qb.where({
                    "entity_bookings.isBookingCancelled": true,
                    "entity_bookings.confirmedType": 0,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.confirmedType": 0,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingCancelled": true,
                    "entity_bookings.confirmedType": 0,
                  });
                }
                if (Status === "Approved,Confirmed") {
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", false);
                }
                if (Status === "Approved,Pending") {
                  console.log("Pending and approved", Status);
                  qb.where({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.isBookingCancelled": false,
                    "entity_bookings.confirmedType": 0,
                  });

                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": false,
                    "entity_bookings.isBookingCancelled": false,
                    "entity_bookings.confirmedType": 0,
                  });
                }
                if (Status === "Pending Confirmed") {
                  qb.where({
                    "entity_bookings.isBookingConfirmed": false,
                    "entity_bookings.isBookingCancelled": false,
                    "entity_bookings.confirmedType": 0,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.isBookingCancelled": false,
                    "entity_bookings.confirmedType": 1,
                  });
                }
                if (Status === "Pending,Cancelled") {
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingCancelled", true);
                }
                if (Status === "Approved,Pending,Cancelled") {
                  qb.where({
                    "entity_bookings.isBookingConfirmed": true,
                    "entity_bookings.confirmedType": 0,
                  });
                  qb.orWhere({
                    "entity_bookings.isBookingConfirmed": false,
                    "entity_bookings.confirmedType": 0,
                  });

                  qb.orWhere({
                    "entity_bookings.isBookingCancelled": true,
                    "entity_bookings.confirmedType": 0,
                  });
                }
                if (Status === "Approved,Cancelled,Confirmed") {
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                }
                if (Status === "Pending,Cancelled,Confirmed") {
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.confirmedType", 1);
                }
                if (Status === "Cancelled,Confirmed") {
                  qb.where({ "entity_bookings.isBookingCancelled": true });
                  qb.orWhere({
                    "entity_bookings.confirmedType": 1,
                    "entity_bookings.isBookingConfirmed": true,
                  });
                }
              }
            })
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        } else {
          console.log("else selected");
          totalFacilityBookings = await //    Promise.all([
          knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            .where({ "entity_bookings.orgId": orgId })
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");
          //   ])

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        }
      }
      res.status(200).json({
        data: { final },
        message: "facility booking records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getTotalFacilityBookings: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let { facilityName } = req.body;
      totalFacilityBookings = null;
      console.log("requested for total booking1", req.body);
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(reqData.queryStartDate),
        new Date(reqData.queryEndDate)
      );

      console.log("dates", dates);

      let final = [];

      for (d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();

        // [totalFacilityBookings] = await Promise.all([
        if (facilityName && facilityName.length > 0) {
          console.log("if selected for total", facilityName);
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            .where({ "entity_bookings.orgId": orgId })
            .whereIn("facility_master.name", facilityName)
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        } else {
          console.log("else selected for total");
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              "entity_bookings.bookedAt",
              "entity_bookings.bookedBy",
              "entity_bookings.noOfSeats",
              "entity_bookings.entityId",
              "entity_bookings.bookingStartDateTime",
              "entity_bookings.bookingEndDateTime",
              "entity_bookings.feesPaid",
              "entity_bookings.isBookingConfirmed",
              "entity_bookings.isBookingCancelled",
              "entity_bookings.createdAt",
              "facility_master.name",
              "users.name as bookedUser",
            ])
            .where({ "entity_bookings.orgId": orgId })
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        }
      }
      res.status(200).json({
        data: { final },
        message: "facility booking records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getApprovedFacilityBookings: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let { facilityName } = req.body;
      totalFacilityBookings = null;
      console.log("requested for total", req.body);
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(reqData.queryStartDate),
        new Date(reqData.queryEndDate)
      );

      console.log("dates", dates);

      let final = [];

      for (d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();

        // [totalFacilityBookings] = await Promise.all([
        if (facilityName && facilityName.length > 0) {
          console.log("if selected for total", facilityName);
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              "entity_bookings.bookedAt",
              "entity_bookings.bookedBy",
              "entity_bookings.noOfSeats",
              "entity_bookings.entityId",
              "entity_bookings.bookingStartDateTime",
              "entity_bookings.bookingEndDateTime",
              "entity_bookings.feesPaid",
              "entity_bookings.isBookingConfirmed",
              "entity_bookings.isBookingCancelled",
              "entity_bookings.createdAt",
              "facility_master.name",
              "users.name as bookedUser",
            ])
            .where({ "entity_bookings.orgId": orgId })
            .where({
              "entity_bookings.isBookingConfirmed": true,
              "entity_bookings.confirmedType": 0,
              "entity_bookings.isBookingCancelled": false,
            })
            // .orWhere({
            //   "entity_bookings.isBookingConfirmed": true,
            //   "entity_bookings.confirmedType": null,
            //   "entity_bookings.isBookingCancelled": false,
            // })
            .whereIn("facility_master.name", facilityName)
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        } else {
          console.log("else selected for total");
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              "entity_bookings.bookedAt",
              "entity_bookings.bookedBy",
              "entity_bookings.noOfSeats",
              "entity_bookings.entityId",
              "entity_bookings.bookingStartDateTime",
              "entity_bookings.bookingEndDateTime",
              "entity_bookings.feesPaid",
              "entity_bookings.isBookingConfirmed",
              "entity_bookings.isBookingCancelled",
              "entity_bookings.createdAt",
              "facility_master.name",
              "users.name as bookedUser",
            ])
            .where({ "entity_bookings.orgId": orgId })
            .where({
              "entity_bookings.isBookingConfirmed": true,
              "entity_bookings.confirmedType": 0,
              "entity_bookings.isBookingCancelled": false,
            })
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
          // ])
        }
      }
      res.status(200).json({
        data: { final },
        message: "facility booking records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getCancelledFacilityBookings: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let { facilityName } = req.body;
      totalFacilityBookings = null;
      console.log("requested for total", req.body);
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(reqData.queryStartDate),
        new Date(reqData.queryEndDate)
      );

      console.log("dates", dates);

      let final = [];

      for (d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();

        // [totalFacilityBookings] = await Promise.all([
        if (facilityName && facilityName.length > 0) {
          console.log("if selected for total", facilityName);
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            .where({
              "entity_bookings.orgId": orgId,
              "entity_bookings.isBookingCancelled": true,
            })
            // .where("entity_bookings.isBookingCancelled", true)
            .whereIn("facility_master.name", facilityName)
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        } else {
          console.log("else selected for total");
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            .where({
              "entity_bookings.orgId": orgId,
              "entity_bookings.isBookingCancelled": true,
            })
            // .where("entity_bookings.isBookingCancelled", true)
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
          // ])
        }
      }
      res.status(200).json({
        data: { final },
        message: "facility booking records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getConfirmedFacilityBooking: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let { facilityName } = req.body;
      totalFacilityBookings = null;
      console.log("requested for total", req.body);
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(reqData.queryStartDate),
        new Date(reqData.queryEndDate)
      );

      console.log("dates", dates);

      let final = [];

      for (d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();

        if (facilityName && facilityName.length > 0) {
          console.log("if selected for total", facilityName);
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            // .where({ "entity_bookings.orgId": orgId })
            .where({
              "entity_bookings.orgId": orgId,
              "entity_bookings.isBookingConfirmed": true,
              "entity_bookings.isBookingCancelled": false,
              "entity_bookings.confirmedType": 1,
            })
            .whereIn("facility_master.name", facilityName)
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        } else {
          console.log("else selected for total");
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            // .where({ "entity_bookings.orgId": orgId })
            .where({
              "entity_bookings.orgId": orgId,
              "entity_bookings.isBookingConfirmed": true,
              "entity_bookings.isBookingCancelled": false,
              "entity_bookings.confirmedType": 1,
            })
            // .orWhere({
            //   "entity_bookings.isBookingConfirmed": true,
            //   "entity_bookings.isBookingCancelled": false,
            //   "entity_bookings.confirmedType": null,
            // })
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        }
      }
      res.status(200).json({
        data: { final },
        message: "facility booking records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getPendingFacilityBookings: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let { facilityName } = req.body;
      totalFacilityBookings = null;
      console.log("requested for total", req.body);
      var getDaysArray = function (start, end) {
        let dt = start;
        let arr = [];
        for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
          arr.push(new Date(dt));
        }
        return arr;
      };

      var dates = getDaysArray(
        new Date(reqData.queryStartDate),
        new Date(reqData.queryEndDate)
      );

      console.log("dates", dates);

      let final = [];

      for (d of dates) {
        let startNewDate = moment(d).startOf("date").format();
        let endNewDate = moment(d).endOf("date", "day").format();

        let currentStartTime = new Date(startNewDate).getTime();
        let currentEndTime = new Date(endNewDate).getTime();

        // [totalFacilityBookings] = await Promise.all([
        if (facilityName && facilityName.length > 0) {
          console.log("if selected for total", facilityName);
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            // .where({ "entity_bookings.orgId": orgId })
            .where({
              "entity_bookings.orgId": orgId ,
              "entity_bookings.isBookingConfirmed": false,
              "entity_bookings.isBookingCancelled": false,
            })
            .whereIn("facility_master.name", facilityName)
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
        } else {
          console.log("else selected for total");
          totalFacilityBookings = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .select([
              "entity_bookings.entityId",
              // "entity_bookings.bookedAt",
              // "entity_bookings.bookedBy",
              // "entity_bookings.noOfSeats",
              // "entity_bookings.entityId",
              // "entity_bookings.bookingStartDateTime",
              // "entity_bookings.bookingEndDateTime",
              // "entity_bookings.feesPaid",
              // "entity_bookings.isBookingConfirmed",
              // "entity_bookings.isBookingCancelled",
              // "entity_bookings.createdAt",
              // "facility_master.name",
              // "users.name as bookedUser",
            ])
            // .where({ "entity_bookings.orgId": orgId })
            .where({
              "entity_bookings.orgId": orgId,
              "entity_bookings.isBookingConfirmed": false,
              "entity_bookings.isBookingCancelled": false,
            })
            .whereBetween("entity_bookings.createdAt", [
              currentStartTime,
              currentEndTime,
            ])
            .orderBy("entity_bookings.id", "asc");

          final.push({
            date: moment(d).format("L"),
            totalFacilityBookings: _.uniqBy(totalFacilityBookings, "id").length,
          });
          // ])
        }
        // final.push({
        //     date:moment(d).format("L"),
        //     totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
        // })
      }
      res.status(200).json({
        data: { final },
        message: "facility booking records",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getFacilityDasboardData: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      console.log("requested dates", reqData);

      let startNewDate = moment(reqData.queryStartDate)
        .startOf("date")
        .format();
      let endNewDate = moment(reqData.queryEndDate)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();
      const [
        total,
        approved,
        cancelled,
        confirmed,
        pending,
      ] = await Promise.all([
        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .orderBy("entity_bookings.id", "asc"),

        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.confirmedType": 0,
            "entity_bookings.isBookingCancelled": false,
          })
          .orWhere({
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.confirmedType": null,
            "entity_bookings.isBookingCancelled": false,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .orderBy("entity_bookings.id", "asc"),

        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where("entity_bookings.isBookingCancelled", true)
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .orderBy("entity_bookings.id", "asc"),

        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.isBookingCancelled": false,
            "entity_bookings.confirmedType": 1,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .orderBy("entity_bookings.id", "asc"),

        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": false,
            "entity_bookings.isBookingCancelled": false,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .orderBy("entity_bookings.id", "asc"),
      ]);

      let totalBookings = total.length;
      let approvedBookings = approved.length;
      let cancelledBookings = cancelled.length;
      let confirmedBookings = confirmed.length;
      let pendingBookings = pending.length;

      return res.status(200).json({
        data: {
          totalBookings,
          approvedBookings,
          cancelledBookings,
          confirmedBookings,
          pendingBookings,
        },
      });
    } catch (err) {
      console.log(
        "[controllers][facility_dashboard][getBookingCount] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getPieChartForFacilityBookings: async (req, res) => {
    try {
      let reqData = req.body;
      let orgId = req.orgId;
      let approved;
      let cancelled;
      let confirmed;
      let pending;
      let { queryStartDate, queryEndDate, facilityName, status } = req.body;
      console.log("pie chart", queryStartDate, queryEndDate);
      let startNewDate = moment(reqData.queryStartDate)
        .startOf("date")
        .format();
      let endNewDate = moment(reqData.queryEndDate)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();
      if (facilityName && facilityName.length > 0) {
        console.log("if selected for cancelled");
        approved = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
            "facility_master.name",
            "users.name as bookedUser",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.confirmedType": 0,
            "entity_bookings.isBookingCancelled": false,
          })

          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .whereIn("facility_master.name", facilityName);

        cancelled = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
            "facility_master.name",
            "users.name as bookedUser",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({ "entity_bookings.isBookingCancelled": true })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .whereIn("facility_master.name", facilityName);

        confirmed = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
            "facility_master.name",
            "users.name as bookedUser",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.isBookingCancelled": false,
            "entity_bookings.confirmedType": 1,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .whereIn("facility_master.name", facilityName);

        pending = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookedAt",
            "entity_bookings.bookedBy",
            "entity_bookings.noOfSeats",
            "facility_master.name",
            "users.name as bookedUser",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": false,
            "entity_bookings.isBookingCancelled": false,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .whereIn("facility_master.name", facilityName);
      } else {
        console.log(
          "else selected for cancelled approved",
          currentEndTime,
          currentStartTime
        );
        approved = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            // "entity_bookings.bookedAt",
            // "entity_bookings.bookedBy",
            // "entity_bookings.noOfSeats",
            // "facility_master.name",
            // "users.name as bookedUser",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.confirmedType": 0,
            "entity_bookings.isBookingCancelled": false,
          })

          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ]);
        cancelled = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            // "entity_bookings.bookedAt",
            // "entity_bookings.bookedBy",
            // "entity_bookings.noOfSeats",
            // "facility_master.name",
            // "users.name as bookedUser",
          ])
          // .where("entity_bookings.orgId", orgId)
          .where({"entity_bookings.isBookingCancelled": true,"entity_bookings.orgId": orgId})
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ]);
        confirmed = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            // "entity_bookings.bookedAt",
            // "entity_bookings.bookedBy",
            // "entity_bookings.noOfSeats",
            // "facility_master.name",
            // "users.name as bookedUser",
          ])
          // .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.orgId": orgId,
            "entity_bookings.isBookingConfirmed": true,
            "entity_bookings.isBookingCancelled": false,
            "entity_bookings.confirmedType": 1,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ]);
        pending = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            // "entity_bookings.bookedAt",
            // "entity_bookings.bookedBy",
            // "entity_bookings.noOfSeats",
            // "facility_master.name",
            // "users.name as bookedUser",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .where({
            "entity_bookings.orgId": orgId,
            "entity_bookings.isBookingConfirmed": false,
            "entity_bookings.isBookingCancelled": false,
          })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ]);
      }
      let APPROVED = approved.length;
      let CANCELLED = cancelled.length;
      let CONFIRMED = confirmed.length;
      let PENDING = pending.length;

      return res.status(200).json({
        data: {
          APPROVED,
          CANCELLED,
          CONFIRMED,
          PENDING,
        },
        data1: { approved, cancelled, confirmed, pending },
      });
    } catch (err) {
      console.log(
        "[controllers][facility_dashboard][getBookingCount] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getBookingForAverageDuration: async (req, res) => {
    try {
      let orgId = req.orgId;
      let reqData = req.body;
      let { facilityName } = req.body;
      let bookingDuration;

      let startNewDate = moment(reqData.queryStartDate)
        .startOf("date")
        .format();
      let endNewDate = moment(reqData.queryEndDate)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();
      if (facilityName && facilityName.length > 0) {
        bookingDuration = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            // "entity_bookings.bookingStartDateTime",
            // "entity_bookings.bookingEndDateTime",
            // "entity_bookings.createdAt",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ])
          .whereIn("facility_master.name", facilityName);
      } else {
        bookingDuration = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          // .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.entityId",
            "entity_bookings.bookingStartDateTime",
            "entity_bookings.bookingEndDateTime",
            "entity_bookings.createdAt",
          ])
          .where({ "entity_bookings.orgId": orgId })
          .whereBetween("entity_bookings.createdAt", [
            currentStartTime,
            currentEndTime,
          ]);
      }
      return res.status(200).json({
        data: bookingDuration,
      });
    } catch (err) {
      console.log(
        "[controllers][facility_dashboard][getBookingDuration] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
};
module.exports = facilityDashboardController;

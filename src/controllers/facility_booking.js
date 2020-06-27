const knex = require("../db/knex");
const Joi = require("@hapi/joi");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const moment = require("moment");
const QRCODE = require("qrcode");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");

const emailHelper = require("../helpers/email");
const facilityHelper = require("../helpers/facility");

const _ = require("lodash");

const facilityBookingController = {
  addFacility: async (req, res) => {
    try {
      let addedFacilityResult = null;
      let addedRules = [];
      let addedOpenCloseTimeResult = [];
      let insertedImages = [];
      let feesResult = [];
      let bookingFrequencyResult = [];
      let addedBookingCriteriaResult = [];
      let message;
      let bookingQuotaResult = [];
      await knex.transaction(async (trx) => {
        const payload = _.omit(req.body, [
          "rules_and_regulations",
          "open_close_times",
          "images",
          "fees_payload",
          "booking_frequency",
          "booking_criteria",
          "facilityId",
          "descriptionAlternateLang",
          "statuses",
          "bookingQuota",
        ]);

        const schema = Joi.object().keys({
          name: Joi.string().required(),
          companyId: Joi.string().required(),
          projectId: Joi.string().required(),
          buildingPhaseId: Joi.string().required(),
          floorZoneId: Joi.string().required(),
          description: Joi.string().required(),
          // "descriptionAlternateLang": Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }

        let payloadOpeing = req.body.open_close_times;
        let OpeningDayStatus = false;

        for (let o of payloadOpeing) {
          if (o.day && o.openTime && o.closeTime) {
            OpeningDayStatus = true;
          }
        }

        if (OpeningDayStatus == false) {
          return res.status(400).json({
            errors: [
              {
                code: "VALIDATION_ERROR",
                message: "Please add At least 1 complete opeing hour!",
              },
            ],
          });
        }

        let checkUpdate = await knex("facility_master")
          .where({ id: req.body.facilityId })
          .first();

        if (checkUpdate && checkUpdate.moderationStatus == true) {
          message = "Facility updated successfully!";
        } else {
          message = "Facility added successfully!";
        }

        let currentTime = new Date().getTime();
        let descriptionAlternateLang = req.body.descriptionAlternateLang
          ? req.body.descriptionAlternateLang
          : "";
        // Insert Facility
        let addedFacilityResultData = await knex("facility_master")
          .update({
            ...payload,
            descriptionAlternateLang,
            updatedAt: currentTime,
            createdAt: currentTime,
            orgId: req.orgId,
            createdBy: req.me.id,
            bookingStatus: req.body.statuses.bookingStatus,
            moderationStatus: true,
            multipleSeatsLimit: req.body.statuses.multipleSeatsLimit,
            status: false,
          })
          .where({ id: req.body.facilityId })
          .returning(["*"]);
        addedFacilityResult = addedFacilityResultData[0];

        // Insert Rules

        let rulesPayload = req.body.rules_and_regulations;

        let delRule = await knex("rules_and_regulations")
          .where({
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
          })
          .del();

        addedRules = [];
        for (let rule of rulesPayload) {
          /*
                    {rules,
                    "rulesAlternateLang",}
                    */
          let addedRulesResult = await knex("rules_and_regulations")
            .insert({
              entityId: addedFacilityResult.id,
              entityType: "facility_master",
              ...rule,
              updatedAt: currentTime,
              createdAt: currentTime,
              orgId: req.orgId,
              createdBy: req.me.id,
            })
            .returning(["*"]);
          addedRules.push(addedRulesResult[0]);
        }

        // Open Close Time
        /*
                {"day",
                "openTime",
                "closeTime"
                */

        const open_close_times = req.body.open_close_times;
        let delOpeing = await knex("entity_open_close_times")
          .where({
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
          })
          .del();
        addedOpenCloseTimeResult = [];
        let sr = 0;
        for (let a of open_close_times) {
          sr++;
          if (a.day && a.openTime && a.closeTime) {
            addedOpenCloseTimeResultData = await knex("entity_open_close_times")
              .insert({
                entityId: addedFacilityResult.id,
                entityType: "facility_master",
                ...a,
                updatedAt: currentTime,
                createdAt: currentTime,
                orgId: req.orgId,
              })
              .returning(["*"]);

            addedOpenCloseTimeResult.push(addedOpenCloseTimeResultData[0]);
          }
        }

        // Images
        const images = req.body.images;
        insertedImages = [];
        for (let img of images) {
          let insertedImage = await knex("images")
            .insert({
              entityType: "facility_master",
              entityId: addedFacilityResult.id,
              s3Url: img.s3Url,
              name: img.filename,
              title: img.title,
              orgId: req.orgId,
              updatedAt: currentTime,
              createdAt: currentTime,
            })
            .returning(["*"]);
          insertedImages.push(insertedImage[0]);
        }

        // Fees
        const fees_payload = req.body.fees_payload;
        /**
                 * "feesType"
                    "feesAmount"
                    duration
                 */

        let delFee = await knex("entity_fees_master")
          .where({
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
          })
          .del();

        feesResult = await knex("entity_fees_master")
          .insert({
            ...fees_payload,
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
            updatedAt: currentTime,
            createdAt: currentTime,
            orgId: req.orgId,
          })
          .returning(["*"]);

        // Booking Frequency limit
        const booking_frequency = req.body.booking_frequency;
        /*
                    "limitType" 
                    "limitValue"
                */
        let delLimit = await knex("entity_booking_limit")
          .where({
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
          })
          .del();
        bookingFrequencyResult = [];
        for (let b of booking_frequency) {
          let bookingFrequencyResultData = await knex("entity_booking_limit")
            .insert({
              ...b,
              entityType: "facility_master",
              entityId: addedFacilityResult.id,
              updatedAt: currentTime,
              createdAt: currentTime,
              orgId: req.orgId,
            })
            .returning(["*"]);
          bookingFrequencyResult.push(bookingFrequencyResultData);
        }

        const bookingQuota = req.body.bookingQuota;

        let delQuota = await knex("facility_property_unit_type_quota_limit")
          .where({
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
          })
          .del();

        bookingQuotaResult = [];

        for (let q of bookingQuota) {
          // let checkQuota = await knex('facility_property_unit_type_quota_limit')
          //     .where({
          //         entityType: 'facility_master',
          //         entityId: addedFacilityResult.id,
          //         orgId: req.orgId,
          //         propertyUnitTypeId: q.propertyUnitTypeId,
          //         daily: q.quotaType == "1" ? q.noOfQuota : 0,
          //         weekly: q.quotaType == "2" ? q.noOfQuota : 0,
          //         monthly: q.quotaType == "3" ? q.noOfQuota : 0,

          //     })

          // if (!checkQuota.length) {

          if (q.propertyUnitTypeId && q.noOfQuota && q.quotaType) {
            let quotaValue = await knex(
              "facility_property_unit_type_quota_limit"
            ).where({
              entityType: "facility_master",
              entityId: addedFacilityResult.id,
              orgId: req.orgId,
              propertyUnitTypeId: q.propertyUnitTypeId,
            });

            let quotaResult;

            if (quotaValue.length) {
              let updateQuotaData;

              if (q.quotaType == "1") {
                updateQuotaData = {
                  propertyUnitTypeId: q.propertyUnitTypeId,
                  daily: q.noOfQuota,
                  entityType: "facility_master",
                  entityId: addedFacilityResult.id,
                  updatedAt: currentTime,
                  createdAt: currentTime,
                  orgId: req.orgId,
                };
              } else if (q.quotaType == "2") {
                updateQuotaData = {
                  propertyUnitTypeId: q.propertyUnitTypeId,
                  weekly: q.noOfQuota,
                  entityType: "facility_master",
                  entityId: addedFacilityResult.id,
                  updatedAt: currentTime,
                  createdAt: currentTime,
                  orgId: req.orgId,
                };
              } else if (q.quotaType == "3") {
                updateQuotaData = {
                  propertyUnitTypeId: q.propertyUnitTypeId,
                  monthly: q.noOfQuota,
                  entityType: "facility_master",
                  entityId: addedFacilityResult.id,
                  updatedAt: currentTime,
                  createdAt: currentTime,
                  orgId: req.orgId,
                };
              }

              quotaResult = await knex(
                "facility_property_unit_type_quota_limit"
              )
                .update(updateQuotaData)
                .where({
                  entityType: "facility_master",
                  entityId: addedFacilityResult.id,
                  orgId: req.orgId,
                  propertyUnitTypeId: q.propertyUnitTypeId,
                })
                .returning(["*"]);
            } else {
              quotaResult = await knex(
                "facility_property_unit_type_quota_limit"
              )
                .insert({
                  propertyUnitTypeId: q.propertyUnitTypeId,
                  daily: q.quotaType == "1" ? q.noOfQuota : 0,
                  weekly: q.quotaType == "2" ? q.noOfQuota : 0,
                  monthly: q.quotaType == "3" ? q.noOfQuota : 0,
                  entityType: "facility_master",
                  entityId: addedFacilityResult.id,
                  updatedAt: currentTime,
                  createdAt: currentTime,
                  orgId: req.orgId,
                })
                .returning(["*"]);
            }

            bookingQuotaResult.push(quotaResult);
          }
          //}
        }

        // Booking Criteria
        /**
                 * {"bookingAllowedAdvanceTime"
                    "bookingCloseAdvanceTime"
                    "allowConcurrentBooking"
                    "concurrentBookingLimit"
                    "minBookingPeriod"
                    "maxBookingPeriod"}
                 */

        const bookingCriteriaPayload = req.body.booking_criteria;

        let delCriteria = await knex("entity_booking_criteria")
          .where({
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
          })
          .del();

        addedBookingCriteriaResult = await knex("entity_booking_criteria")
          .insert({
            ...bookingCriteriaPayload,
            criteriaType: Boolean(req.body.statuses.alwaysAllow) ? "1" : "2",
            bookingType: req.body.statuses.bookingType,
            slotDuration: req.body.statuses.slotDuration,
            entityId: addedFacilityResult.id,
            entityType: "facility_master",
            updatedAt: currentTime,
            createdAt: currentTime,
            orgId: req.orgId,
          })
          .returning(["*"]);

        trx.commit;
      });

      //update facility_master set "isActive" = true  where "isActive"  = true;
      let updateDisplayId = await knex("facility_master")
        .update({ isActive: true })
        .where({ isActive: true });

      return res.status(200).json({
        data: {
          addedFacility: addedFacilityResult,
          addedRules: addedRules,
          addedOpenCloseTime: addedOpenCloseTimeResult,
          addedImages: insertedImages,
          addedFees: feesResult,
          addedBookingFrequency: bookingFrequencyResult,
          addedBookingCriteria: addedBookingCriteriaResult,
          bookingQuotaResult,
        },
        message: message,
      });
    } catch (err) {
      console.log("ADD FACILITY ERROR: ", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  deleteFacility: async (req, res) => {
    try {
      let payload = req.body;
      const id = req.body.id;
      let message;
      let deactivatedFacility;
      let bookingCancelled;
      let checkStatus = await knex("facility_master").where({ id: id }).first();
      let currentTime = new Date().getTime();

      if (checkStatus && checkStatus.isActive == true) {
        deactivatedFacility = await knex("facility_master")
          .update({
            isActive: false,
            inActiveReason: payload.deactivatedReason,
          })
          .where({ id: id })
          .returning(["*"]);
        bookingCancelled = await knex("entity_bookings")
          .update({
            isBookingCancelled: true,
            cancelledBy: req.me.id,
            cancellationReason: payload.deactivatedReason,
            cancelledAt: currentTime,
          })
          .returning(["*"])
          .where("entity_bookings.bookingStartDateTime", ">=", currentTime)
          .where({ entityId: id, entityType: "facility_master" });

        for (let cancelled of bookingCancelled) {
          console.log("=====8888888888", cancelled, "============");

          const bookedByUser = await knex("entity_bookings")
            .select("*")
            .where({ id: cancelled.id })
            .first();
          const user = await knex("users")
            .select(["email", "name"])
            .where({ id: bookedByUser.bookedBy })
            .first();

          await emailHelper.sendTemplateEmail({
            to: user.email,
            subject: "Booking Cancelled",
            template: "booking-cancelled.ejs",
            templateData: {
              fullName: user.name,
              reason: payload.deactivatedReason,
              bookingStartDateTime: moment(
                Number(bookedByUser.bookingStartDateTime)
              ).format("YYYY-MM-DD hh:mm A"),
              bookingEndDateTime: moment(
                +bookedByUser.bookingEndDateTime
              ).format("YYYY-MM-DD hh:mm A"),
              noOfSeats: bookedByUser.noOfSeats,
              facilityName: checkStatus.name,
            },
          });
        }
        message = "Facility Deactivate successfully!";
      } else {
        deactivatedFacility = await knex("facility_master")
          .update({ isActive: true, inActiveReason: "" })
          .where({ id: id })
          .returning(["*"]);
        message = "Facility Activate successfully!";
      }

      return res.status(200).json({
        data: {
          deactivatedFacility,
          bookingCancelled: bookingCancelled,
        },
        message: message,
      });
    } catch (err) {
      console.log("DELETE FACILITY ERROR: ", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*FACILITY DETAILS*/
  facilityDetails: async (req, res) => {
    try {
      let orgId = req.orgId;
      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let qrCode = "";
      qrCode = await QRCODE.toDataURL(
        "org-" + req.orgId + "-facility-" + payload.id
      );

      let [
        facilityDetails,
        openingCloseingDetail,
        ruleRegulationDetail,
        bookingCriteriaDetail,
        facilityImages,
        feeDetails,
        bookingLimits,
        bookingQuota,
      ] = await Promise.all([
        knex
          .from("facility_master")
          .leftJoin("companies", "facility_master.companyId", "companies.id")
          .leftJoin("projects", "facility_master.projectId", "projects.id")
          .leftJoin(
            "buildings_and_phases",
            "facility_master.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "facility_master.floorZoneId",
            "floor_and_zones.id"
          )
          .select([
            "facility_master.id",
            "facility_master.name",
            "facility_master.description",
            "facility_master.descriptionAlternateLang",
            "facility_master.bookingStatus",
            "facility_master.multipleSeatsLimit",
            "facility_master.moderationStatus",
            "companies.companyId",
            "companies.id as cid",
            "projects.id as pid",
            "buildings_and_phases.id as bid",
            "floor_and_zones.id as fid",
            "companies.companyName",
            "projects.project as projectId",
            "projects.projectName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingName",
            "floor_and_zones.floorZoneCode",
            "floor_and_zones.description as floorName",
            "facility_master.bookingStatus",
            "facility_master.inActiveReason",
            "facility_master.isActive",
          ])
          .where({ "facility_master.id": payload.id })
          .first(),
        knex
          .from("entity_open_close_times")
          .where({ entityId: payload.id, entityType: "facility_master" })
          .where((qb) => {
            qb.whereNotNull("openTime");
            qb.whereNotNull("closeTime");
          }),
        knex
          .from("rules_and_regulations")
          .where({ entityId: payload.id, entityType: "facility_master" }),
        knex
          .from("entity_booking_criteria")
          .where({ entityId: payload.id, entityType: "facility_master" })
          .first(),
        knex
          .from("images")
          .where({ entityId: payload.id, entityType: "facility_master" }),
        knex("entity_fees_master")
          .select(["feesType", "feesAmount", "duration", "currency"])
          .where({
            entityId: payload.id,
            entityType: "facility_master",
            orgId: req.orgId,
          }),
        knex("entity_booking_limit").select(["limitType", "limitValue"]).where({
          entityId: payload.id,
          entityType: "facility_master",
          orgId: req.orgId,
        }),
        knex("facility_property_unit_type_quota_limit")
          .leftJoin(
            "property_unit_type_master",
            "facility_property_unit_type_quota_limit.propertyUnitTypeId",
            "property_unit_type_master.id"
          )
          .select([
            "facility_property_unit_type_quota_limit.*",
            "property_unit_type_master.propertyUnitTypeCode",
            "property_unit_type_master.descriptionEng",
            "property_unit_type_master.descriptionThai",
          ])
          .where({
            "facility_property_unit_type_quota_limit.entityId": payload.id,
            "facility_property_unit_type_quota_limit.entityType":
              "facility_master",
            "facility_property_unit_type_quota_limit.orgId": req.orgId,
          }),
      ]);

      return res.status(200).json({
        facilityDetails: {
          ...facilityDetails,
          openingCloseingDetail: openingCloseingDetail,
          ruleRegulationDetail: ruleRegulationDetail,
          bookingCriteriaDetail,
          facilityImages,
          feeDetails,
          bookingLimits: _.uniqBy(bookingLimits, "limitType"),
          qrCode,
          bookingQuota,
        },
        message: "Facility Details!",
      });
    } catch (err) {
      console.log("controller[facility-booking][facilityDetails]");

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  facilityListingStatus:async(req,res)=>{
    try{
    // let payload = req.body
    let status = req.body
    console.log("Status",req.body)
    let facilityReportResult;
    if(status){
      // try{
        facilityReportResult = await knex
        .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            .leftJoin("companies", "entity_bookings.companyId", "companies.id")
            .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .leftJoin(
              "property_units",
              "entity_bookings.unitId",
              "property_units.id"
            )
            .leftJoin(
              "property_unit_type_master",
              "property_units.propertyUnitType",
              "property_unit_type_master.id"
            )
            .select([
              "entity_bookings.*",
              "facility_master.displayId as No",
              "users.name as bookedUser",
              "facility_master.name as Facility",
              "facility_master.projectId",
              "facility_master.buildingPhaseId",
              "companies.companyName as Company",
              "property_units.unitNumber",
              "property_units.type as unitType",
              "property_units.description",
              "companies.companyId",
              "property_unit_type_master.propertyUnitTypeCode",
              "property_unit_type_master.descriptionEng",
            ])
            .where((qb)=>{
              if(status == "Pending"){
                qb.where("entity_bookings.isBookingConfirmed", false);
                qb.where("entity_bookings.isBookingCancelled", false);
                qb.whereNot("entity_bookings.confirmedType",null)
                
              }
              if (status == "Approved") {
                qb.where("entity_bookings.isBookingConfirmed", true);
                qb.where("entity_bookings.confirmedType", null);
                qb.where("entity_bookings.isBookingCancelled",false)
                
              }
              if (status == "Confirmed") {
                qb.where("entity_bookings.isBookingConfirmed", true);
                qb.where("entity_bookings.confirmedType", 1);
                qb.where("entity_bookings.isBookingCancelled",false)
              }
              if (status == "Cancelled") {
                qb.where("entity_bookings.isBookingCancelled", true);
              }
            })

            return res.status(200).json({
              data: {
                facilities: facilityReportResult,
              },
              message: "Facility List!",
            });
            
      // }catch(err){}
    }
    }catch(err){
      console.log("[controllers][facilityBooking][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }

  },
  facilityListingByDate: async (req, res) => {
    try {
      let payload = req.body;
      console.log("facility booked list ",req.body)
      let {
        companyId,
        projectId,
        buildingPhaseId,
        unitNo,
        facilityName,
        status,
        tenantName,
      } = req.body;
      console.log("status",status)

      let fromDate = payload.createdDateFrom;
      let toDate = payload.createdDateTo;
      let bookingDateFrom = payload.bookingDateTimeFrom;
      let bookingDateTo = payload.bookingDateTimeTo;

      // let Status = status.join(" ")
      // console.log("Status into string",Status)

      

      moment.tz.setDefault(payload.timezone);
      let currentTime = moment();

      let bookingStartTime = moment(+payload.bookingDateTimeFrom)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let bookingEndTime = moment(+payload.bookingDateTimeTo)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let createStartTime = moment(+payload.createdDateFrom)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let createdEndTime = moment(+payload.createdDateTo)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let Status;
      if(status){
        Status = status.join(' ')
      }

      let facilityReportResult;
      if (
        companyId ||
        projectId ||
        buildingPhaseId ||
        unitNo || 
        status ||
        facilityName || 
        tenantName ||
        (createStartTime && createdEndTime) || (bookingStartTime && bookingEndTime)
        
      ) {
        try {
          facilityReportResult = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            .leftJoin("companies", "entity_bookings.companyId", "companies.id")
            .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .leftJoin(
              "property_units",
              "entity_bookings.unitId",
              "property_units.id"
            )
            .leftJoin(
              "property_unit_type_master",
              "property_units.propertyUnitType",
              "property_unit_type_master.id"
            )
            .select([
              "entity_bookings.*",
              "facility_master.displayId as No",
              "users.name as bookedUser",
              "facility_master.name as Facility",
              "facility_master.projectId",
              "facility_master.buildingPhaseId",
              "companies.companyName as Company",
              "property_units.unitNumber",
              "property_units.type as unitType",
              "property_units.description",
              "companies.companyId",
              "property_unit_type_master.propertyUnitTypeCode",
              "property_unit_type_master.descriptionEng",
            ])
            .where((qb) => {
              // if (facilityName) {
              //   qb.where(
              //     "facility_master.name",
              // "iLIKE",
              //     `%${facilityName}%`
              //   );
              // }
              if (facilityName) {
                qb.whereIn("facility_master.name", facilityName);
              }
              if (unitNo) {
                qb.where("entity_bookings.unitId", unitNo);
              }
              if (companyId) {
                qb.where("entity_bookings.companyId", companyId);
                // qb.orWhere("entity_bookings.companyId",'')
              }
              if (projectId) {
                qb.where("facility_master.projectId", projectId);
              }
              if (buildingPhaseId) {
                qb.where("facility_master.buildingPhaseId", buildingPhaseId);
              }
              
              if (tenantName) {
                
                  qb.whereIn("users.name",tenantName)
              }
              if (createStartTime && createdEndTime) {
                qb.where("entity_bookings.createdAt", ">=", createStartTime);
                qb.where("entity_bookings.createdAt", "<=", createdEndTime);
              }
              if (bookingStartTime && bookingEndTime) {
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  bookingStartTime
                );
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  "<=",
                  bookingEndTime
                );
              }
              if (status) {
                // let Status = status.join(" ")
                console.log("Status of status",Status)
                if (Status == "Pending") {
                  console.log("Pending",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                }
                if (Status == "Approved") {
                  console.log("Approved",status)
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", false);
                 // qb.where("entity_bookings.confirmedType", null);
                  qb.where("entity_bookings.confirmedType",0)
                }
                if (Status == "Confirmed") {
                  console.log("Confirmed",status)
                  qb.where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1});
                  // qb.where("entity_bookings.confirmedType", 1);
                }
                if (Status == "Cancelled") {
                  console.log("Cancelled",status)
                  qb.where("entity_bookings.isBookingCancelled", true);
                }
                if(Status ==  "Approved Pending Cancelled Confirmed"){
                  // console.log("All status",status)

                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingCancelled", false);
                }
                if(Status ==="Approved Pending Confirmed"){
                  // console.log("Pending, Approved,Confirmed ",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);

                }
                if(Status === "Approved Cancelled"){
                  // console.log("Approved and cancelled",status)
                  qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0});
                  qb.where({"entity_bookings.isBookingCancelled": true, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingCancelled": true, "entity_bookings.confirmedType":0 });
                
                }
                if(Status==="Approved Confirmed"){
                  // console.log("Approved and confirmed")
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  
                }
                if(Status === "Approved Pending"){
                  // console.log("Pending and approved",Status)
                  qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.isBookingCancelled": false,  "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": false, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":0});
                  
                  
                }
                if(Status === "Pending Confirmed"){
                  // console.log("Pending and Confirmed",status)
                  qb.where({"entity_bookings.isBookingConfirmed" : false, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":1});
                 
                }
                if(Status === "Pending Cancelled"){
                  // console.log("Pending,Cancelled",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingCancelled", true);

                }
                if(Status === "Approved Pending Cancelled"){
                  // console.log("Pending,Approved,Cancelled",status)
                  qb.where({"entity_bookings.isBookingConfirmed" : true,  "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": false, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingCancelled": true,  "entity_bookings.confirmedType":0});
                  
                }
                if(Status === "Approved Cancelled Confirmed"){
                  // console.log("Approved,Cancelled,Confirmed",status)
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                }
                if(Status === "Pending Cancelled Confirmed"){
                  // console.log("Pending,Cancelled,confirmed",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.confirmedType", 1);
                }
                if(Status === "Cancelled Confirmed"){
                  // console.log("Cancelled,confirmed",status)
                  qb.where({"entity_bookings.isBookingCancelled" : true});
                  qb.orWhere({"entity_bookings.confirmedType": 1,"entity_bookings.isBookingConfirmed" : true});
                 
                }
              }
            })
            .where("entity_bookings.orgId", req.orgId)
            .orderBy("entity_bookings.id", "asc");
        } catch (err) {
          console.log("[controllers][facilityBooking][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
        }
      }else {
        facilityReportResult = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("companies", "entity_bookings.companyId", "companies.id")
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .leftJoin(
            "property_units",
            "entity_bookings.unitId",
            "property_units.id"
          )
          .leftJoin(
            "property_unit_type_master",
            "property_units.propertyUnitType",
            "property_unit_type_master.id"
          )
          .where("entity_bookings.orgId", req.orgId)
          .select([
            "entity_bookings.*",
            "users.name as bookedUser",
            "facility_master.name as Facility",
            "companies.companyName as Company",
            "property_units.unitNumber",
            "property_units.type as unitType",
            "property_units.description",
            "property_unit_type_master.propertyUnitTypeCode",
            "property_unit_type_master.descriptionEng",
          ])
          .where("entity_bookings.bookingStartDateTime", ">=", bookingStartTime)
          .where("entity_bookings.bookingStartDateTime", "<=", bookingEndTime)
          .where("entity_bookings.createdAt", ">=", createStartTime)
          .where("entity_bookings.createdAt", "<=", createdEndTime)
          .groupBy([
            "entity_bookings.id",
            "facility_master.id",
            "companies.id",
            "users.name",
            "property_units.unitNumber",
            "property_units.type",
            "property_units.description",
            "property_unit_type_master.propertyUnitTypeCode",
            "property_unit_type_master.descriptionEng",
          ])
          .orderBy("entity_bookings.id", "asc");
        // }
      }
      return res.status(200).json({
        data: {
          facilities: facilityReportResult,
        },
        message: "Facility List!",
      });
    } catch (err) {
      console.log("[controllers][facilityBooking][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  
  facilityListing: async (req, res) => {
    try {
      let reqData = req.query;
      //let filters = req.body;
      let total, rows;
      // const accessibleProjects = req.userProjectResources[0].projects

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let filters = {};
      let {
        companyId,
        projectId,
        buildingPhaseId,
        floorZoneId,
        facilityName,
      } = req.body;
      // console.log("companyId",companyId)

      if (
        companyId ||
        projectId ||
        buildingPhaseId ||
        floorZoneId ||
        facilityName
      ) {
        try {
          [total, rows] = await Promise.all([
            knex
              .count("* as count")
              .from("facility_master")
              .leftJoin(
                "companies",
                "facility_master.companyId",
                "companies.id"
              )
              .leftJoin("projects", "facility_master.projectId", "projects.id")
              .leftJoin(
                "buildings_and_phases",
                "facility_master.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "floor_and_zones",
                "facility_master.floorZoneId",
                "floor_and_zones.id"
              )

              .where((qb) => {
                if (facilityName) {
                  qb.where(
                    "facility_master.name",
                    "iLIKE",
                    `%${facilityName}%`
                  );
                }
                if (projectId) {
                  qb.where("facility_master.projectId", projectId);
                }
                if (buildingPhaseId) {
                  qb.where("facility_master.buildingPhaseId", buildingPhaseId);
                }
                if (floorZoneId) {
                  qb.where("facility_master.floorZoneId", floorZoneId);
                }
                if (companyId) {
                  qb.where("facility_master.companyId", companyId);
                }
                qb.where("facility_master.orgId", req.orgId);
              })
              .groupBy([
                "facility_master.id",
                "companies.id",
                "projects.id",
                "buildings_and_phases.id",
                "floor_and_zones.id",
              ]),
            knex
              .from("facility_master")
              .leftJoin(
                "companies",
                "facility_master.companyId",
                "companies.id"
              )
              .leftJoin("projects", "facility_master.projectId", "projects.id")
              .leftJoin(
                "buildings_and_phases",
                "facility_master.buildingPhaseId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "floor_and_zones",
                "facility_master.floorZoneId",
                "floor_and_zones.id"
              )

              .select([
                "facility_master.displayId as No",
                "facility_master.id",
                "facility_master.name as Facility",
                "companies.companyName as Company",
                "projects.projectName as Project",
                "buildings_and_phases.buildingPhaseCode",
                "buildings_and_phases.description as Building",
                "floor_and_zones.floorZoneCode",
                "companies.companyId",
                "projects.project as projectId",
                "floor_and_zones.description as Floor",
                "facility_master.isActive",
                "facility_master.status",
              ])
              .where((qb) => {
                if (facilityName) {
                  qb.where(
                    "facility_master.name",
                    "iLIKE",
                    `%${facilityName}%`
                  );
                }
                if (projectId) {
                  qb.where("facility_master.projectId", projectId);
                }
                if (buildingPhaseId) {
                  qb.where("facility_master.buildingPhaseId", buildingPhaseId);
                }
                if (floorZoneId) {
                  qb.where("facility_master.floorZoneId", floorZoneId);
                }
                if (companyId) {
                  qb.where("facility_master.companyId", companyId);
                }
                qb.where("facility_master.orgId", req.orgId);
              })
              .orderBy("facility_master.displayId", "asc")
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
        } catch (e) {
          // Error
        }
      } else {
        [total, rows] = await Promise.all([
          knex
            .count("* as count")
            .leftJoin("companies", "facility_master.companyId", "companies.id")
            .leftJoin("projects", "facility_master.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "facility_master.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "facility_master.floorZoneId",
              "floor_and_zones.id"
            )
            .from("facility_master")
            .where("facility_master.orgId", req.orgId)
            .groupBy([
              "facility_master.id",
              "companies.id",
              "projects.id",
              "buildings_and_phases.id",
              "floor_and_zones.id",
            ]),
          knex
            .from("facility_master")
            .leftJoin("companies", "facility_master.companyId", "companies.id")
            .leftJoin("projects", "facility_master.projectId", "projects.id")
            .leftJoin(
              "buildings_and_phases",
              "facility_master.buildingPhaseId",
              "buildings_and_phases.id"
            )
            .leftJoin(
              "floor_and_zones",
              "facility_master.floorZoneId",
              "floor_and_zones.id"
            )
            .where("facility_master.orgId", req.orgId)
            .select([
              "facility_master.displayId as No",
              "facility_master.id",
              "facility_master.name as Facility",
              "companies.companyName as Company",
              "projects.projectName as Project",
              "buildings_and_phases.buildingPhaseCode",
              "buildings_and_phases.description as Building",
              "floor_and_zones.floorZoneCode",
              "companies.companyId",
              "projects.project as projectId",
              "floor_and_zones.description as Floor",
              "facility_master.isActive",
              "facility_master.status",
            ])
            .groupBy([
              "facility_master.id",
              "companies.id",
              "projects.id",
              "buildings_and_phases.id",
              "floor_and_zones.id",
            ])
            .orderBy("facility_master.displayId", "asc")
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
      }

      return res.status(200).json({
        data: {
          facilities: pagination,
        },
        message: "Facility List!",
      });
    } catch (err) {
      console.log("[controllers][facilityBooking][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  generateFacilityId: async (req, res) => {
    try {
      const generatedId = await knex("facility_master")
        .insert({ createdAt: new Date().getTime() })
        .returning(["*"]);
      return res.status(200).json({
        data: {
          id: generatedId[0].id,
        },
      });
    } catch (err) {
      console.log("[controllers][facilityBooking][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*GET FACILITY BOOKING LIST  */
  getFacilityBookingList: async (req, res) => {
    try {
      let {
        fromDate,
        toDate,
        id,
        companyId,
        projectId,
        facilityName,
      } = req.query;
      let orgId = req.orgId;
      let newFromDate;
      let newToDate;
      if (fromDate) {
        newFromDate = new Date(fromDate).getTime();
      }
      if (toDate) {
        newToDate = new Date(toDate).getTime();
      }

      let result;

      if (id || (fromDate && toDate)) {
        result = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin(
            "property_units",
            "entity_bookings.unitId",
            "property_units.id"
          )
          .select([
            "entity_bookings.*",
            "property_units.unitNumber",
            "property_units.description as unitDescription",
            "facility_master.name as facilityName",
          ])
          .where({ "entity_bookings.orgId": orgId, isBookingCancelled: false })
          .where((qb) => {
            if (fromDate && toDate) {
              qb.where(
                "entity_bookings.bookingStartDateTime",
                ">=",
                newFromDate
              );
              qb.where("entity_bookings.bookingEndDateTime", "<", newToDate);
              //qb.whereBetween("entity_bookings.bookingStartDateTime", [newFromDate, newFromDate]);
              // qb.whereBetween("entity_bookings.bookingEndDateTime", [newToDate, newToDate]);
            }

            if (id === "undefined") {
            } else {
              qb.where("entity_bookings.entityId", id);
              qb.where("entity_bookings.entityType", "facility_master");
            }

            if (companyId) {
              qb.where("facility_master.companyId", companyId);
            }

            if (projectId) {
              qb.where("facility_master.projectId", projectId);
            }

            if (facilityName) {
              // qb.where('facility_master.name', 'iLIKE', `%${facilityName}%`)
              qb.where("facility_master.name", "iLIKE", `%${facilityName}%`);
            }
          });
      } else {
        result = await knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin(
            "property_units",
            "entity_bookings.unitId",
            "property_units.id"
          )
          .select([
            "entity_bookings.*",
            "property_units.unitNumber",
            "property_units.description as unitDescription",
            "facility_master.name as facilityName",
          ])
          .where({
            "entity_bookings.orgId": req.orgId,
            isBookingCancelled: false,
          });
      }

      const Parallel = require("async-parallel");
      result = await Parallel.map(result, async (item) => {
        let id = item.bookedBy;
        let book = await knex("users")
          .where({ id: id })
          .select("name", "email", "mobileNo", "id")
          .first();
        return {
          ...item,
          bookedBy: book,
        };
      });

      return res.status(200).json({
        data: {
          bookedData: result,
        },
        message: "Booked List!",
      });
    } catch (err) {
      console.log("[controllers][facilityBooking]:  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*GET USER FACILITY LIST */
  getUserFacilityList: async (req, res) => {
    try {
      let id = req.me.id;
      let propertUnitresult = null;
      let userHouseResult = null;
      let propertyUnitFinalResult = null;
      let resourceProject = req.userProjectResources[0].projects;
      let { startDateTime, endDateTime, projectId, buildingId } = req.body;
      let resultData;

      propertUnitresult = await knex
        .from("property_units")
        .where({ orgId: req.orgId })
        .whereIn("projectId", resourceProject);

      let propertyUnitArray = propertUnitresult.map((v) => v.id);

      userHouseResult = await knex
        .from("user_house_allocation")
        .where({ userId: id, orgId: req.orgId })
        .whereIn("houseId", propertyUnitArray);
      let houseIdArray = userHouseResult.map((v) => v.houseId);

      propertyUnitFinalResult = await knex
        .from("property_units")
        .where({ orgId: req.orgId })
        .whereIn("id", houseIdArray);

      let projectArray = _.uniqBy(propertyUnitFinalResult, "projectId").map(
        (v) => v.projectId
      );

      resultData = await knex
        .from("facility_master")
        .leftJoin("companies", "facility_master.companyId", "companies.id")
        .leftJoin("projects", "facility_master.projectId", "projects.id")
        .leftJoin(
          "buildings_and_phases",
          "facility_master.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "facility_master.floorZoneId",
          "floor_and_zones.id"
        )
        .leftJoin(
          "entity_open_close_times",
          "facility_master.id",
          "entity_open_close_times.entityId"
        )
        .select([
          "facility_master.*",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
          "buildings_and_phases.buildingPhaseCode",
          "buildings_and_phases.description as buildingName",
          "floor_and_zones.floorZoneCode",
          "floor_and_zones.description as floorName",
        ])
        .where((qb) => {
          if (projectId) {
            qb.where("facility_master.projectId", projectId);
          }
          if (buildingId) {
            qb.where("facility_master.buildingPhaseId", buildingId);
          }
          if (startDateTime && endDateTime) {
            qb.where("entity_open_close_times.openTime", ">=", startDateTime);
            qb.where("entity_open_close_times.closeTime", "<=", endDateTime);
          }
        })
        .where({
          "facility_master.orgId": req.orgId,
          "facility_master.moderationStatus": true,
        })
        .whereIn("facility_master.projectId", projectArray)
        .orderBy("facility_master.id", "desc")
        .groupBy(
          "facility_master.id",
          "companies.id",
          "projects.id",
          "buildings_and_phases.id",
          "floor_and_zones.id"
        )
        .distinct("facility_master.id");

      const Parallel = require("async-parallel");
      resultData = await Parallel.map(resultData, async (pd) => {
        let imageResult = await knex
          .from("images")
          .select("s3Url", "title", "name")
          .where({
            entityId: pd.id,
            entityType: "facility_master",
            orgId: req.orgId,
          });

        let currentTime = new Date().getTime();
        let startDate = moment(currentTime).startOf("date").format();
        let endDate = moment(currentTime).endOf("date").format();
        let startTime = new Date(startDate).getTime();
        let endTime = new Date(endDate).getTime();

        let bookingResult = await knex
          .from("entity_bookings")
          .where({
            entityId: pd.id,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .whereBetween("bookedAt", [startTime, endTime]);

        let todayTotalBooking = 0;
        if (bookingResult.length) {
          todayTotalBooking = bookingResult.length;
        }

        return {
          ...pd,
          uploadedImages: imageResult,
          todayTotalBooking,
        };
      });

      res.status(200).json({
        data: {
          facilityData: resultData,
        },
        message: "Facility list successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*FACILITY DETAILS */
  userFacilityDetails: async (req, res) => {
    try {
      let resultData;
      let payload = req.body;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let [
        facilityDetails,
        openingCloseingDetail,
        ruleRegulationDetail,
        bookingCriteriaDetail,
        facilityImages,
        feeDetails,
        bookingLimits,
      ] = await Promise.all([
        await knex
          .from("facility_master")
          .leftJoin("companies", "facility_master.companyId", "companies.id")
          .leftJoin("projects", "facility_master.projectId", "projects.id")
          .leftJoin(
            "buildings_and_phases",
            "facility_master.buildingPhaseId",
            "buildings_and_phases.id"
          )
          .leftJoin(
            "floor_and_zones",
            "facility_master.floorZoneId",
            "floor_and_zones.id"
          )
          .select([
            "facility_master.*",
            "companies.companyId as companyCode",
            "companies.companyName",
            "projects.project as projectCode",
            "projects.projectName",
            "buildings_and_phases.buildingPhaseCode",
            "buildings_and_phases.description as buildingName",
            "floor_and_zones.floorZoneCode",
            "floor_and_zones.description as floorName",
          ])
          .where({ "facility_master.id": payload.id })
          .first(),
        knex
          .from("entity_open_close_times")
          .where({ entityId: payload.id, entityType: "facility_master" }),
        knex
          .from("rules_and_regulations")
          .where({ entityId: payload.id, entityType: "facility_master" }),
        knex
          .from("entity_booking_criteria")
          .where({ entityId: payload.id, entityType: "facility_master" })
          .first(),
        knex
          .from("images")
          .where({ entityId: payload.id, entityType: "facility_master" }),
        knex("entity_fees_master")
          .select(["feesType", "feesAmount", "duration"])
          .where({
            entityId: payload.id,
            entityType: "facility_master",
            orgId: req.orgId,
          }),
        knex("entity_booking_limit").select(["limitType", "limitValue"]).where({
          entityId: payload.id,
          entityType: "facility_master",
          orgId: req.orgId,
        }),
      ]);

      res.status(200).json({
        facilityDetails: {
          ...facilityDetails,
          openingCloseingDetail,
          ruleRegulationDetail,
          bookingCriteriaDetail,
          facilityImages,
          feeDetails,
          bookingLimits,
        },
        message: "Facility Details Successfully!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  /*YOUR FACILITY BOOKING LIST */
  yourFacilityBookingList: async (req, res) => {
    try {
      let resultData;
      let id = req.me.id;

      resultData = await knex
        .from("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("companies", "facility_master.companyId", "companies.id")
        .leftJoin("projects", "facility_master.projectId", "projects.id")
        .leftJoin(
          "buildings_and_phases",
          "facility_master.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "floor_and_zones",
          "facility_master.floorZoneId",
          "floor_and_zones.id"
        )
        .select([
          "entity_bookings.*",
          "facility_master.id as facilityId",
          "facility_master.name as facilityName",
          "companies.companyId as companyCode",
          "companies.companyName",
          "projects.project as projectCode",
          "projects.projectName",
          "buildings_and_phases.buildingPhaseCode",
          "buildings_and_phases.description as buildingName",
          "floor_and_zones.floorZoneCode",
          "floor_and_zones.description as floorName",
        ])
        .where({
          "entity_bookings.entityType": "facility_master",
          "entity_bookings.orgId": req.orgId,
        })
        .where({ "entity_bookings.bookedBy": id });

      res.status(200).json({
        bookingData: resultData,
        message: "Your booking list successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  /*FACILITY BOOK NOW */
  // facilityBookNow: async (req, res) => {

  //     try {
  //         let id = req.me.id;
  //         let payload = req.body;
  //         let resultData;
  //         const schema = Joi.object().keys({
  //             facilityId: Joi.string().required(),
  //             bookingStartDateTime: Joi.date().required(),
  //             bookingEndDateTime: Joi.date().required(),
  //             noOfSeats: Joi.number().required(),

  //         })

  //         const result = Joi.validate(payload, schema);

  //         if (result && result.hasOwnProperty("error") && result.error) {
  //             return res.status(400).json({
  //                 errors: [
  //                     { code: "VALIDATION_ERROR", message: result.error.message }
  //                 ]
  //             });
  //         }

  //         let facilityData = await knex.from('facility_master').where({ id: payload.facilityId }).first();

  //         let startTime = new Date(payload.bookingStartDateTime).getTime();
  //         let endTime = new Date(payload.bookingEndDateTime).getTime();

  //         let currentTime = new Date().getTime();

  //         let insertData = {
  //             entityId: payload.facilityId,
  //             entityType: "facility_master",
  //             bookedAt: currentTime,
  //             bookedBy: id,
  //             noOfSeats: payload.noOfSeats,
  //             feesPaid: 0,
  //             bookingStartDateTime: startTime,
  //             bookingEndDateTime: endTime,
  //             createdAt: currentTime,
  //             updatedAt: currentTime,
  //             orgId: req.orgId
  //         }

  //         let insertResult = await knex('entity_bookings').insert(insertData).returning(['*']);
  //         resultData = insertResult[0];

  //         res.status(200).json({
  //             result: resultData,
  //             message: "Your facility booked successfully!"
  //         })

  //     } catch (err) {

  //         res.status(500).json({
  //             errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }]
  //         })
  //     }
  // },

  /*FACILITY BOOK NOW */
  facilityBookNow: async (req, res) => {
    try {
      let id;
      let payload = req.body;
      let resultData;

      // let unitId = req.me.houseIds[0];
      let unitId;

      const schema = Joi.object().keys({
        facilityId: Joi.string().required(),
        bookingStartDateTime: Joi.date().required(),
        bookingEndDateTime: Joi.date().required(),
        noOfSeats: Joi.number().required(),
        unitId: Joi.string().required(),
        offset: Joi.number().required(),
        currentTime: Joi.date().required(),
        timezone: Joi.string().required(),
        userId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      // Get project id

      id = payload.userId;

      let facilityMaster = await knex("facility_master")
        .select("projectId")
        .where({ id: payload.facilityId, orgId: req.orgId, isActive: true })
        .first();

      console.log("facilityBook", facilityMaster);

      if (!facilityMaster) {
        return res.status(400).json({
          errors: [{ code: "NOT_FOUND", message: `Facility Closed.` }],
        });
      }

      // Get Facility Quota By Facility Id

      unitId = payload.unitId;

      // Check booking Quota
      let checkFacilityQuota = await facilityHelper.getBookingQuota({
        facilityId: payload.facilityId,
        bookingStartDateTime: payload.bookingStartDateTime,
        bookingEndDateTime: payload.bookingEndDateTime,
        offset: payload.offset,
        currentTime: payload.currentTime,
        timezone: payload.timezone,
        unitId: payload.unitId,
        orgId: req.orgId,
      });
      console.log("checkFacilityQuota", checkFacilityQuota);

      if (checkFacilityQuota.code && checkFacilityQuota.message) {
        return res.status(400).json({
          errors: [
            {
              code: checkFacilityQuota.code,
              message: checkFacilityQuota.message,
            },
          ],
        });
      }

      if (checkFacilityQuota < 0 && !checkFacilityQuota.code) {
        return res.status(400).json({
          errors: [{ code: "SLOT_BOOKED", message: `Slot is not available` }],
        });
      }

      // Check booking Capacity
      let checkFacilityCapacity = await facilityHelper.getBookingCapacity({
        facilityId: payload.facilityId,
        bookingStartDateTime: payload.bookingStartDateTime,
        bookingEndDateTime: payload.bookingEndDateTime,
        offset: payload.offset,
        currentTime: payload.currentTime,
        timezone: payload.timezone,
        unitId: payload.unitId,
        orgId: req.orgId,
        noOfSeats: payload.noOfSeats,
      });
      console.log("checkFacilityCapacity", checkFacilityCapacity);
      if (checkFacilityCapacity < 0) {
        return res.status(400).json({
          errors: [
            {
              code: "Quota_BOOKED",
              message: `Selected no. of Pax is not available in this slot.`,
            },
          ],
        });
      }

      // check facility is closed

      let closeFacility = await knex("facility_master")
        .select("inActiveReason")
        .where({ id: payload.facilityId, orgId: req.orgId, isActive: false })
        .first();

      console.log("closedFacility", closeFacility);
      if (closeFacility) {
        let closeReasonMessage = closeFacility.inActiveReason;

        return res.status(400).json({
          errors: [
            {
              code: "FACILITY_CLOSED_STATUS",
              message: `Facility is closed : Reason- ${closeReasonMessage}.`,
            },
          ],
        });
      }

      // check facility timing is closed

      let closeFacilityTiming = await knex("facility_close_date")
        .select("*")
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          orgId: req.orgId,
        })
        .where("facility_close_date.endDate", ">", payload.bookingStartDateTime)
        .where("facility_close_date.startDate", "<", payload.bookingEndDateTime)
        .first();

      console.log("closeFacilityTiming", closeFacilityTiming);
      if (closeFacilityTiming) {
        let closeReason = await knex("facility_close_date")
          .select("closeReason")
          .where({
            entityId: payload.facilityId,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .first();

        let closeReasonMessage = closeReason.closeReason;

        return res.status(400).json({
          errors: [
            {
              code: "FACILITY_CLOSED",
              message: `Facility is closed for selected time slot : Reason- ${closeReasonMessage}.`,
            },
          ],
        });
      }

      checkQuotaByUnit = await knex("property_units")
        .select("propertyUnitType")
        .where({ id: unitId, orgId: req.orgId })
        .first();

      // Check concurrent booking for only flexible booking
      let bookingCriteria1 = await knex("entity_booking_criteria")
        .select("*")
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          orgId: req.orgId,
        })
        .first();
      console.log("bookingCriteria", bookingCriteria1);
      let totalConcurrentLimit = bookingCriteria1.concurrentBookingLimit;
      let allowBookingSeat = 0;
      if (
        bookingCriteria1 &&
        bookingCriteria1.bookingType == "1" &&
        bookingCriteria1.allowConcurrentBooking == true
      ) {
        // Flexible Booking

        let bookingData = await knex("entity_bookings")
          .count("* as totalBookedSeats")
          .where(
            "entity_bookings.bookingEndDateTime",
            ">",
            payload.bookingStartDateTime
          )
          .where(
            "entity_bookings.bookingStartDateTime",
            "<",
            payload.bookingEndDateTime
          )
          .where({
            entityId: payload.facilityId,
            isBookingCancelled: false,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .first();
        console.log("totalBookingSeats", bookingData);
        allowBookingSeat = Number(1) + Number(bookingData.totalBookedSeats);
        console.log("allowBookingSeat", allowBookingSeat);

        if (allowBookingSeat > totalConcurrentLimit) {
          return res.status(400).json({
            errors: [
              {
                code: "ALREADY_SLOT_BOOKED",
                message: `You slot booking is overlapping, please try other timing slot.`,
              },
            ],
          });
        }
      }

      // exit

      let facilityData = await knex
        .from("facility_master")
        .where({ id: payload.facilityId })
        .first();

      let startTime = new Date(payload.bookingStartDateTime).getTime();
      let endTime = new Date(payload.bookingEndDateTime).getTime();

      let currentTime = new Date().getTime();

      let price = await knex
        .from("entity_fees_master")
        .where({ entityId: payload.facilityId })
        .first();

      let facilitySlot = await knex
        .from("entity_booking_criteria")
        .where({ entityId: payload.facilityId })
        .first();

      let totalFees = 0;

      if (price.feesType == "1") {
        totalFees = price.feesAmount * payload.noOfSeats;
      } else if (price.feesType == "2") {
        let calDuration =
          (facilitySlot.slotDuration * price.feesAmount) / price.duration;
        totalFees = calDuration * payload.noOfSeats;
      } else {
        totalFees = 0;
      }

      // Confirmed Status (1=>Auto Confirmed, 2=>Manually Confirmed)
      if (facilityData.bookingStatus == 1) {
        confirmedStatus = true;
        confirmType = 1;
      } else {
        confirmedStatus = false;
        confirmType = 0;
      }

      let insertData = {
        entityId: payload.facilityId,
        entityType: "facility_master",
        bookedAt: currentTime,
        bookedBy: id,
        noOfSeats: payload.noOfSeats,
        feesPaid: totalFees,
        bookingStartDateTime: startTime,
        bookingEndDateTime: endTime,
        createdAt: currentTime,
        updatedAt: currentTime,
        orgId: req.orgId,
        unitId: unitId,
        companyId: facilityData.companyId,
        isBookingConfirmed: confirmedStatus,
        bookingType: 1,
        confirmedType: confirmType,
      };

      let insertResult = await knex("entity_bookings")
        .insert(insertData)
        .returning(["*"]);
      resultData = insertResult[0];

      const user = await knex("users")
        .select(["email", "name"])
        .where({ id: id })
        .first();

      if (facilityData.bookingStatus == "2") {
        let orgAdminResult = await knex("organisations")
          .select("organisationAdminId")
          .where({ id: req.orgId })
          .first();

        let adminEmail;
        if (orgAdminResult) {
          let adminUser = await knex("users")
            .select("email")
            .where({ id: orgAdminResult.organisationAdminId })
            .first();
          adminEmail = adminUser.email;
        }

        await emailHelper.sendTemplateEmail({
          to: user.email,
          subject: "Booking Approved Required",
          template: "booking-confirmed-required.ejs",
          templateData: {
            fullName: user.name,
            bookingStartDateTime: moment(
              Number(resultData.bookingStartDateTime)
            ).format("YYYY-MM-DD hh:mm A"),
            bookingEndDateTime: moment(+resultData.bookingEndDateTime).format(
              "YYYY-MM-DD hh:mm A"
            ),
            noOfSeats: resultData.noOfSeats,
            facilityName: facilityData.name,
          },
        });

        await emailHelper.sendTemplateEmail({
          to: adminEmail,
          subject: "Booking Approved Required ",
          template: "booking-confirmed-admin.ejs",
          templateData: {
            fullName: user.name,
            bookingStartDateTime: moment(
              Number(resultData.bookingStartDateTime)
            ).format("YYYY-MM-DD hh:mm A"),
            bookingEndDateTime: moment(+resultData.bookingEndDateTime).format(
              "YYYY-MM-DD hh:mm A"
            ),
            noOfSeats: resultData.noOfSeats,
            facilityName: facilityData.name,
          },
        });
      } else {
        await emailHelper.sendTemplateEmail({
          to: user.email,
          subject: "Booking Confirmed",
          template: "booking-confirmed.ejs",
          templateData: {
            fullName: user.name,
            bookingStartDateTime: moment(
              Number(resultData.bookingStartDateTime)
            ).format("YYYY-MM-DD hh:mm A"),
            bookingEndDateTime: moment(+resultData.bookingEndDateTime).format(
              "YYYY-MM-DD hh:mm A"
            ),
            noOfSeats: resultData.noOfSeats,
            facilityName: facilityData.name,
          },
        });
      }
      let updateDisplayId = await knex("entity_bookings")
        .update({ isActive: true })
        .where({ isActive: true });

      res.status(200).json({
        result: resultData,
        message: "Your facility booked successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  cancelBooking: async (req, res) => {
    try {
      const { bookingId, cancellationReason } = req.body;
      const currentTime = new Date().getTime();
      const cancelled = await knex("entity_bookings")
        .update({
          cancellationReason,
          cancelledAt: currentTime,
          cancelledBy: req.me.id,
          isBookingCancelled: true,
        })
        .where({ id: bookingId })
        .returning(["*"]);
      const bookedByUser = await knex("entity_bookings")
        .select("*")
        .where({ id: bookingId })
        .first();
      const user = await knex("users")
        .select(["email", "name"])
        .where({ id: bookedByUser.bookedBy })
        .first();
      const facilityData = await knex("facility_master")
        .where({ id: bookedByUser.entityId })
        .first();

      await emailHelper.sendTemplateEmail({
        to: user.email,
        subject: "Booking Cancelled",
        template: "booking-cancelled.ejs",
        templateData: {
          fullName: user.name,
          reason: cancellationReason,
          bookingStartDateTime: moment(
            Number(bookedByUser.bookingStartDateTime)
          ).format("YYYY-MM-DD hh:mm A"),
          bookingEndDateTime: moment(+bookedByUser.bookingEndDateTime).format(
            "YYYY-MM-DD hh:mm A"
          ),
          noOfSeats: bookedByUser.noOfSeats,
          facilityName: facilityData.name,
        },
      });
      return res.status(200).json({ message: "cancelled!", data: cancelled });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  /*APPROVE FACILITY */
  approveFacility: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        id: Joi.number().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      const currentTime = new Date().getTime();

      let checkExpire = await knex("entity_bookings")
        .where({ id: payload.id })
        .first();

      if (checkExpire.bookingStartDateTime >= currentTime) {
        let updateData = {
          isBookingConfirmed: true,
          confirmedBy: req.me.id,
          confirmedAt: currentTime,
        };
        let resultData = await knex("entity_bookings")
          .update(updateData)
          .where({ id: payload.id })
          .returning(["*"]);

        console.log("=============", resultData, "=========");

        let facilityData = await knex
          .from("facility_master")
          .where({ id: resultData[0].entityId })
          .first();

        const user = await knex("users")
          .select(["email", "name"])
          .where({ id: resultData[0].bookedBy })
          .first();

        await emailHelper.sendTemplateEmail({
          to: user.email,
          subject: "Booking Approved",
          template: "booking-approved.ejs",
          templateData: {
            fullName: user.name,
            bookingStartDateTime: moment(
              Number(resultData[0].bookingStartDateTime)
            ).format("YYYY-MM-DD hh:mm A"),
            bookingEndDateTime: moment(
              +resultData[0].bookingEndDateTime
            ).format("YYYY-MM-DD hh:mm A"),
            noOfSeats: resultData[0].noOfSeats,
            facilityName: facilityData.name,
          },
        });

        return res
          .status(200)
          .json({ message: "Booking Confirmed!", data: resultData });
      } else {
        return res.status(400).json({
          errors: [
            {
              code: "VALIDATION_ERROR",
              message: "This Booking has been expired!",
            },
          ],
        });
      }
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  /*FACILITY BOOKING LIST */
  getfacilityBookedList: async (req, res) => {
    try {
      let { startDate, endDate, facilityName, status } = req.body;
      let startTime;
      let endTime;

      if (startDate && endDate) {
        startNewDate = moment(startDate).startOf("date").format();
        endNewDate = moment(endDate).endOf("date").format();
        startTime = new Date(startNewDate).getTime();
        endTime = new Date(endNewDate).getTime();
      }

      let currentDate = new Date().getTime();

      let reqData = req.query;
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")

          .where((qb) => {
            if (startDate && endDate) {
              qb.where("entity_bookings.bookingStartDateTime", ">=", startTime);
              qb.where("entity_bookings.bookingStartDateTime", "<=", endTime);
            }

            if (status) {
              if (status == "Pending") {
                qb.where("entity_bookings.isBookingConfirmed", false);
                qb.where("entity_bookings.isBookingCancelled", false);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
              }

              if (status == "Approved") {
                qb.where("entity_bookings.isBookingConfirmed", true);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
                qb.where("entity_bookings.confirmedType", 0);
              }

              if (status == "Confirmed") {
                qb.where("entity_bookings.isBookingConfirmed", true);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
                qb.where("entity_bookings.confirmedType", 1);
              }

              if (status == "Cancelled") {
                qb.where("entity_bookings.isBookingCancelled", true);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
              }

              if (status == "Expired") {
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  "<",
                  currentDate
                );
              }
            }

            if (facilityName) {
              qb.where("facility_master.name", "iLIKE", `%${facilityName}%`);
            }

            qb.where("entity_bookings.orgId", req.orgId);
          })
          .first(),
        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.*",
            "facility_master.name",
            "users.name as bookedUser",
          ])
          .where((qb) => {
            if (startDate && endDate) {
              qb.where("entity_bookings.bookingStartDateTime", ">=", startTime);
              qb.where("entity_bookings.bookingStartDateTime", "<=", endTime);
            }

            if (status) {
              if (status == "Pending") {
                qb.where("entity_bookings.isBookingConfirmed", false);
                qb.where("entity_bookings.isBookingCancelled", false);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
              }

              if (status == "Approved") {
                qb.where("entity_bookings.isBookingConfirmed", true);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
                qb.where("entity_bookings.confirmedType", 0);
              }

              if (status == "Confirmed") {
                qb.where("entity_bookings.isBookingConfirmed", true);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
                qb.where("entity_bookings.confirmedType", 1);
              }

              if (status == "Cancelled") {
                qb.where("entity_bookings.isBookingCancelled", true);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  currentDate
                );
              }
              if (status == "Expired") {
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  "<",
                  currentDate
                );
              }
            }

            if (facilityName) {
              qb.where("facility_master.name", "iLIKE", `%${facilityName}%`);
            }

            qb.where("entity_bookings.orgId", req.orgId);
          })
          .orderBy("entity_bookings.createdAt", "desc")
          .offset(offset)
          .limit(per_page),
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
          booking: pagination,
        },
        message: "Facility booked List!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  facilityBookedListReport: async (req, res) => {
    try {
      let payload = req.body;
      let { companyId, projectId, status, facilityName } = req.body;
      let fromDate = payload.createdDateFrom;
      let toDate = payload.createdDateTo;
      let bookingDateFrom = payload.bookingDateTimeFrom;
      let bookingDateTo = payload.bookingDateTimeTo;
      console.log(
        "requested data",
        payload.companyId,
        toDate,
        fromDate,
        bookingDateFrom,
        bookingDateTo
      );

      let currentDate = new Date().getTime();

      // if(fromDate && toDate){
      let fromNewDate = moment(fromDate).startOf("date").format();
      let toNewDate = moment(toDate).endOf("date", "days").format();
      let fromTime = new Date(fromNewDate).getTime();
      let toTime = new Date(toNewDate).getTime();
      let fromBookDate = moment(bookingDateFrom).startOf("date").format();
      let toBookDate = moment(bookingDateTo).endOf("date", "days");
      let fromBookTime = new Date(fromBookDate).getTime();
      let toBookTime = new Date(toBookDate).getTime();

      let facilityResult = await knex
        .from("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        // .leftJoin(
        //   "companies",
        //   "entity_bookings.companyId",
        //   "companies.id"
        // )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .leftJoin(
          "property_units",
          "entity_bookings.unitId",
          "property_units.id"
        )
        .select([
          "entity_bookings.*",
          "facility_master.name",
          "users.name as bookedUser",
          "property_units.unitNumber",
          "property_units.type as unitType",
        ])
        .where((qb) => {
          if (companyId) {
            qb.where("entity_bookings.companyId", payload.companyId);
          }
          // if (fromDate && toDate) {
          //     qb.where("entity_bookings.createdAt", ">=", fromTime);
          //     qb.where("entity_bookings.createdAt", "<=", toTime);
          //   }
          if (bookingDateFrom && bookingDateTo) {
            qb.where(
              "entity_bookings.bookingStartDateTime",
              ">=",
              fromBookTime
            );
            qb.where("entity_bookings.bookingStartDateTime", "<=", toBookTime);
          }

          if (status) {
            if (status == "Pending") {
              qb.where("entity_bookings.isBookingConfirmed", false);
              qb.where("entity_bookings.isBookingCancelled", false);
              qb.where(
                "entity_bookings.bookingStartDateTime",
                ">=",
                currentDate
              );
            }

            if (status == "Approved") {
              qb.where("entity_bookings.isBookingConfirmed", true);
              qb.where(
                "entity_bookings.bookingStartDateTime",
                ">=",
                currentDate
              );
            }

            if (status == "Cancelled") {
              qb.where("entity_bookings.isBookingCancelled", true);
              qb.where(
                "entity_bookings.bookingStartDateTime",
                ">=",
                currentDate
              );
            }
            if (status == "Expired") {
              qb.where(
                "entity_bookings.bookingStartDateTime",
                "<",
                currentDate
              );
            }
          }

          if (facilityName) {
            qb.where("facility_master.name", "iLIKE", `%${facilityName}%`);
          }
        })
        .orderBy("createdAt", "desc");
      //   .where("entity_bookings.orgId", req.orgId)
      //   .whereBetween('entity_bookings.createdAt',[fromTime, toTime])
      //   .whereBetween('entity_bookings.bookingStartDateTime',[bookingDateFrom,bookingDateTo])
      return res.status(200).json({
        data: {
          facilityBookedList: facilityResult,
        },
        message: "Facility Booked List",
      });
      // }
    } catch (err) {
      console.log(
        "[controllers][generalsetup][viewFacilityList] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  addFacilityCloseDate: async (req, res) => {
    try {
      let resultData = [];
      let cancelResultData = [];
      await knex.transaction(async (trx) => {
        let payload = req.body;
        let currentTime = new Date().getTime();
        if (payload.facilityData.length > 0) {
          for (let data of payload.facilityData) {
            if (data.startDate && data.endDate) {
              let startDate = new Date(data.startDate).getTime();
              let endDate = new Date(data.endDate).getTime();
              let closeReason = data.closeReason;

              let checkData = await knex("facility_close_date").where({
                startDate: startDate,
                endDate: endDate,
                entityId: payload.facilityId,
                entityType: "facility_master",
                orgId: req.orgId,
              });

              if (!checkData.length) {
                let insertData = {
                  entityId: payload.facilityId,
                  entityType: "facility_master",
                  startDate: startDate,
                  endDate: endDate,
                  closeReason: closeReason,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  orgId: req.orgId,
                };
                let result = await knex("facility_close_date")
                  .insert(insertData)
                  .returning(["*"]);

                resultData.push(result);

                let checkBooking = await knex("entity_bookings")
                  .where(
                    "entity_bookings.bookingStartDateTime",
                    ">=",
                    startDate
                  )
                  .where("entity_bookings.bookingEndDateTime", "<=", endDate)
                  .where({
                    entityId: payload.facilityId,
                    entityType: "facility_master",
                    orgId: req.orgId,
                  });

                if (checkBooking.length) {
                  for (booked of checkBooking) {
                    let cancelData = {
                      isBookingCancelled: true,
                      cancelledBy: req.me.id,
                      cancelledAt: currentTime,
                      cancellationReason: closeReason,
                    };

                    let cancelResult = await knex("entity_bookings")
                      .update(cancelData)
                      .returning(["*"])
                      .where({ id: booked.id, orgId: req.orgId });

                    cancelResultData.push(cancelResult);

                    const user = await knex("users")
                      .select(["email", "name"])
                      .where({ id: booked.bookedBy })
                      .first();

                    await emailHelper.sendTemplateEmail({
                      to: user.email,
                      subject: "Booking Cancelled",
                      template: "booking-cancelled.ejs",
                      templateData: {
                        fullName: user.name,
                        reason: closeReason,
                        bookingStartDateTime: moment(
                          Number(booked.bookingStartDateTime)
                        ).format("YYYY-MM-DD hh:mm A"),
                        bookingEndDateTime: moment(
                          +booked.bookingEndDateTime
                        ).format("YYYY-MM-DD hh:mm A"),
                        noOfSeats: booked.noOfSeats,
                      },
                    });
                  }
                }
              }
            }
          }
        }
        trx.commit;
      });

      return res.status(200).json({
        message: "Close Date Added successfully!",
        data: resultData,
        bookingCancelData: cancelResultData,
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  /*CLOSE DATE FACILITY LIST */
  facilityCloseDateList: async (req, res) => {
    try {
      let total, rows;
      let reqData = req.query;
      let pagination = {};
      let page = reqData.current_page || 1;
      let per_page = reqData.per_page || 10;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let payload = req.body;
      const schema = Joi.object().keys({
        facilityId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("facility_close_date")
          .where({
            entityId: payload.facilityId,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .first(),

        knex("facility_close_date")
          .where({
            entityId: payload.facilityId,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .offset(offset)
          .limit(per_page)
          .orderBy("createdAt", "desc"),
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

      // let resultData = await knex('facility_close_date')
      //     .where({ entityId: payload.facilityId, entityType: 'facility_master', orgId: req.orgId })
      //     .orderBy("createdAt", 'desc');

      return res.status(200).json({
        message: "Close Date list successfully!",
        data: {
          booking: pagination,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  /*DELETE FACILITY CLOSE DATE */
  deleteFacilityCloseDate: async (req, res) => {
    try {
      let payload = req.body;

      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let delResult = await knex("facility_close_date")
        .where({ id: payload.id })
        .del();

      return res.status(200).json({
        message: "Facility Close Date deleted successfully!",
        data: delResult,
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  updateFacilityReport:async(req,res) =>{
    try{
      
      let payload = req.body
      const currentTime = new Date().getTime();
      console.log(payload)

      let insertData = {
        updatedAt: currentTime,
        reportName:payload.reportName,
        reportJson: JSON.stringify(payload),
      };

      let result = await knex("facility_report_master")
      .update(insertData)
      .returning(["*"])
      .where({id:payload.id});

      return res.status(200).json({
        message:"facility report updated successfully !",
        data :result
      })

    }catch(err){
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }

  },
  updateFacilityCloseDate: async (req, res) => {
    try {
      let payload = req.body;
      let currentTime = new Date().getTime();
      let startDate = new Date(payload.startDate).getTime();
      let endDate = new Date(payload.endDate).getTime();
      let closeReason = payload.closeReason;

      let insertData = {
        startDate: startDate,
        endDate: endDate,
        closeReason: closeReason,
        updatedAt: currentTime,
      };
      let result = await knex("facility_close_date")
        .update(insertData)
        .returning(["*"])
        .where({ id: payload.id });

      return res.status(200).json({
        message: "Facility Close Date updated successfully!",
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  /*GET TOTAL APPROVAL REQUIRED BOOKING */
  getTotalApprovalRequiredBooking: async (req, res) => {
    try {
      let currentDate = new Date().getTime();

      let result = await knex("entity_bookings")
        .where("bookingStartDateTime", ">=", currentDate)
        .where({
          isBookingConfirmed: false,
          isBookingCancelled: false,
          orgId: req.orgId,
        });

      let totalBooking = result.length;

      return res.status(200).json({
        message: "Total Approvel ",
        data: result,
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  getBookingCancelledList: async (req, res) => {
    try {
      let payload = req.body;
      let reqData = req.query;
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .where((qb) => {
            qb.where("entity_bookings.isBookingCancelled", true);

            qb.where("entity_bookings.entityId", payload.id);

            qb.where("entity_bookings.entityType", "facility_master");

            qb.where("entity_bookings.orgId", req.orgId);
          })
          .first(),
        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .select([
            "entity_bookings.*",
            "facility_master.name",
            "users.name as bookedUser",
          ])
          .where((qb) => {
            qb.where("entity_bookings.isBookingCancelled", true);

            qb.where("entity_bookings.entityId", payload.id);

            qb.where("entity_bookings.entityType", "facility_master");

            qb.where("entity_bookings.orgId", req.orgId);
          })
          .orderBy("entity_bookings.createdAt", "desc")
          .offset(offset)
          .limit(per_page),
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
          booking: pagination,
        },
        message: "Facility cancelled booked List!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  /*GET FACILITY LISTING */
  getFacilityListing: async (req, res) => {
    try {
      let payload = req.body;
      console.log("payloadData++++++++", payload);
      let rows;

      let pagination = {};
      if (payload.pid) {
        [rows] = await Promise.all([
          knex
            .from("facility_master")
            .where({
              "facility_master.orgId": req.orgId,
              "facility_master.isActive": true,
              "facility_master.projectId": payload.pid,
            })
            .select(["facility_master.id", "facility_master.name"])
            .groupBy(["facility_master.id"])
            .orderBy("facility_master.displayId", "asc"),
        ]);
      } else {
        [rows] = await Promise.all([
          knex
            .from("facility_master")
            .where({
              "facility_master.orgId": req.orgId,
              "facility_master.isActive": true,
            })
            .select(["facility_master.id", "facility_master.name"])
            .groupBy(["facility_master.id"])
            .orderBy("facility_master.displayId", "asc"),
        ]);
      }

      pagination.data = rows;

      return res.status(200).json({
        data: {
          facilities: pagination,
        },
        message: "Facility Listing!",
      });
    } catch (err) {
      console.log("[controllers][facilityBooking][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /** GET UNITS BY FACILITY */

  getUnitByBuilding: async (req, res) => {
    try {
      const { buildingId } = req.body;

      let getPropertyUnits = await knex("property_units")
        .select("*")
        .where({ buildingPhaseId: buildingId, orgId: req.orgId });
      console.log("getUnits", getPropertyUnits);

      let getFacilityList = await knex("facility_master")
        .select("*")
        .where({ buildingPhaseId: buildingId, orgId: req.orgId, status: true });

      let result = { units: getPropertyUnits, facility: getFacilityList };
      return res.status(200).json({
        data: {
          data: result,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getPropertyUnitListForReport: async (req, res) => {
    try {
      let orgId = req.orgId;
      console.log("report orgId", orgId);

      let result = await knex("property_units")
        .select("*")
        .where("property_units.orgId", orgId);

      return res.status(200).json({
        data: {
          data: result,
        },
        message: "Property Unit List",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /** GET TENANTS BY UNIT */

  getTenantByUnit: async (req, res) => {
    try {
      const { unitId } = req.body;

      let getTenants = await knex
        .from("user_house_allocation")
        .leftJoin("users", "user_house_allocation.userId", "users.id")
        .select(["users.name", "users.id"])
        .where("user_house_allocation.houseId", unitId);
      console.log("getTenants", getTenants);
      return res.status(200).json({
        data: {
          tenants: getTenants,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getTenantList: async (req, res) => {
    try {
      let orgId = req.orgId;
      let tenantList = await knex
        .from("user_house_allocation")
        .leftJoin("users", "user_house_allocation.userId", "users.id")
        .select(["users.name", "users.id"])
        .where("users.orgId", orgId);

      return res.status(200).json({
        data: {
          tenants: tenantList,
        },
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /* GET FACILITY AVAILABLE SEATS */
  getFacilityAvailableSeats: async (req, res) => {
    try {
      let payload = req.body;
      let unitIds;
      let checkQuotaByUnit;
      let dailyQuota;
      let weeklyQuota;
      let monthlyQuota;

      const schema = Joi.object().keys({
        facilityId: Joi.string().required(),
        bookingStartDateTime: Joi.date().required(),
        bookingEndDateTime: Joi.date().required(),
        offset: Joi.number().required(),
        currentTime: Joi.date().required(),
        timezone: Joi.string().required(),
        unitId: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      // Start New Implementation

      // Get project id

      let facilityMaster = await knex("facility_master")
        .select("projectId")
        .where({ id: payload.facilityId, orgId: req.orgId, isActive: true })
        .first();
      console.log("facilityBook", facilityMaster);

      if (!facilityMaster) {
        return res.status(400).json({
          errors: [{ code: "NOT_FOUND", message: `Facility Closed.` }],
        });
      }

      let getPropertyUnits = await knex("property_units").select("*").where({
        projectId: facilityMaster.projectId,
        orgId: req.orgId,
        id: payload.unitId,
      });

      console.log("getPropertyUnits", getPropertyUnits);

      unitIds = payload.unitId; //;
      // Case 2: If property unit does not have any property unit type set
      // Error :
      console.log(
        "getPropertyUnits[0].propertyUnitType",
        getPropertyUnits[0].propertyUnitType
      );

      if (getPropertyUnits[0].propertyUnitType == null) {
        return res.status(400).json({
          errors: [
            {
              code: "PROPERTY_UNIT_TYPE_STATUS",
              message: `Property unit type of one of your properties is not defined please contact admin.....`,
            },
          ],
        });
      }

      let getFacilityQuotaData = await knex(
        "facility_property_unit_type_quota_limit"
      )
        .select("*")
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          propertyUnitTypeId: getPropertyUnits[0].propertyUnitType,
          orgId: req.orgId,
        });
      console.log(
        "FacilityQuotaUnitWise",
        getFacilityQuotaData,
        getFacilityQuotaData.length
      );

      let facilityData = await knex
        .from("entity_booking_criteria")
        .select("entity_booking_criteria.concurrentBookingLimit")
        .where({
          "entity_booking_criteria.entityId": payload.facilityId,
          "entity_booking_criteria.entityType": "facility_master",
          "entity_booking_criteria.orgId": req.orgId,
        })
        .first();

      if (
        facilityData.concurrentBookingLimit == null ||
        getFacilityQuotaData == ""
      ) {
        // Case 1 : concurrent booking is not defined and property unit type not set quota for this facility,  all quota type  will set as unlimited
        dailyQuota = 999999;
        monthlyQuota = 999999;
        weeklyQuota = 999999;
      } else {
        console.log(
          "getFacilityQuotaData11111111111111",
          getFacilityQuotaData[0].daily
        );
        dailyQuota = getFacilityQuotaData[0].daily;
        weeklyQuota = getFacilityQuotaData[0].weekly;
        monthlyQuota = getFacilityQuotaData[0].monthly;
      }
      console.log(
        "daily/monthly/weekly",
        dailyQuota,
        weeklyQuota,
        monthlyQuota
      );

      // checkQuotaByUnit = await knex('property_units').select('propertyUnitType').where({ id: getPropertyUnits[0].id, orgId: req.orgId }).first();

      // Set timezone for moment
      moment.tz.setDefault(payload.timezone);
      let currentTime = moment();
      console.log(
        "Current Time:",
        currentTime.format("MMMM Do YYYY, h:mm:ss a")
      );

      let bookingStartTime = moment(+payload.bookingStartDateTime)
        .seconds(0)
        .milliseconds(0)
        .valueOf();
      let bookingEndTime = moment(+payload.bookingEndDateTime)
        .seconds(0)
        .milliseconds(0)
        .valueOf();
      console.log(
        "User Selected Booking Start/End Time: ",
        moment(bookingStartTime).format("YYYY-MM-DD HH:mm"),
        moment(bookingEndTime).format("YYYY-MM-DD HH:mm")
      );

      let bookingDay = moment(bookingStartTime).format("ddd");
      console.log("Checking Booking Availability of Day: ", bookingDay);

      let openCloseTimes = await knex
        .from("entity_open_close_times")
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          orgId: req.orgId,
          day: bookingDay,
        })
        .first();
      console.log("openCloseTimes:", openCloseTimes);

      let bookingFullDay = moment(bookingStartTime).format("dddd");

      if (!openCloseTimes) {
        return res.status(400).json({
          errors: [
            {
              code: "BOOKING_CLOSED_FOR_THE_DAY",
              message: `Booking is not opened for selected day (${bookingFullDay}).`,
            },
          ],
        });
      }

      // Get Booking Daily,Monthly,Weekly Quota By UNIT
      // let getFacilityQuotaUnitWise = await knex('facility_property_unit_type_quota_limit').select('*').where({ entityId: payload.facilityId, entityType: 'facility_master', propertyUnitTypeId: checkQuotaByUnit.propertyUnitType, orgId: req.orgId }).first();
      // console.log("FacilityQuotaUnitWise", getFacilityQuotaUnitWise);

      // check facility is closed

      let closeFacility = await knex("facility_master")
        .select("inActiveReason")
        .where({ id: payload.facilityId, orgId: req.orgId, isActive: false })
        .first();

      console.log("closedFacility", closeFacility);
      if (closeFacility) {
        let closeReasonMessage = closeFacility.inActiveReason;

        return res.status(400).json({
          errors: [
            {
              code: "FACILITY_CLOSED_STATUS",
              message: `Facility is closed : Reason- ${closeReasonMessage}.`,
            },
          ],
        });
      }

      // check facility is closed

      let closeFacilityTiming = await knex("facility_close_date")
        .select("*")
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          orgId: req.orgId,
        })
        .where("facility_close_date.endDate", ">", bookingStartTime)
        .where("facility_close_date.startDate", "<", bookingEndTime)
        .first();

      console.log("closeFacilityTiming", closeFacilityTiming);
      if (closeFacilityTiming) {
        let closeReason = await knex("facility_close_date")
          .select("closeReason")
          .where({
            entityId: payload.facilityId,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .first();

        let closeReasonMessage = closeReason.closeReason;

        return res.status(400).json({
          errors: [
            {
              code: "FACILITY_CLOSED",
              message: `Facility is closed for selected time slot : Reason- ${closeReasonMessage}.`,
            },
          ],
        });
      }

      let bookingCriteria = await knex("entity_booking_criteria")
        .select("*")
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          orgId: req.orgId,
        })
        .first();
      console.log("bookingCriteria", bookingCriteria);

      if (bookingCriteria && bookingCriteria.bookingType == "1") {
        // Flexible Booking

        if (bookingEndTime <= bookingStartTime) {
          return res.status(400).json({
            errors: [
              {
                code: "INVALID_DATE_TIME_SELECTION",
                message: `Booking end time should be greater than start time. Please correct!`,
              },
            ],
          });
        }

        let openingTimeOnBookingDay = moment(bookingStartTime)
          .hours(moment(+openCloseTimes.openTime).hours())
          .minutes(moment(+openCloseTimes.openTime).minutes())
          .seconds(0)
          .milliseconds(0);

        let closingTimeOnBookingDay = moment(bookingStartTime)
          .hours(moment(+openCloseTimes.closeTime).hours())
          .minutes(moment(+openCloseTimes.closeTime).minutes())
          .seconds(0)
          .milliseconds(0);

        console.log(
          "openingTimeOnBookingDay:",
          openingTimeOnBookingDay.format("YYYY-MM-DD HH:mm:ss")
        );
        console.log(
          "closingTimeOnBookingDay:",
          closingTimeOnBookingDay.format("YYYY-MM-DD HH:mm:ss")
        );

        if (
          openingTimeOnBookingDay.valueOf() > moment(bookingStartTime).valueOf()
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "INVALID_DATE_TIME_SELECTION",
                message: `Please select booking start and end time b/w opening and closing hours for the day.`,
              },
            ],
          });
        }

        if (
          closingTimeOnBookingDay.valueOf() < moment(bookingEndTime).valueOf()
        ) {
          return res.status(400).json({
            errors: [
              {
                code: "INVALID_DATE_TIME_SELECTION",
                message: `Please select booking start and end time b/w opening and closing hours for the day.`,
              },
            ],
          });
        }

        let bookingPeriodAllow = await knex("entity_booking_criteria")
          .select(["maxBookingPeriod", "minBookingPeriod"])
          .where({
            entityId: payload.facilityId,
            bookingType: 1,
            entityType: "facility_master",
            orgId: req.orgId,
          })
          .first();
        console.log("maxBookingPeriodAllow", bookingPeriodAllow);
        let maxDuration;
        let minDuration;

        if (bookingPeriodAllow && bookingPeriodAllow.maxBookingPeriod) {
          maxDuration =
            moment(+payload.bookingEndDateTime) -
            moment(+payload.bookingStartDateTime);
          let maxDurationInMinutes = maxDuration / 1000 / 60;
          console.log("maxDuration", maxDurationInMinutes);

          if (maxDurationInMinutes > bookingPeriodAllow.maxBookingPeriod) {
            return res.status(400).json({
              errors: [
                {
                  code: "MAX_BOOKING_DURATION",
                  message: `Maximum booking duration allowed is ${bookingPeriodAllow.maxBookingPeriod} minutes. You can not book more then max duration.`,
                },
              ],
            });
          }
        }

        if (bookingPeriodAllow && bookingPeriodAllow.minBookingPeriod) {
          minDuration =
            moment(+payload.bookingEndDateTime) -
            moment(+payload.bookingStartDateTime);
          let minDurationInMinutes = minDuration / 1000 / 60;
          console.log("minDuration", minDurationInMinutes);

          if (minDurationInMinutes < bookingPeriodAllow.minBookingPeriod) {
            return res.status(400).json({
              errors: [
                {
                  code: "MIN_BOOKING_DURATION",
                  message: `Minimum booking duration allowed is ${bookingPeriodAllow.minBookingPeriod} minutes. You can not book less then min duration.`,
                },
              ],
            });
          }
        }
      }

      let bookingAllowingTiming = await knex("entity_booking_criteria")
        .select(["bookingAllowedAdvanceTime", "bookingCloseAdvanceTime"])
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          orgId: req.orgId,
        })
        .first();

      console.log(
        "Booking Start Time:",
        moment(bookingStartTime).format("MMMM Do YYYY, h:mm:ss a")
      );
      console.log("bookingAllowingTiming", bookingAllowingTiming);

      if (
        bookingAllowingTiming &&
        bookingAllowingTiming.bookingAllowedAdvanceTime
      ) {
        console.log(
          "Advance Allow Time:",
          moment(currentTime)
            .add(+bookingAllowingTiming.bookingAllowedAdvanceTime, "minutes")
            .format("MMMM Do YYYY, h:mm:ss a")
        );

        let isValidBookingInsideAllowPeriod =
          moment(currentTime).add(
            +bookingAllowingTiming.bookingAllowedAdvanceTime,
            "minutes"
          ) > moment(bookingStartTime);

        console.log(
          "isValidBookingInsideAllowPeriod",
          isValidBookingInsideAllowPeriod
        );

        if (!isValidBookingInsideAllowPeriod) {
          let advanceString = bookingAllowingTiming.bookingAllowedAdvanceTime;
          if (parseInt(advanceString / 24 / 60) > 0) {
            advanceString =
              parseInt(advanceString / 24 / 60) +
              " days, " +
              parseInt((advanceString / 60) % 24) +
              " hours, " +
              parseInt(advanceString % 60) +
              " minutes";
          } else {
            advanceString =
              parseInt((advanceString / 60) % 24) +
              " hours, " +
              parseInt(advanceString % 60) +
              " minutes";
          }

          return res.status(400).json({
            errors: [
              {
                code: "ADVANCED_BOOKING_ALLOW_DURATION",
                message: `Advance booking upto ${advanceString} is allowed only.`,
              },
            ],
          });
        }
      }

      if (
        bookingAllowingTiming &&
        bookingAllowingTiming.bookingCloseAdvanceTime
      ) {
        console.log(
          "Advance Booking Close Time:",
          moment(currentTime)
            .add(+bookingAllowingTiming.bookingCloseAdvanceTime, "minutes")
            .format("MMMM Do YYYY, h:mm:ss a")
        );

        let isValidBookingBeforeLockPeriod =
          moment(currentTime).add(
            +bookingAllowingTiming.bookingCloseAdvanceTime,
            "minutes"
          ) < moment(bookingStartTime);

        console.log(
          "isValidBookingBeforeLockPeriod",
          isValidBookingBeforeLockPeriod
        );

        if (!isValidBookingBeforeLockPeriod) {
          return res.status(400).json({
            errors: [
              {
                code: "ADVANCED_BOOKING_LOCK_DURATION",
                message: `Booking needs to be made before ${bookingAllowingTiming.bookingCloseAdvanceTime} minutes of booking start period.`,
              },
            ],
          });
        }
      }

      // Validate Daily Quota Limit, Weekly Quota Limit, And Monthly Quota Limit
      //let dailyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 1, entityType: 'facility_master', orgId: req.orgId }).first();

      let quotaBooked = 0;

      if (dailyQuota && dailyQuota > 0) {
        let dailyQuotas = Number(dailyQuota);
        console.log("dailyQuota", dailyQuota);
        let startOfDay = moment(+payload.bookingStartDateTime)
          .startOf("day")
          .valueOf();
        let endOfDay = moment(+payload.bookingStartDateTime)
          .endOf("day")
          .valueOf();
        console.log("startOfDay", startOfDay, endOfDay);

        let rawQuery = await knex.raw(
          `select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfDay}  and "bookingEndDateTime"  <= ${endOfDay} and "isBookingCancelled" = false  and "unitId" = ${unitIds} `
        );
        let totalBookedSeatForADay = rawQuery.rows[0].totalseats;
        console.log("total Bookings Done for a day", totalBookedSeatForADay);
        quotaBooked = dailyQuota;
        // Checking Daily Booking Quota Limit Is Completed
        if (dailyQuotas <= totalBookedSeatForADay) {
          return res.status(400).json({
            errors: [
              {
                code: "DAILY_QUOTA_EXCEEDED",
                message: `Your daily quota of ${dailyQuota} seat bookings is full. You can not book any more seats today.`,
              },
            ],
          });
        }

        // if (dailyQuota <= totalBookedSeatForADay) {
        //     return res.status(400).json({
        //         errors: [
        //             { code: "DAILY_QUOTA_EXCEEDED", message: `Your daily quota of ${dailyQuota} seat bookings is full. You can not book any more seats today.` }
        //         ]
        //     });
        // }
      }

      //let weeklyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 2, entityType: 'facility_master', orgId: req.orgId }).first();
      if (weeklyQuota && weeklyQuota > 0) {
        let weeklyQuotas = Number(weeklyQuota);
        let startOfWeek = moment(+payload.bookingStartDateTime)
          .startOf("week")
          .valueOf();
        let endOfWeek = moment(+payload.bookingStartDateTime)
          .endOf("week")
          .valueOf();
        console.log("startOfWeek", startOfWeek, endOfWeek);
        console.log("weeklyQuota", weeklyQuota);
        let rawQuery = await knex.raw(
          `select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfWeek}  and "bookingEndDateTime"  <= ${endOfWeek} and "isBookingCancelled" = false  and "unitId" = ${unitIds} `
        );
        let totalBookedSeatForAWeek = rawQuery.rows[0].totalseats;
        console.log("total Bookings Done for a week", totalBookedSeatForAWeek);
        quotaBooked = weeklyQuota;
        // Checking Weekly Booking Quota Limit Is Completed
        if (weeklyQuotas <= totalBookedSeatForAWeek) {
          return res.status(400).json({
            errors: [
              {
                code: "WEEKLY_QUOTA_EXCEEDED",
                message: `Your weekly quota of ${weeklyQuota} seat bookings is full. You can not book any more seats in this week.`,
              },
            ],
          });
        }

        // if (weeklyQuota <= totalBookedSeatForAWeek) {
        //     return res.status(400).json({
        //         errors: [
        //             { code: "WEEKLY_QUOTA_EXCEEDED", message: `Your weekly quota of ${weeklyQuota} seat bookings is full. You can not book any more seats in this week.` }
        //         ]
        //     });
        // }
      }

      // let monthlyQuota = await knex('entity_booking_limit').select(['limitType', 'limitValue']).where({ entityId: payload.facilityId, limitType: 3, entityType: 'facility_master', orgId: req.orgId }).first();

      if (monthlyQuota && monthlyQuota > 0) {
        let monthlyQuotas = Number(monthlyQuota);
        console.log("monthlyQuota", monthlyQuotas);

        let startOfMonth = moment(+payload.bookingStartDateTime)
          .startOf("month")
          .valueOf();
        let endOfMonth = moment(+payload.bookingStartDateTime)
          .endOf("month")
          .valueOf();
        console.log("startOfMonth", startOfMonth, endOfMonth);

        let rawQuery = await knex.raw(
          `select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOfMonth}  and "bookingEndDateTime"  <= ${endOfMonth} and "isBookingCancelled" = false and "unitId" = ${unitIds} `
        );
        let totalBookedSeatForAMonth = rawQuery.rows[0].totalseats;
        console.log(
          "total Bookings Done for a month",
          totalBookedSeatForAMonth
        );
        quotaBooked = monthlyQuota;
        // Checking Monthly Booking Quota Limit Is Completed
        if (monthlyQuotas <= totalBookedSeatForAMonth) {
          return res.status(400).json({
            errors: [
              {
                code: "MONTHLY_QUOTA_EXCEEDED",
                message: `Your monthly quota of ${monthlyQuota} seat bookings is full. You can not book any more seats in this month.`,
              },
            ],
          });
        }
        // if (monthlyQuota <= totalBookedSeatForAMonth) {
        //     return res.status(400).json({
        //         errors: [
        //             { code: "MONTHLY_QUOTA_EXCEEDED", message: `Your monthly quota of ${monthlyQuota} seat bookings is full. You can not book any more seats in this month.` }
        //         ]
        //     });
        // }
      }

      let availableSeats = 0;

      // let startOfDay = moment(+payload.bookingStartDateTime).startOf('day').valueOf();
      // let endOfDay = moment(+payload.bookingStartDateTime).endOf('day').valueOf();

      // let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
      //     .where('entity_bookings.bookingStartDateTime', '>=', startOfDay)
      //     .where('entity_bookings.bookingEndDateTime', '<=', endOfDay)
      //     .where({ 'entityId': payload.facilityId, 'isBookingCancelled': false, 'entityType': 'facility_master', 'orgId': req.orgId }).first();

      let bookingData = await knex("entity_bookings")
        .sum("noOfSeats as totalBookedSeats")
        .where("entity_bookings.bookingEndDateTime", ">", bookingStartTime)
        .where("entity_bookings.bookingStartDateTime", "<", bookingEndTime)
        .where({
          entityId: payload.facilityId,
          entityType: "facility_master",
          isBookingCancelled: false,
          orgId: req.orgId,
        })
        .first();
      console.log("totalBookingSeats/bookingData", bookingData);

      // let bookingData = await knex('entity_bookings').sum('noOfSeats as totalBookedSeats')
      //     .where('entity_bookings.bookingStartDateTime', '>=', bookingStartTime)
      //     .where('entity_bookings.bookingStartDateTime', '<=', bookingEndTime)
      //     .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', 'isBookingCancelled': false, 'orgId': req.orgId }).first();

      let facilityDatas = await knex
        .from("facility_master")
        .leftJoin(
          "entity_booking_criteria",
          "facility_master.id",
          "entity_booking_criteria.entityId"
        )
        .select([
          "facility_master.id",
          "facility_master.name",
          "facility_master.multipleSeatsLimit",
          "entity_booking_criteria.minBookingPeriod",
          "entity_booking_criteria.maxBookingPeriod",
          "entity_booking_criteria.bookingAllowedAdvanceTime",
          "entity_booking_criteria.bookingCloseAdvanceTime",
          "entity_booking_criteria.allowConcurrentBooking",
          "entity_booking_criteria.concurrentBookingLimit",
        ])
        .where({
          "facility_master.id": payload.facilityId,
          "facility_master.orgId": req.orgId,
        })
        .first();

      // Check if pax capacity disable and set NO
      if (facilityDatas.allowConcurrentBooking == true) {
        availableSeats =
          Number(facilityDatas.concurrentBookingLimit) -
          Number(bookingData.totalBookedSeats);
      } else if (
        facilityDatas.allowConcurrentBooking == false &&
        facilityDatas.concurrentBookingLimit == 0
      ) {
        availableSeats = Number(5000);
      } else if (
        facilityDatas.allowConcurrentBooking == false &&
        facilityDatas.concurrentBookingLimit != 0
      ) {
        availableSeats =
          Number(facilityDatas.concurrentBookingLimit) -
          Number(bookingData.totalBookedSeats);
      }

      console.log(
        "totalSeatAvailable",
        facilityDatas.concurrentBookingLimit,
        bookingData.totalBookedSeats
      );
      console.log("availableSeats", availableSeats);

      // let AllQuotaData = await knex('facility_property_unit_type_quota_limit')
      //     .where({ 'entityId': payload.facilityId, 'entityType': 'facility_master', propertyUnitTypeId: checkQuotaByUnit.propertyUnitType, orgId: req.orgId }).first();

      let startOf;
      let endOf;
      let dailyLimit = 0;
      let weeklyLimit = 0;
      let monthlyLimit = 0;
      let dailyRemainingLimit = 0;
      let dailyBookedSeat = 0;
      let weeklyRemainingLimit = 0;
      let weeklyBookedSeat = 0;
      let monthlyRemainingLimit = 0;
      let monthlyBookedSeat = 0;

      if (dailyQuota && dailyQuota > 0) {
        startOf = moment(+payload.bookingStartDateTime)
          .startOf("day")
          .valueOf();
        endOf = moment(+payload.bookingStartDateTime)
          .endOf("day")
          .valueOf();

        let rawQuery = await knex.raw(
          `select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and "isBookingCancelled" = false and "unitId" = ${unitIds} `
        );
        console.log("totalBookedSeats", rawQuery.rows);
        let totalBookedSeat = rawQuery.rows[0].totalseats;

        dailyLimit = dailyQuota;
        dailyRemainingLimit = dailyQuota - totalBookedSeat;
        dailyBookedSeat = totalBookedSeat;
      }

      if (weeklyQuota && weeklyQuota > 0) {
        startOf = moment(+payload.bookingStartDateTime)
          .startOf("week")
          .valueOf();
        endOf = moment(+payload.bookingStartDateTime)
          .endOf("week")
          .valueOf();

        let rawQuery = await knex.raw(
          `select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf}  and "isBookingCancelled" = false and "unitId" = ${unitIds} `
        );
        console.log("totalBookedSeats", rawQuery.rows);
        let totalBookedSeat = rawQuery.rows[0].totalseats;

        weeklyLimit = weeklyQuota;
        weeklyRemainingLimit = weeklyQuota - totalBookedSeat;
        weeklyBookedSeat = totalBookedSeat;
      }

      if (monthlyQuota && monthlyQuota > 0) {
        startOf = moment(+payload.bookingStartDateTime)
          .startOf("month")
          .valueOf();
        endOf = moment(+payload.bookingStartDateTime)
          .endOf("month")
          .valueOf();

        let rawQuery = await knex.raw(
          `select count(*) AS totalSeats from entity_bookings where "entityId"  = ${payload.facilityId}  and  "bookingStartDateTime" >= ${startOf}  and "bookingEndDateTime"  <= ${endOf} and  "isBookingCancelled" = false and "unitId" = ${unitIds} `
        );
        console.log("totalBookedSeats", rawQuery.rows);
        let totalBookedSeat = rawQuery.rows[0].totalseats;

        monthlyLimit = monthlyQuota;
        monthlyRemainingLimit = monthlyQuota - totalBookedSeat;
        monthlyBookedSeat = totalBookedSeat;
      }

      let remainingLimit = {
        daily: Number(dailyLimit),
        dailyRemaining: Number(dailyRemainingLimit),
        dailyBookedSeats: Number(dailyBookedSeat),
        weekly: Number(weeklyLimit),
        weeklyRemaining: Number(weeklyRemainingLimit),
        weeklyBookedSeats: Number(weeklyBookedSeat),
        monthly: Number(monthlyLimit),
        monthlyRemaining: Number(monthlyRemainingLimit),
        monthlyBookedSeats: Number(monthlyBookedSeat),
      };
      //let bookedSeat = totalBookedSeat;

      let QuotaData = {
        remainingLimit,
      };

      console.log("quota", QuotaData);

      return res.status(200).json({
        data: {
          facility: { ...facilityData, availableSeats, userQuota: QuotaData },
        },
        message: "Facility Data successfully!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  facilityBookedReport: async (req, res) => {
    try {
      let payload = req.body;
      let { startDate, endDate } = req.body;
      console.log("facility list", req.body);

      if (startDate && endDate) {
        startNewDate = moment(startDate).startOf("time").format();
        endNewDate = moment(endDate).endOf("time").format();
        startTime = new Date(startNewDate).getTime();
        endTime = new Date(endNewDate).getTime();
      }

      const schema = Joi.object().keys({
        startDate: Joi.string().required(),
        endDate: Joi.string().required(),
      });
      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      let listResult = await knex("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .leftJoin("companies", "entity_bookings.companyId", "companies.id")
        .select([
          "entity_bookings.*",
          "facility_master.name",
          "users.name as bookedUser",
        ])
        .where("entity_bookings.bookingStartDateTime", ">=", startTime)
        .where("entity_bookings.bookingEndDateTime", "<=", endTime);

      return res.status(200).json({
        data: {
          booking: listResult,
        },
        message: "Facility booked List!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  getFacilityBookedCancelledList: async (req, res) => {
    try {
      let payload = req.body;
      let { startDate, endDate } = req.body;

      if (startDate && endDate) {
        startNewDate = moment(startDate).startOf("time").format();
        endNewDate = moment(endDate).endOf("time").format();
        startTime = new Date(startNewDate).getTime();
        endTime = new Date(endNewDate).getTime();
      }
      const schema = Joi.object().keys({
        startDate: Joi.string().required(),
        endDate: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      // let listResult = await knex("entity_bookings")
      // .leftJoin(
      //   "facility_master",
      //   "entity_bookings.entityId",
      //   "facility_master.id"
      // )
      // .leftJoin("users", "entity_bookings.bookedBy", "users.id").
      // leftJoin("facility_close_date","entity_bookings.entityId","facility_close_date.entityId")
      // .select([
      //   "entity_bookings.*",
      //   "facility_master.name",
      //   "users.name as bookedUser",

      // ])
      // .where("entity_bookings.isBookingCancelled", true)
      // .where("facility_close_date.startDate", ">=", startDate)
      // .where("facility_close_date.endDate", "<=", endDate)
      // ;
      let listResult = await knex("facility_close_date")
        .leftJoin(
          "entity_bookings",
          "facility_close_date.entityId",
          "entity_bookings.entityId"
        )
        .leftJoin(
          "facility_master",
          "facility_close_date.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .select([
          "entity_bookings.*",
          "facility_master.name",
          "users.name as bookedUser",
        ])
        .where("facility_close_date.startDate", ">=", startDate)
        .where("facility_close_date.endDate", "<=", endDate);
      return res.status(200).json({
        data: {
          booking: listResult,
        },
        message: "Facility booked List!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  getFacilityBookedListbydate: async (req, res) => {
    try {
      let payload = req.body;
      let { startDate, endDate, facilityId } = req.body;
      console.log("facility list one", req.body);

      if (startDate && endDate) {
        startNewDate = moment(startDate).startOf("time").format();
        endNewDate = moment(endDate).endOf("time").format();
        startTime = new Date(startNewDate).getTime();
        endTime = new Date(endNewDate).getTime();
      }

      const schema = Joi.object().keys({
        startDate: Joi.date().required(),
        endDate: Joi.date().required(),
        facilityId: Joi.number().required(),
        offset: Joi.number().required(),
        currentTime: Joi.date().required(),
        timezone: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }
      // console.log("payload timezone",payload.timezone)

      moment.tz.setDefault(payload.timezone);
      let currentTime = moment();
      console.log(
        "Current Time:",
        currentTime.format("MMMM Do YYYY, h:mm:ss a")
      );

      let bookingStartTime = moment(+payload.startDate)
        .seconds(0)
        .milliseconds(0)
        .valueOf();
      let bookingEndTime = moment(+payload.endDate)
        .seconds(0)
        .milliseconds(0)
        .valueOf();
      console.log("bookingStartTime", bookingStartTime, bookingEndTime);

      // .where("facility_close_date.endDate", ">", bookingStartTime)
      // .where("facility_close_date.startDate", "<", bookingEndTime)

      let listResult = await knex("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .select([
          "entity_bookings.*",
          "facility_master.name",
          "users.name as bookedUser",
        ])
        .where("entity_bookings.bookingStartDateTime", "<", bookingEndTime)
        .where("entity_bookings.bookingEndDateTime", ">", bookingStartTime)
        .where("entity_bookings.isBookingCancelled", "=", false)
        .where("entity_bookings.entityId", "=", facilityId);

      return res.status(200).json({
        data: {
          booking: listResult,
        },
        message: "Facility booked List!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  facilityBookedListByFacilityName: async (req, res) => {
    try {
      // let payload = req.body
      let bookingListResult = await knex("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .select([
          "entity_bookings.id",
          "entity_bookings.bookingStartDateTime",
          "entity_bookings.bookingEndDateTime",
          "entity_bookings.noOfSeats",
          "entity_bookings.feesPaid",
          "entity_bookings.bookedAt",
          // "entity_bookings.*",
          "facility_master.name",
          "users.name as bookedUser",
        ]);
      // let facilityName=[]
      // let allDataFromBooking=[]
      // bookingListResult.forEach(data=>{
      //   facilityName.push(data.name)
      // })let unique = [...new Set(myArray)];

      // bookingListResult.forEach(eachBooking=>{
      //   facilityName.forEach(eachBookingName=>{
      //     if(eachBooking.name==eachBookingName){
      //       let eachBookingName=[];
      //       eachBookingName.push(eachBooking);
      //       allDataFromBooking.push(eachBookingName)
      //       eachBookingName=[];
      //     }
      //   })
      // })

      let swimmingpool = [];
      let teniss = [];
      let maleOnsen = [];
      let spaOmg = [];
      let wellnessRoom = [];
      let yogaFly = [];
      let onsen = [];
      let meetingRoom = [];

      console.log("booking list", bookingListResult);
      bookingListResult.forEach((data) => {
        if (data.name == "Heated Swimming Pool") {
          swimmingpool.push(data);
        } else if (data.name == "OMG Tennis Court 8") {
          teniss.push(data);
        } else if (data.name == "Male Onsen") {
          maleOnsen.push(data);
        } else if (data.name == "Spa OMG") {
          spaOmg.push(data);
        } else if (data.name == "Wellness Room") {
          wellnessRoom.push(data);
        } else if (data.name == "Yoga Fly") {
          yogaFly.push(data);
        } else if (data.name == "Onsen") {
          onsen.push(data);
        } else if (data.name == "Meeting Room") {
          meetingRoom.push(data);
        }
      });
      // let facilityName = await knex("facility_master")
      // .select(["facility_master.name"])

      res.status(200).json({
        data: {
          //  AllDataFromBooking: allDataFromBooking,
          Swimmingpool: swimmingpool,
          Teniss: teniss,
          MaleOnsen: maleOnsen,
          SpaOmg: spaOmg,
          WellnessRoom: wellnessRoom,
          YogaFly: yogaFly,
          Onsen: onsen,
          MeetingRoom: meetingRoom,
        },
        message: "Facility booked list",
      });
    } catch (err) {
      console.log("[controllers][facility][listByFacilityName] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  facilityBookedListByUnit: async (req, res) => {
    try {
      // let {} =req.body
      let payload = req.body;
      // let reqData = req.query
      let {
        facilityName,
        status,
        companyId,
        projectId,
        buildingPhaseId,
        unitNo,
        tenantName,
      } = req.body;
      let Status;
      if(status){
        Status = status.join(' ')
      }
      console.log("status of facility", status);
      
      moment.tz.setDefault(payload.timezone);
      let currentTime = moment();

      let bookingStartTime = moment(+payload.bookingDateTimeFrom)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let bookingEndTime = moment(+payload.bookingDateTimeTo)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let createStartTime = moment(+payload.createdDateFrom)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let createdEndTime = moment(+payload.createdDateTo)
      .seconds(0)
      .milliseconds(0)
      .valueOf();
      let bookingListResult;
      if (
        status ||
        facilityName ||
        companyId ||
        projectId ||
        buildingPhaseId ||
        unitNo ||
        tenantName
      ) {
        try {
          bookingListResult = await knex
            .from("entity_bookings")
            .leftJoin(
              "facility_master",
              "entity_bookings.entityId",
              "facility_master.id"
            )
            .leftJoin("users", "entity_bookings.bookedBy", "users.id")
            .leftJoin(
              "property_units",
              "entity_bookings.unitId",
              "property_units.id"
            )
            .leftJoin(
              "property_unit_type_master",
              "property_units.propertyUnitType",
              "property_unit_type_master.id"
            )
            .select(
              "entity_bookings.id",
              "entity_bookings.orgId",
              "entity_bookings.bookingStartDateTime",
              "entity_bookings.bookingEndDateTime",
              "entity_bookings.noOfSeats",
              "entity_bookings.feesPaid",
              "entity_bookings.bookedAt",
              "entity_bookings.createdAt",
              "entity_bookings.isBookingConfirmed",
              "entity_bookings.isBookingCancelled",
              "entity_bookings.confirmedType",
              "facility_master.name",
              "users.name as bookedUser",
              "property_units.unitNumber",
              "property_units.propertyUnitType as unitType",
              "property_units.description",
              "property_unit_type_master.propertyUnitTypeCode",
              "property_unit_type_master.descriptionEng"
            )
            .where("entity_bookings.orgId", req.orgId)
            // .where("entity_bookings.bookingStartDateTime", ">=", fromBookTime)
            // .where("entity_bookings.bookingStartDateTime", "<=", toBookTime)
            .where("entity_bookings.createdAt", ">=", createStartTime)
            .where("entity_bookings.createdAt", "<=", createdEndTime)
            .where((qb) => {
              if (facilityName) {
                qb.whereIn("facility_master.name", facilityName);
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  ">=",
                  bookingStartTime
                );
                qb.where(
                  "entity_bookings.bookingStartDateTime",
                  "<=",
                  bookingEndTime
                );
              }
              if (tenantName) {
                qb.where("users.name", "iLIKE", `%${tenantName}%`);
              }

              if (status) {
                // let Status = status.join(" ")
                console.log("Status of status",Status)
                if (Status == "Pending") {
                  console.log("Pending",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                }
                if (Status == "Approved") {
                  console.log("Approved",status)
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", false);
                 // qb.where("entity_bookings.confirmedType", null);
                  qb.where("entity_bookings.confirmedType",0)
                }
                if (Status == "Confirmed") {
                  console.log("Confirmed",status)
                  qb.where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1});
                  // qb.where("entity_bookings.confirmedType", 1);
                }
                if (Status == "Cancelled") {
                  console.log("Cancelled",status)
                  qb.where("entity_bookings.isBookingCancelled", true);
                }
                if(Status ==  "Approved Pending Cancelled Confirmed"){
                  // console.log("All status",status)

                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingCancelled", false);
                }
                if(Status ==="Approved Pending Confirmed"){
                  // console.log("Pending, Approved,Confirmed ",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);

                }
                if(Status === "Approved Cancelled"){
                  // console.log("Approved and cancelled",status)
                  qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0});
                  qb.where({"entity_bookings.isBookingCancelled": true, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingCancelled": true, "entity_bookings.confirmedType":0 });
                
                }
                if(Status==="Approved Confirmed"){
                  // console.log("Approved and confirmed")
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  
                }
                if(Status === "Approved Pending"){
                  // console.log("Pending and approved",Status)
                  qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.isBookingCancelled": false,  "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": false, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":0});
                  
                  
                }
                if(Status === "Pending Confirmed"){
                  // console.log("Pending and Confirmed",status)
                  qb.where({"entity_bookings.isBookingConfirmed" : false, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":1});
                 
                }
                if(Status === "Pending Cancelled"){
                  // console.log("Pending,Cancelled",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingCancelled", true);

                }
                if(Status === "Approved Pending Cancelled"){
                  // console.log("Pending,Approved,Cancelled",status)
                  qb.where({"entity_bookings.isBookingConfirmed" : true,  "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingConfirmed": false, "entity_bookings.confirmedType":0});
                  qb.orWhere({"entity_bookings.isBookingCancelled": true,  "entity_bookings.confirmedType":0});
                  
                }
                if(Status === "Approved Cancelled Confirmed"){
                  // console.log("Approved,Cancelled,Confirmed",status)
                  qb.where("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.confirmedType", 1);
                }
                if(Status === "Pending Cancelled Confirmed"){
                  // console.log("Pending,Cancelled,confirmed",status)
                  qb.where("entity_bookings.isBookingConfirmed", false);
                  qb.where("entity_bookings.isBookingCancelled", false);
                  qb.orWhere("entity_bookings.isBookingCancelled", true);
                  qb.orWhere("entity_bookings.isBookingConfirmed", true);
                  qb.where("entity_bookings.confirmedType", 1);
                }
                if(Status === "Cancelled Confirmed"){
                  // console.log("Cancelled,confirmed",status)
                  qb.where({"entity_bookings.isBookingCancelled" : true});
                  qb.orWhere({"entity_bookings.confirmedType": 1,"entity_bookings.isBookingConfirmed" : true});
                 
                }
              }
              if (unitNo) {
                qb.where("entity_bookings.unitId", unitNo);
              }
              if (companyId) {
                qb.where("entity_bookings.companyId", companyId);
              }
              if (projectId) {
                qb.where("facility_master.projectId", projectId);
              }
              if (buildingPhaseId) {
                qb.where("facility_master.buildingPhaseId", buildingPhaseId);
              }
            });
        } catch (err) {
          console.log(
            "[controllers][facility][listByFacilityUnit] :  Error",
            err
          );
          //trx.rollback
          res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
          });
        }
      } else {
        bookingListResult = await knex("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .leftJoin(
            "property_units",
            "entity_bookings.unitId",
            "property_units.id"
          )
          .leftJoin(
            "property_unit_type_master",
            "property_units.propertyUnitType",
            "property_unit_type_master.id"
          )
          .select(
            "entity_bookings.id",
            "entity_bookings.orgId",
            "entity_bookings.bookingStartDateTime",
            "entity_bookings.bookingEndDateTime",
            "entity_bookings.noOfSeats",
            "entity_bookings.feesPaid",
            "entity_bookings.bookedAt",
            "entity_bookings.createdAt",
            "entity_bookings.isBookingConfirmed",
            "entity_bookings.isBookingCancelled",
            "entity_bookings.confirmedType",
            "facility_master.name",
            "users.name as bookedUser",
            "property_units.unitNumber",
            "property_units.propertyUnitType as unitType",
            "property_units.description",
            "property_unit_type_master.propertyUnitTypeCode",
            "property_unit_type_master.descriptionEng"
          )
          .where("entity_bookings.orgId", req.orgId)
          .where("entity_bookings.bookingStartDateTime", ">=", bookingStartTime)
          .where("entity_bookings.bookingStartDateTime", "<=", bookingEndTime)
          .where("entity_bookings.createdAt", ">=", createStartTime)
          .where("entity_bookings.createdAt", "<=", createdEndTime)
          .groupBy([
            "entity_bookings.id",
            "facility_master.id",
            "users.name",
            "property_units.unitNumber",
            "property_units.propertyUnitType",
            "property_units.description",
            "property_unit_type_master.propertyUnitTypeCode",
            "property_unit_type_master.descriptionEng",
          ])
          .orderBy("entity_bookings.id", "asc");
      }
      res.status(200).json({
        data: {
          BookingResult: bookingListResult,
        },
        message: "facility Booked List by unit",
      });
    } catch (err) {
      console.log("[controllers][facility][listByFacilityUnit] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  facilityBookedReportByCreatedDate: async (req, res) => {
    try {
      let bookingListResult = await knex("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .leftJoin(
          "property_units",
          "entity_bookings.unitId",
          "property_units.id"
        )
        .select(
          "entity_bookings.id",
          "entity_bookings.bookingStartDateTime",
          "entity_bookings.bookingEndDateTime",
          "entity_bookings.noOfSeats",
          "entity_bookings.feesPaid",
          "entity_bookings.bookedAt",
          "entity_bookings.isBookingConfirmed",
          "entity_bookings.isBookingCancelled",
          "entity_bookings.confirmedType",
          "facility_master.name",
          "users.name as bookedUser",
          "property_units.unitNumber"
        );
      let createDate1 = [];
      let createDate2 = [];
      bookingListResult.forEach((data) => {
        if (data.bookingStartDateTime == "1589788800000") {
          createDate1.push(data);
        } else if (data.bookingStartDateTime == "1589522400000") {
          createDate2.push(data);
        }
      });
      res.status(200).json({
        data:
          // bookingListResult

          {
            // CreateDate1:createDate1,
            // CreateDate2:createDate2
            BookingResult: bookingListResult,
          },
        message: "facility Booked List by unit",
      });
    } catch (err) {
      console.log(
        "[controllers][facility][listByFacilityCreatedDate] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getFacilityreportByBookingDate: async (req, res) => {
    try {
      let bookingListResult = await knex("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .leftJoin(
          "property_units",
          "entity_bookings.unitId",
          "property_units.id"
        )
        .select(
          "entity_bookings.id",
          "entity_bookings.bookingStartDateTime",
          "entity_bookings.bookingEndDateTime",
          "entity_bookings.noOfSeats",
          "entity_bookings.feesPaid",
          "entity_bookings.bookedAt",
          "facility_master.name",
          "users.name as bookedUser",
          "property_units.unitNumber"
        );

      let date1 = [];

      bookingListResult.forEach((data) => {
        if ((data.bookedAt = "1589262257832")) {
          date1.push(data);
        }
        // else if(data.)
      });
      res.status(200).json({
        data:
          // bookingListResult

          {
            Date1: date1,
            // BookingResult:bookingListResult
          },
        message: "facility Booked List by Booking Date",
      });
    } catch (err) {}
  },

  getFacilityBookedDetails: async (req, res) => {
    try {
      let payload = req.body;
      let rows;
      let pagination = {};

      [rows] = await Promise.all([
        knex
          .from("entity_bookings")
          .leftJoin(
            "facility_master",
            "entity_bookings.entityId",
            "facility_master.id"
          )
          .leftJoin("users", "entity_bookings.bookedBy", "users.id")
          .leftJoin(
            "property_units",
            "entity_bookings.unitId",
            "property_units.id"
          )
          .select([
            "entity_bookings.*",
            "facility_master.name",
            "facility_master.description as details",
            "users.name as bookedUser",
            "property_units.unitNumber",
            "property_units.description as pDescription",
          ])
          .where({
            "entity_bookings.orgId": req.orgId,
            "entity_bookings.entityId": payload.facilityId,
          })
          .orderBy("id", "desc")
          .limit(1)
          .first(),
      ]);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          booking: pagination,
        },
        message: "Facility booked Details!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  getFacilityDropDownList: async (req, res) => {
    try {
      let rows;

      let pagination = {};

      [rows] = await Promise.all([
        knex
          .from("facility_master")
          .where({
            "facility_master.orgId": req.orgId,
            "facility_master.isActive": true,
          })
          .select(["facility_master.id", "facility_master.name"])
          .groupBy(["facility_master.id"])
          .orderBy("facility_master.displayId", "asc"),
      ]);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          facilities: pagination,
        },
        message: "Facility Listing!",
      });
    } catch (err) {
      console.log("[controllers][facility][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  getFacilityByProject: async (req, res) => {
    try {
      let rows;
      let payload = req.body;
      let pagination = {};

      [rows] = await Promise.all([
        knex
          .from("facility_master")
          .where({
            "facility_master.orgId": req.orgId,
            "facility_master.isActive": true,
          })
          .where((qb) => {
            if (payload.projectId && payload.projectId != "all") {
              qb.where({ "facility_master.projectId": payload.projectId });
            }
          })
          .select(["facility_master.id", "facility_master.name"])
          .groupBy(["facility_master.id"]),
      ]);

      pagination.data = rows;

      return res.status(200).json({
        data: {
          facilities: pagination,
        },
        message: "Facility Listing!",
      });
    } catch (err) {
      console.log("[controllers][facility][list] :  Error", err);
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },

  /*UPDATE FACILITY STATUS*/
  updateFacilityStatus: async (req, res) => {
    try {
      let payload = req.body;
      const schema = Joi.object().keys({
        facilityId: Joi.number().required(),
        status: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      const currentTime = new Date().getTime();

      let updateData = {
        status: payload.status,
        updatedAt: currentTime,
      };

      let resultData = await knex("facility_master")
        .update(updateData)
        .where({ id: payload.facilityId })
        .returning(["*"]);

      return res
        .status(200)
        .json({ message: "Facility Status Updated!", data: resultData });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },
  cancelledBookingList: async (req, res) => {
    try {
      let payload = req.body;
      let { startDate, endDate } = req.body;
      console.log("facility list", req.body);

      if (startDate && endDate) {
        startNewDate = moment(startDate).startOf("time").format();
        endNewDate = moment(endDate).endOf("time").format();
        startTime = new Date(startNewDate).getTime();
        endTime = new Date(endNewDate).getTime();
      }

      const schema = Joi.object().keys({
        startDate: Joi.string().required(),
        endDate: Joi.string().required(),
      });

      const result = Joi.validate(payload, schema);
      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      let listResult = await knex("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .select([
          "entity_bookings.*",
          "facility_master.name",
          "users.name as bookedUser",
        ])
        .where("entity_bookings.bookingStartDateTime", ">=", startTime)
        .where("entity_bookings.bookingEndDateTime", "<=", endTime);

      return res.status(200).json({
        data: {
          booking: listResult,
        },
        message: "Facility booked List!",
      });
    } catch (err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERRROR", message: err.message }],
      });
    }
  },

  generateReportId: async (req, res) => {
    try {
      let facilityReportId = null;
      const currentTime = new Date().getTime();
      let orgId = req.orgId;

      const insertData = {
        isActive: "true",
        orgId: orgId,
        createdAt: currentTime,
        updatedAt: currentTime,
      };

      console.log(
        "[controllers][facilityReport][generateFacilityReport]: Insert Data",
        insertData
      );
      const facilityReportResult = await knex
        .insert(insertData)
        .returning("*")
        .into("facility_report_master");

      facilityReportId = facilityReportResult[0];

      res.status(200).json({
        data: {
          facilityReport: facilityReportId,
        },
        message: "facility Id generated successfully !",
      });
    } catch (err) {
      console.log(
        "[controllers][facilityReport][generateFacilityReport] :  Error",
        err
      );
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  addFacilityReport: async (req, res) => {
    try {
      let userId = req.me.id;
      let orgId = req.orgId;
      let { facilityReport, reportName } = req.body;

      await knex.transaction(async (trx) => {
        const facilityPayload = req.body;
        console.log(
          "[Controllers][facility_bookings][addReport]",
          facilityPayload.reportName
        );
        const schema = Joi.object().keys({
          reportName: Joi.string().required(),
          reportJson: Joi.object().required(),
        });
        const result = Joi.validate(facilityPayload, schema);
        console.log(
          "[Controller][Facility_bookings][addReport]:Joi result",
          result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: result.error.message },
            ],
          });
        }

        const currentTime = new Date().getTime();

        const insertData = {
          ...facilityPayload,
          orgId: orgId,
          createdBy: userId,
          createdAt: currentTime,
          updatedAt: currentTime,
          reportJson: JSON.stringify(facilityPayload),
        };
        console.log(
          "[controllers][facilityReport][addReport]: Insert Data",
          insertData
        );

        const facilityReportResult = await knex
          .insert(insertData)
          .returning(["*"])
          .transacting(trx)
          .into("facility_report_master");

        facilityReport = facilityReportResult[0];

        trx.commit;
      });

      res.status(200).json({
        data: {
          facilityReport: facilityReport,
        },
        message: "facility report added successfully !",
      });
    } catch (err) {
      console.log("[controllers][facility][reportAdd] :  Error", err);

      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getFacilityReportDetailById: async (req, res) => {
    try {
      const id = req.body.id;
      let orgId = req.orgId;
      // console.log("requested id",id)
      let reportResult = await knex("facility_report_master")
        .select([
          "facility_report_master.id",
          "facility_report_master.reportName",
          "facility_report_master.reportJson",
        ])
        .where("facility_report_master.orgId", orgId)
        .where("facility_report_master.id", id);

      return res.status(200).send({
        data: {
          facilityReport: reportResult,
        },
        message: "Facility Report Detail!",
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  getFacilityReportList: async (req, res) => {
    try {
      let sortPayload = req.body;
      if (!sortPayload.sortBy && !sortPayload.orderBy) {
        sortPayload.sortBy = "id";
        sortPayload.orderBy = "asc";
      }

      let reqData = req.query;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;
      let { searchValue } = req.body;
      let orgId = req.query.orgId;
      console.log("search value", searchValue);
      let total, rows;

      [total, rows] = await Promise.all([
        knex
          .count("* as count")
          .from("facility_report_master")
          .leftJoin("users", "users.id", "facility_report_master.createdBy")
          .where({ "facility_report_master.orgId": req.orgId })
          .orWhere({ "facility_report_master.orgId": 0 })
          .where((qb) => {
            if (searchValue) {
              qb.where(
                "facility_report_master.reportName",
                "iLIKE",
                `%${searchValue}%`
              );
              // qb.where({ "facility_report_master.orgId": req.orgId })
            }
          })
          .first(),
        knex
          .from("facility_report_master")
          .leftJoin("users", "users.id", "facility_report_master.createdBy")
          .where({ "facility_report_master.orgId": req.orgId })
          .orWhere({ "facility_report_master.orgId": 0 })
          .select([
            "facility_report_master.id as id",
            "facility_report_master.reportName",
            "facility_report_master.createdBy",
            "facility_report_master.orgId",
            "users.name as createdName",
          ])
          .where((qb) => {
            if (searchValue) {
              qb.where(
                "facility_report_master.reportName",
                "iLIKE",
                `%${searchValue}%`
              );
              // qb.where({ "facility_report_master.orgId": req.orgId })
            }
          })
          .orderBy(sortPayload.sortBy, sortPayload.orderBy)
          .offset(offset)
          .limit(per_page),
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
          facilityReport: pagination,
        },
        message: "Facility Report List!",
      });
    } catch (err) {
      console.log(
        "[controllers][facility_report_master][getReports],Error",
        err
      );
    }
  },
  deleteFacilityManagementReport: async (req, res) => {
    try {
      const id = req.body.id;

      let payload = req.body;
      console.log(req.body);
      const schema = Joi.object().keys({
        id: Joi.string().required(),
      });
      const result = Joi.validate(payload, schema);

      if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
          errors: [{ code: "VALIDATION_ERROR", message: result.error.message }],
        });
      }

      const deleteRow = await knex("facility_report_master")
        .where("facility_report_master.id", id)
        .del()
        .returning(["*"]);

      let resultData = deleteRow.rows;

      return res.status(200).json({
        data: {
          resultData,
          message: "Deleted row successfully!",
        },
      });
    } catch (err) {
      return res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
      });
    }
  },
  // getFacilityReportDetailById:async(req,res)=>{
  //   console.log("requested id",req)
  //   try{
  //     // let sortPayload = req.body;
  //     let orgId = req.orgId
  //     let id = req.body
  //     let reportResult = await knex("facility_report_master")
  //     .select(["facility_report_master.*"])
  //     .where("facility_report_master.orgId",orgId)
  //     .where("facility_report_master.id",id)

  //     return res.status(200).send({
  //       data: {
  //         facilityReport: reportResult,
  //       },
  //       message: "Facility Report Detail!",
  //     });

  //   }catch(err){
  //     return res.status(500).json({
  //       errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
  //     });
  //   }
  // }
};

module.exports = facilityBookingController;

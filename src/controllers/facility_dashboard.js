const knex = require("../db/knex")
const Moment = require("moment")
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");
const { select } = require("underscore");




const facilityDashboardController = {

    getFacilityBookingsBwDates:async(req,res)=>{
        try{
            let reqData = req.body
            let orgId = req.orgId
            console.log("requested",req.body)
            var getDaysArray = function(start,end){
                let dt = start;
                let arr = [];
                for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
                  arr.push(new Date(dt));
                }
                return arr;
            }

            var dates = getDaysArray(
                new Date(reqData.startDate),
                new Date(reqData.endDate)
              );
             
              console.log("dates",dates)
          
      let final = [];

      for(d of dates){

        let startNewDate = moment(d)
        .startOf("date")
        .format();
      let endNewDate = moment(d)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      [totalFacilityBookings] = await Promise.all([
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
          .where({"entity_bookings.orgId":orgId})
          .whereBetween("entity_bookings.createdAt",[
              currentStartTime,
              currentEndTime
          ])
          .orderBy("entity_bookings.id","asc")
      ])

      final.push({
          date:moment(d).format("L"),
          totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
      })

      }
      res.status(200).json({
          data:{final},
          message:"facility booking records"
      })
        }catch(err){
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
              });
        }
    },
    getTotalFacilityBookings:async(req,res)=>{
        try{

            let reqData = req.body
            let orgId = req.orgId
            console.log("requested",req.body)
            var getDaysArray = function(start,end){
                let dt = start;
                let arr = [];
                for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
                  arr.push(new Date(dt));
                }
                return arr;
            }

            var dates = getDaysArray(
                new Date(reqData.queryStartDate),
                new Date(reqData.queryEndDate)
              );
             
              console.log("dates",dates)
          
      let final = [];

      for(d of dates){

        let startNewDate = moment(d)
        .startOf("date")
        .format();
      let endNewDate = moment(d)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      [totalFacilityBookings] = await Promise.all([
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
          .where({"entity_bookings.orgId":orgId})
          .whereBetween("entity_bookings.createdAt",[
              currentStartTime,
              currentEndTime
          ])
          .orderBy("entity_bookings.id","asc")
      ])

      final.push({
          date:moment(d).format("L"),
          totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
      })

      }
      res.status(200).json({
        data:{final},
        message:"facility booking records"
    })

        }catch(err){
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
              });
        }
    },
    getApprovedFacilityBookings:async(req,res)=>{
        try{

            let reqData = req.body
            let orgId = req.orgId
            console.log("requested",req.body)
            var getDaysArray = function(start,end){
                let dt = start;
                let arr = [];
                for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
                  arr.push(new Date(dt));
                }
                return arr;
            }

            var dates = getDaysArray(
                new Date(reqData.queryStartDate),
                new Date(reqData.queryEndDate)
              );
             
              console.log("dates",dates)
          
      let final = [];

      for(d of dates){

        let startNewDate = moment(d)
        .startOf("date")
        .format();
      let endNewDate = moment(d)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      [totalFacilityBookings] = await Promise.all([
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
          .where({"entity_bookings.orgId":orgId})
          .where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0,"entity_bookings.isBookingCancelled": false})
          .orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":null,"entity_bookings.isBookingCancelled": false})
          .whereBetween("entity_bookings.createdAt",[
              currentStartTime,
              currentEndTime
          ])
          .orderBy("entity_bookings.id","asc")
      ])

      final.push({
          date:moment(d).format("L"),
          totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
      })

      }
      res.status(200).json({
        data:{final},
        message:"facility booking records"
    })

        }catch(err){
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
              });
        }
    },
    getCancelledFacilityBookings:async(req,res)=>{
        try{

            let reqData = req.body
            let orgId = req.orgId
            console.log("requested",req.body)
            var getDaysArray = function(start,end){
                let dt = start;
                let arr = [];
                for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
                  arr.push(new Date(dt));
                }
                return arr;
            }

            var dates = getDaysArray(
                new Date(reqData.queryStartDate),
                new Date(reqData.queryEndDate)
              );
             
              console.log("dates",dates)
          
      let final = [];

      for(d of dates){

        let startNewDate = moment(d)
        .startOf("date")
        .format();
      let endNewDate = moment(d)
        .endOf("date", "day")
        .format();

      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();

      [totalFacilityBookings] = await Promise.all([
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
          .where({"entity_bookings.orgId":orgId})
          .where("entity_bookings.isBookingCancelled", true)
          .whereBetween("entity_bookings.createdAt",[
              currentStartTime,
              currentEndTime
          ])
          .orderBy("entity_bookings.id","asc")
      ])

      final.push({
          date:moment(d).format("L"),
          totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
      })

      }
      res.status(200).json({
        data:{final},
        message:"facility booking records"
    })

        }catch(err){
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
              });
        }
    },
    getFacilityDasboardData:async(req,res) => {
        try{
            let reqData = req.body
            let orgId = req.orgId
            console.log("requested dates",reqData)

            // var getDaysArray = function(start,end){
            //     let dt = start;
            //     let arr = [];
            //     for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
            //       arr.push(new Date(dt));
            //     }
            //     return arr;
            // }

            // var dates = getDaysArray(
            //     new Date(reqData.startDate),
            //     new Date(reqData.endDate)
            //   );
             
            
            let startNewDate = moment(reqData.queryStartDate)
            .startOf("date")
            .format();
          let endNewDate = moment(reqData.queryEndDate)
            .endOf("date", "day")
            .format();

            let currentStartTime = new Date(startNewDate).getTime();
            let currentEndTime = new Date(endNewDate).getTime();
            const [total,approved,cancelled,confirmed,pending] = await Promise.all([
                knex
                .from("entity_bookings")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ]),

                knex
                .from("entity_bookings")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0,"entity_bookings.isBookingCancelled": false})
                .orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":null,"entity_bookings.isBookingCancelled": false})
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ]),

                knex
                .from("entity_bookings")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where("entity_bookings.isBookingCancelled", true)
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ]),

                knex
                .from("entity_bookings")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1})
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ]),

                knex
                .from("entity_bookings")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where({"entity_bookings.isBookingConfirmed":false,"entity_bookings.isBookingCancelled": false})
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ]),


            ])

            let totalBookings = total.length
            let approvedBookings = approved.length
            let cancelledBookings = cancelled.length
            let confirmedBookings = confirmed.length
            let pendingBookings = pending.length

            return res.status(200).json({
                data:{
                    totalBookings,
                    approvedBookings,
                    cancelledBookings,
                    confirmedBookings,
                    pendingBookings,
                    
                }
            })
        }catch(err){
            console.log("[controllers][facility_dashboard][getBookingCount] :  Error", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getPieChartForFacilityBookings:async(req,res)=>{
        try{
            let reqData = req.body
            let orgId = req.orgId
            let startNewDate = moment(reqData.queryStartDate)
            .startOf("date")
            .format();
          let endNewDate = moment(reqData.queryEndDate)
            .endOf("date", "day")
            .format();

            let currentStartTime = new Date(startNewDate).getTime();
            let currentEndTime = new Date(endNewDate).getTime();
           
        const [approved,cancelled,confirmed,pending] = await Promise.all([
           
            knex
            .from("entity_bookings")
            .select("entity_bookings.entityId")
            .where("entity_bookings.orgId",orgId)
            .where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0,"entity_bookings.isBookingCancelled": false})
            .orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":null,"entity_bookings.isBookingCancelled": false})
            .whereBetween("entity_bookings.createdAt",[
                currentStartTime,
                currentEndTime
            ]),

            knex
            .from("entity_bookings")
            .select("entity_bookings.entityId")
            .where("entity_bookings.orgId",orgId)
            .where("entity_bookings.isBookingCancelled", true)
            .whereBetween("entity_bookings.createdAt",[
                currentStartTime,
                currentEndTime
            ]),

            knex
            .from("entity_bookings")
            .select("entity_bookings.entityId")
            .where("entity_bookings.orgId",orgId)
            .where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1})
            .whereBetween("entity_bookings.createdAt",[
                currentStartTime,
                currentEndTime
            ]),

            knex
            .from("entity_bookings")
            .select("entity_bookings.entityId")
            .where("entity_bookings.orgId",orgId)
            .where({"entity_bookings.isBookingConfirmed":false,"entity_bookings.isBookingCancelled": false})
            .whereBetween("entity_bookings.createdAt",[
                currentStartTime,
                currentEndTime
            ]),
        ])
            let approvedBookings = approved.length
            let cancelledBookings = cancelled.length
            let confirmedBookings = confirmed.length
            let pendingBookings = pending.length

          return res.status(200).json({
              data:{
                approvedBookings,
                cancelledBookings,
                confirmedBookings,
                pendingBookings
              }
          })


        }catch(err){
            console.log("[controllers][facility_dashboard][getBookingCount] :  Error", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
};
module.exports = facilityDashboardController;
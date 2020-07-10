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
            let{facilityName,status,queryStartDate,queryEndDate,clickValue}=req.body
            let totalFacilityBookings = null
            console.log("requested",req.body)
            let Status;
      if(status){
        Status = status.join(' ')
      }
            var getDaysArray = function(start,end){
                let dt = start;
                let arr = [];
                for (; dt <= end; dt.setDate(dt.getDate() + 1)) {
                  arr.push(new Date(dt));
                }
                return arr;
            }

            var dates = getDaysArray(
                new Date(queryStartDate),
                new Date(queryEndDate)
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
        let currentDate = new Date().getTime();
      let currentStartTime = new Date(startNewDate).getTime();
      let currentEndTime = new Date(endNewDate).getTime();
        if((facilityName && facilityName.length >= 0) || (status && status.length >= 0)){
            console.log("if selected")
            totalFacilityBookings = await
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
            .where((qb)=>{
                if(facilityName){
                    qb.whereIn("facility_master.name", facilityName)
                }
                if (status) {
                    console.log("Status of status",Status)
                    if (Status == "Pending") {
                      console.log("Pending",status)
                      qb.where("entity_bookings.isBookingConfirmed", false);
                      qb.where("entity_bookings.isBookingCancelled", false);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if (Status == "Approved") {
                      console.log("Approved",status)
                      qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0,"entity_bookings.isBookingCancelled": false});
                      qb.orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":null,"entity_bookings.isBookingCancelled": false});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                      // qb.where("entity_bookings.isBookingCancelled", false);
                    }
                    if (Status == "Confirmed") {
                      console.log("Confirmed",status)
                      qb.where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                      // qb.where("entity_bookings.confirmedType", 1);
                    }
                    if (Status == "Cancelled") {
                      console.log("Cancelled",status)
                      qb.where("entity_bookings.isBookingCancelled", true);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if(Status ==  "Approved Pending Cancelled Confirmed"){
                      // console.log("All status",status)
    
                      qb.where("entity_bookings.isBookingConfirmed", false);
                      qb.orWhere("entity_bookings.isBookingConfirmed", true);
                      qb.orWhere("entity_bookings.confirmedType", 1);
                      qb.where("entity_bookings.isBookingCancelled", true);
                      qb.orWhere("entity_bookings.isBookingCancelled", false);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if(Status ==  "Approved Pending Cancelled Confirmed 0"){
                      console.log("All status 0",status)
    
                      qb.where("entity_bookings.isBookingConfirmed", false);
                      qb.orWhere("entity_bookings.isBookingConfirmed", true);
                      qb.orWhere("entity_bookings.confirmedType", 1);
                      qb.where("entity_bookings.isBookingCancelled", true);
                      qb.orWhere("entity_bookings.isBookingCancelled", false);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if(Status ==="Approved Pending Confirmed"){
                      console.log("Pending, Approved,Confirmed ",status)
                      qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0,"entity_bookings.isBookingCancelled": false});
                      qb.orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":null,"entity_bookings.isBookingCancelled": false});
                      qb.orWhere({"entity_bookings.isBookingConfirmed":false,"entity_bookings.isBookingCancelled":false})
                      qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if(Status === "Approved Cancelled"){
                      // console.log("Approved and cancelled",status)
                      qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0});
                      qb.where({"entity_bookings.isBookingCancelled": true, "entity_bookings.confirmedType":0});
                      qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.confirmedType":0});
                      qb.orWhere({"entity_bookings.isBookingCancelled": true, "entity_bookings.confirmedType":0 });
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    
                    }
                    if(Status==="Approved Confirmed"){
                      // console.log("Approved and confirmed")
                      qb.where("entity_bookings.isBookingConfirmed", true);
                      qb.where("entity_bookings.isBookingCancelled", false);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                      
                    }
                    if(Status === "Approved Pending"){
                      console.log("Pending and approved",Status)
                      qb.where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.isBookingCancelled": false,  "entity_bookings.confirmedType":0});
                      qb.orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.isBookingCancelled": false,  "entity_bookings.confirmedType":null});
                      qb.orWhere({"entity_bookings.isBookingConfirmed": false, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":0});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                      
                      
                    }
                    if(Status === "Pending Confirmed"){
                      // console.log("Pending and Confirmed",status)
                      qb.where({"entity_bookings.isBookingConfirmed" : false, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":0});
                      qb.orWhere({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false, "entity_bookings.confirmedType":1});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
                     
                    }
                    if(Status === "Pending Cancelled"){
                      // console.log("Pending,Cancelled",status)
                      qb.where("entity_bookings.isBookingConfirmed", false);
                      qb.where("entity_bookings.isBookingCancelled", false);
                      qb.orWhere("entity_bookings.isBookingCancelled", true);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
    
                    }
                    if(Status === "Approved Pending Cancelled"){
                      // console.log("Pending,Approved,Cancelled",status)
                      qb.where({"entity_bookings.isBookingConfirmed" : true,  "entity_bookings.confirmedType":0});
                      qb.orWhere({"entity_bookings.isBookingConfirmed": false, "entity_bookings.confirmedType":0});
                      qb.orWhere({"entity_bookings.isBookingConfirmed":true,"entity_bookings.confirmedType":null})
                      qb.orWhere({"entity_bookings.isBookingCancelled": true,  "entity_bookings.confirmedType":0});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                      
                    }
                    if(Status === "Approved Cancelled Confirmed"){
                      // console.log("Approved,Cancelled,Confirmed",status)
                      qb.where("entity_bookings.isBookingConfirmed", true);
                      qb.where("entity_bookings.isBookingCancelled", true);
                      qb.orWhere("entity_bookings.confirmedType", 1);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if(Status === "Pending Cancelled Confirmed"){
                      // console.log("Pending,Cancelled,confirmed",status)
                      qb.where("entity_bookings.isBookingConfirmed", false);
                      qb.where("entity_bookings.isBookingCancelled", false);
                      qb.orWhere("entity_bookings.isBookingCancelled", true);
                      qb.orWhere("entity_bookings.isBookingConfirmed", true);
                      qb.where("entity_bookings.confirmedType", 1);
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
    
                    }
                    if(Status === "Cancelled Confirmed"){
                      // console.log("Cancelled,confirmed",status)
                      qb.where({"entity_bookings.isBookingCancelled" : true});
                      qb.orWhere({"entity_bookings.confirmedType": 1,"entity_bookings.isBookingConfirmed" : true});
                //   qb.whereBetween("entity_bookings.createdAt", [createStartTime, createdEndTime])
                     
                    }
                  }
            })
            .orderBy("entity_bookings.id","asc")

            final.push({
                date:moment(d).format("L"),
                totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
            })
        }else if(clickValue && clickValue === 'hour'){
          console.log("Hour clicked")
          totalFacilityBookings = await
          //    Promise.all([
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
                .where({"entity_bookings.createdAt":currentDate})
                // .whereBetween("entity_bookings.createdAt",[
                //     currentStartTime,
                //     currentEndTime
                // ])
                .orderBy("entity_bookings.id","asc")
          //   ])
      
            final.push({
                // data:totalFacilityBookings,
                date:moment(d).format("L"),
                totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
            })
        }
        else{
            console.log("else selected")
      totalFacilityBookings = await
    //    Promise.all([
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
    //   ])

      final.push({
          date:moment(d).format("L"),
          totalFacilityBookings: _.uniqBy(totalFacilityBookings,"id").length
      })
    }

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
    getConfirmedFacilityBooking:async(req,res)=>{
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
      // .where("entity_bookings.isBookingCancelled", true)
      .where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1})
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
    getPendingFacilityBookings:async(req,res) =>{
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
      // .where("entity_bookings.isBookingCancelled", true)
      // .where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1})
      .where({"entity_bookings.isBookingConfirmed":false,"entity_bookings.isBookingCancelled": false})
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

      }catch(err){}
    },
    getFacilityDasboardData:async(req,res) => {
        try{
            let reqData = req.body
            let orgId = req.orgId
            console.log("requested dates",reqData)

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
                .leftJoin(
                    "facility_master",
                    "entity_bookings.entityId",
                    "facility_master.id"
                  )
                  .leftJoin("users", "entity_bookings.bookedBy", "users.id")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ])
                .orderBy("entity_bookings.id","asc"),

                knex
                .from("entity_bookings")
                .leftJoin(
                    "facility_master",
                    "entity_bookings.entityId",
                    "facility_master.id"
                  )
                  .leftJoin("users", "entity_bookings.bookedBy", "users.id")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":0,"entity_bookings.isBookingCancelled": false})
                .orWhere({"entity_bookings.isBookingConfirmed" : true, "entity_bookings.confirmedType":null,"entity_bookings.isBookingCancelled": false})
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ])
                .orderBy("entity_bookings.id","asc"),

                knex
                .from("entity_bookings")
                .leftJoin(
                    "facility_master",
                    "entity_bookings.entityId",
                    "facility_master.id"
                  )
                  .leftJoin("users", "entity_bookings.bookedBy", "users.id")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where("entity_bookings.isBookingCancelled", true)
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ])
                .orderBy("entity_bookings.id","asc"),

                knex
                .from("entity_bookings")
                .leftJoin(
                    "facility_master",
                    "entity_bookings.entityId",
                    "facility_master.id"
                  )
                  .leftJoin("users", "entity_bookings.bookedBy", "users.id")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where({"entity_bookings.isBookingConfirmed": true, "entity_bookings.isBookingCancelled": false,"entity_bookings.confirmedType":1})
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ])
                .orderBy("entity_bookings.id","asc"),

                knex
                .from("entity_bookings")
                .leftJoin(
                    "facility_master",
                    "entity_bookings.entityId",
                    "facility_master.id"
                  )
                  .leftJoin("users", "entity_bookings.bookedBy", "users.id")
                .select("entity_bookings.entityId")
                .where("entity_bookings.orgId",orgId)
                .where({"entity_bookings.isBookingConfirmed":false,"entity_bookings.isBookingCancelled": false})
                .whereBetween("entity_bookings.createdAt",[
                    currentStartTime,
                    currentEndTime
                ])
                .orderBy("entity_bookings.id","asc"),


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
            let APPROVED = approved.length
            let CANCELLED = cancelled.length
            let CONFIRMED = confirmed.length
            let PENDING = pending.length

          return res.status(200).json({
              data:{
                APPROVED,
                CANCELLED,
                CONFIRMED,
                PENDING
              }
          })


        }catch(err){
            console.log("[controllers][facility_dashboard][getBookingCount] :  Error", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getBookingForAverageDuration:async(req,res)=>{
      try{
        let orgId = req.orgId
        let reqData = req.body

        let startNewDate = moment(reqData.queryStartDate)
            .startOf("date")
            .format();
          let endNewDate = moment(reqData.queryEndDate)
            .endOf("date", "day")
            .format();

            let currentStartTime = new Date(startNewDate).getTime();
            let currentEndTime = new Date(endNewDate).getTime();
           

        let bookingDuration = await knex
        .from("entity_bookings")
        .leftJoin(
          "facility_master",
          "entity_bookings.entityId",
          "facility_master.id"
        )
        .leftJoin("users", "entity_bookings.bookedBy", "users.id")
        .select([
          "entity_bookings.entityId",
          "entity_bookings.bookingStartDateTime",
          "entity_bookings.bookingEndDateTime",
          "entity_bookings.createdAt"
        ])
        .where({"entity_bookings.orgId":orgId})
        .whereBetween("entity_bookings.createdAt",[
          currentStartTime,
          currentEndTime
      ])
      return res.status(200).json({
        data:bookingDuration
      })
      
      }catch(err){
        console.log("[controllers][facility_dashboard][getBookingDuration] :  Error", err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
      }
    }
};
module.exports = facilityDashboardController;
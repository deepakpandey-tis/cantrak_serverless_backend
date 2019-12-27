const Joi = require("@hapi/joi");
const moment = require("moment");
const uuidv4 = require("uuid/v4");
var jwt = require("jsonwebtoken");
const _ = require("lodash");

const knex = require("../../db/knex");

const bcrypt = require("bcrypt");
const saltRounds = 10;
//const trx = knex.transaction();

const customerController = {
  getCustomers: async (req, res) => {
    try {
      let userDetails = null;
      let customerId = req.query.customerId;
      if (customerId) {
        userDetails = await knex("users")
         .leftJoin('user_house_allocation','users.id','user_house_allocation.userId')
         .leftJoin('property_units','user_house_allocation.houseId','property_units.houseId')
         .leftJoin(
          "buildings_and_phases",
          "property_units.buildingPhaseId",
          "buildings_and_phases.id"
        )
        .leftJoin(
          "projects",
          "property_units.projectId",
          "projects.id"
        )
        .leftJoin(
          "companies",
          "property_units.companyId",
          "companies.id"
        )
        .leftJoin(
          "floor_and_zones",
          "property_units.floorZoneId",
          "floor_and_zones.id"
        )
          .select([
            "users.*",
            "buildings_and_phases.buildingPhaseCode",
            "projects.projectName",
            "companies.companyName",
            "floor_and_zones.floorZoneCode",
            "property_units.unitNumber",
            "property_units.houseId as house",
            "user_house_allocation.status"
          ])
          .where({ 'users.id': customerId });
        return res.status(200).json({ userDetails: userDetails });
      }

      let filters = {}
      let {name,email,mobile,company,project,building,floor,houseId} = req.body;
      if(name){
        //filters['users.name'] = name;
      }
      if(email){
          //filters['users.email'] = email
      }
      if(mobile){
          //filters['users.mobileNo'] = mobile;
      }

      if(company){
        filters['property_units.companyId'] = company;
      }
      if(project){
        filters['property_units.projectId'] = project;
      }
      if(building){
        filters['property_units.buildingPhaseId'] = building;
      }
      if(floor){
        filters['property_units.floorZoneId'] = floor;
      }
      if(houseId){
        filters['property_units.houseId'] = houseId;
      }



      let reqData = req.query;

      console.log("Req.orgId: ", req.orgId);

      //console.log("==============", orgId, "=================");

      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      let [total, rows] = await Promise.all([
        knex("users")
          .leftJoin(
            "application_user_roles",
            "users.id",
            "application_user_roles.userId"
          )
          .leftJoin(
            "user_house_allocation",
            "users.id",
            "user_house_allocation.userId"
          )
          .leftJoin(
            "property_units",
            "user_house_allocation.houseId",
            "property_units.houseId"
          )
          .select([
            "users.name as name",
            "users.email as email",
            "users.houseId as houseId",
            "users.id as userId"
          ])
          
          .where({
            "application_user_roles.roleId": 4,
            "users.orgId": req.orgId
          })
          .andWhere(qb => {
            if (Object.keys(filters).length || name ||email || mobile) {

              if(name){
                
                qb.where('users.name','iLIKE',`%${name}%`)
              }

              if(email){
                qb.where('users.email','iLIKE',`%${email}%`)
              }

              if(mobile){
                qb.where('users.mobileNo','iLIKE',`%${mobile}%`)
              }

              qb.where(filters);
            }
          }),
        knex("users")
          .leftJoin(
            "application_user_roles",
            "users.id",
            "application_user_roles.userId"
          )
          .leftJoin(
            "user_house_allocation",
            "users.id",
            "user_house_allocation.userId"
          )
          .leftJoin(
            "property_units",
            "user_house_allocation.houseId",
            "property_units.houseId"
          )
          .select([
            "users.name as name",
            "users.email as email",
            "users.houseId as houseId",
            "users.id as userId"
          ])
          .where({
            "application_user_roles.roleId": 4,
            "users.orgId": req.orgId
          })
          .andWhere(qb => {
            if (Object.keys(filters).length || name ||email || mobile) {

              if(name){
                
                qb.where('users.name','iLIKE',`%${name}%`)
              }

              if(email){
                qb.where('users.email','iLIKE',`%${email}%`)
              }

              if(mobile){
                qb.where('users.mobileNo','iLIKE',`%${mobile}%`)
              }
              qb.where(filters);
            }
          })
          .offset(offset)
          .limit(per_page)
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

      return res.status(200).json({
        data: {
          customers: pagination
        }
      });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  resetPassword: async (req, res) => {
    try {
      return res.status(200).json({ message: "Resetting password" });
    } catch (err) {
      console.log(
        "[controllers][survey Orders][getSurveyOrders] :  Error",
        err
      );
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  disassociateHouse:async(req,res) => {
      try {

       let houseId = req.body.houseId;
       let updatedCustomer;
       let message;
       let checkStatus  = await knex.from('user_house_allocation').where({houseId}).returning(['*'])
       if(checkStatus && checkStatus.length){
 
        if(checkStatus[0].status==="1"){
          updatedCustomer = await knex('user_house_allocation').update({status:0}).where({houseId:houseId}).returning(['*'])
          message = "House Id Disassociate successfully!";
        } else {
          updatedCustomer = await knex('user_house_allocation').update({status:1}).where({houseId:houseId}).returning(['*'])
          message = "House Id Associate successfully!";
        }
        
       }
        return res.status(200).json({data: {
            customer:updatedCustomer,
            message:message
        }})
      } catch(err) {
           console.log(
             "[controllers][survey Orders][getSurveyOrders] :  Error",
             err
           );
           res.status(500).json({
             errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
           });
      }
  }
};

module.exports = customerController
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
          .select("*")
          .where({ id: customerId });
        return res.status(200).json({ userDetails: userDetails[0] });
      }


      let filters = {}
      let {userName,email,mobileNo,project,company,building} = req.body;
      if(userName){
        filters['users.userName'] = userName;
      }
      if(email){
          filters['users.email'] = email
      }
      if(mobileNo){
          filters['users.mobileNo'] = email;
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
            if (Object.keys(filters).length) {
              qb.where(filters);
            }
          }),
        knex("users")
          .leftJoin(
            "application_user_roles",
            "users.id",
            "application_user_roles.userId"
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
            if (Object.keys(filters).length) {
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
        const updatedCustomer = await knex('users').update({houseId:0}).where({id:req.body.customerId}).returning(['name'])
        return res.status(200).json({data: {
            customer:updatedCustomer
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
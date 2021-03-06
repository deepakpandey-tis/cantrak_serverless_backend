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

const roleAccessHelper = {
    getAllUsers : async ({projectId,resourceId}) =>{
        try {
            
            let users = await knex
            .from("users")
            .leftJoin("")

        } catch (err) {
            
        }
    }
    
}



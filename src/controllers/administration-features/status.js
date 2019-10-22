const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');
const XLSX = require('xlsx');

const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
//const trx = knex.transaction();



const statusController = {

    // Add New Status //

    addStatus : async (req,res) => {
        try{
            let serviceStatus = null;
            await knex.transaction(async (trx) => {
                let statusPayload  = req.body;

                const schema = Joi.object().keys({
                    statusCode : Joi.string().required(),
                    descriptionEng : Joi.string().required(),
                    descriptionThai : Joi.string().required(),
                    remark : Joi.string().required(),
                    defaultFlag : Joi.string().required()
                });

                const result = Joi.validate(statusPayload,schema);

                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors : [
                            { code : 'VALIDATON_ERRORS', message : result.error.message }
                        ]
                    });
                }

                const existStatusCode = await knex('service_status').where({ statusCode: statusPayload.statusCode });
              
                console.log('[controllers][status][addstatus]: Status Code', existStatusCode);

                // Return error when username exist

                if (existStatusCode && existStatusCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'STATUS_CODE_EXIST_ERROR', message: 'Status Code already exist !' }
                        ],
                    });
                }  

                // Insert in common area table,
                const currentTime = new Date().getTime();
             
                const insertData = { ...statusPayload, statusCode: statusPayload.statusCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][status][addstatus]: Insert Data', insertData);

                const statusResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('service_status');
                
                sstatus = statusResult[0];
               
                trx.commit;

            });

            res.status(200).json({
                data: {
                    serviceStatus : sstatus
                }
            });

        }catch (err){
            console.log('[controllers][status][addstatus] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    // Update Status //

    updateStatus : async (req, res) => {
        try{
            let updateStatusPayload = null;

            await knex.transaction (async (trx) => {
                let statusPaylaod = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required(),
                    statusCode : Joi.string().required(),
                    descriptionEng : Joi.string().required(),
                    descriptionThai : Joi.string().required(),
                    remark : Joi.string().required(),
                    defaultFlag : Joi.string().required()
                });

                const result = Joi.validate(statusPaylaod,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const existStatusCode = await knex('service_status').where({ statusCode: statusPaylaod.statusCode.toUpperCase()}).whereNot({ id: statusPaylaod.id });
              
                console.log('[controllers][status][updateStatus]: Status Code', existStatusCode);

                // Return error when username exist

                if (existStatusCode && existStatusCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'COMMON_AREA_CODE_EXIST_ERROR', message: 'Status Code already exist !' }
                        ],
                    });
                }  
                
                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateStatusResult = await knex.update({
                     statusCode : statusPaylaod.statusCode.toUpperCase(),
                     descriptionEng : statusPaylaod.descriptionEng,
                     descriptionThai : statusPaylaod.descriptionThai,
                     remark : statusPaylaod.remark,
                     defaultFlag : statusPaylaod.defaultFlag,
                     updatedAt : currentTime 
                    }).where({ 
                        id: statusPaylaod.id 
                    }).returning(['*']).transacting(trx).into('service_status');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][status][updateStatus]: Update Data', updateStatusResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                updateStatusPayload = updateStatusResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    commonArea: updateStatusPayload
                },
                message: "Status updated successfully !"
            });

        }catch (err){
            console.log('[controllers][status][updateStatus] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    // Get List of Common Area

    getStatusList : async (req,res) => {

        try {
            let reqData = req.query;
            let total = null;
            let rows = null;
            let companyId = reqData.companyId;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

          
            [total, rows] = await Promise.all([
                knex.count('* as count').from("service_status").first(),
                knex.select("*").from("service_status").offset(offset).limit(per_page)
            ])
            

            let count = total.count;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            pagination.data = rows; 
        
            res.status(200).json({
                data: {
                    commonAreaLists: pagination
                },
                message: "Status list successfully !"
            });

        } catch (err) {
            console.log('[controllers][status][getstatus] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

     // Delete Common Area //

     deleteStatus : async (req, res) => {
        try{
            let delCommonPayload = null;

            await knex.transaction (async (trx) => {
                let statusPaylaod = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required()
                });

                const result = Joi.validate(statusPaylaod,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const validStatusId = await knex('service_status').where({ id: statusPaylaod.id });
              
                console.log('[controllers][status][deletestatus]: Status Code', validStatusId);

                // Return error when username exist

                if (validStatusId && validStatusId.length) {
                    // Insert in users table,
                    const currentTime = new Date().getTime();
                    //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                    //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                    const updateDataResult = await knex.update({
                        isActive : 'false',
                        updatedAt : currentTime 
                        }).where({ 
                            id: statusPaylaod.id 
                        }).returning(['*']).transacting(trx).into('service_status');
                    
                    console.log('[controllers][status][deletestatus]: Delete Data', updateDataResult);

                    //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                    
                    updateStatusPayload = updateDataResult[0];
                
                }else{
                    return res.status(400).json({
                        errors: [
                            { code: 'STATUS_ID_DOES_NOT_EXIST_ERROR', message: 'Id does not exist!!' }
                        ],
                    });
                }                  
              
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    status: updateStatusPayload
                },
                message: "Status deleted successfully !"
            });

        }catch (err){
            console.log('[controllers][commonArea][updatecommonArea] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
        // Export Status Data
    },exportStatus:async (req,res)=>{
        try {
            let reqData = req.query;
            let total = null;
            let rows = null;
            let companyId = reqData.companyId;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

          
            [total, rows] = await Promise.all([
                knex.count('* as count').from("service_status").first(),
                knex.select("*").from("service_status").offset(offset).limit(per_page)
            ])
            
            var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
            let filename = "uploads/StatusData-"+Date.now()+".csv";
            let  check = XLSX.writeFile(wb,filename);
        
            res.status(200).json({
                data: rows,
                message: "Status Data Export Successfully !"
            });

        } catch (err) {
            console.log('[controllers][status][getstatus] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
   
};


module.exports = statusController;
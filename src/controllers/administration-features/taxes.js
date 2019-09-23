const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();



const taxesfactionController = {

    // Add New Taxes //

    addTaxes : async (req,res) => {
        try{
            let taxes = null;
            await knex.transaction(async (trx) => {
                let taxesPayload  = req.body;

                const schema = Joi.object().keys({
                    taxCode : Joi.string().required(),
                    taxName : Joi.string().required(),
                    descriptionEng : Joi.string().required(),
                    descriptionThai : Joi.string().required(),
                    taxPercentage : Joi.string().required()
                });

                const result = Joi.validate(taxesPayload,schema);

                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors : [
                            { code : 'VALIDATON_ERRORS', message : result.error.message }
                        ]
                    });
                }

                const existTaxCode = await knex('taxes').where({ taxCode: taxesPayload.taxCode });
              
                console.log('[controllers][tax][addtax]: Tax Code', existTaxCode);

                // Return error when satisfaction code exist

                if (existTaxCode && existTaxCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TAX_CODE_EXIST_ERROR', message: 'Tax Code already exist !' }
                        ],
                    });
                }  

                // Insert in satisfaction table,
                const currentTime = new Date().getTime();
             
                const insertData = { ...taxesPayload, taxCode: taxesPayload.taxCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][tax][addtax]: Insert Data', insertData);

                const taxResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('taxes');
                
                taxData = taxResult[0];
               
                trx.commit;

            });

            res.status(200).json({
                data: {
                    tax : taxData
                }
            });

        }catch (err){
            console.log('[controllers][tax][addtax] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    // Update Taxes //

    updateTaxes : async (req, res) => {
        try{
            let updateTaxesPayload = null;

            await knex.transaction (async (trx) => {
                let taxesPaylode = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required(),
                    taxCode : Joi.string().required(),
                    taxName : Joi.string().required(),
                    descriptionEng : Joi.string().required(),
                    descriptionThai : Joi.string().required(),
                    taxPercentage : Joi.string().required()
                });

                const result = Joi.validate(taxesPaylode,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).jtaxson({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const existTaxesCode = await knex('taxes').where({ taxCode: taxesPaylode.taxCode.toUpperCase()}).whereNot({ id: taxesPaylode.id });
              
                console.log('[controllers][tax][updateTax]: Tax Code', existTaxesCode);

                // Return error when satisfaction exist

                if (existTaxesCode && existTaxesCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TAX_CODE_EXIST_ERROR', message: 'Tax Code already exist !' }
                        ],
                    });
                }  
                
                // Insert in satisfaction table,
                const currentTime = new Date().getTime();
                
                const updateTaxResult = await knex.update({
                     taxCode : taxesPaylode.taxCode.toUpperCase(),
                     taxName : taxesPaylode.taxName,
                     descriptionEng : taxesPaylode.descriptionEng,
                     descriptionThai : taxesPaylode.descriptionThai,
                     taxPercentage : taxesPaylode.taxPercentage,
                     updatedAt : currentTime 
                    }).where({ 
                        id: taxesPaylode.id 
                    }).returning(['*']).transacting(trx).into('taxes');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][tax][updateTax]: Update Taxes', updateTaxResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                updateTaxPayload = updateTaxResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    tax : updateTaxPayload
                },
                message: "Tax updated successfully !"
            });

        }catch (err){
            console.log('[controllers][tax][updateTax] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    // Get List of Taxes

    getTaxesList : async (req,res) => {
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
                knex.count('* as count').from("taxes").first(),
                knex.select("*").from("taxes").offset(offset).limit(per_page)
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
                message: "Tax list successfully !"
            });

        } catch (err) {
            console.log('[controllers][tax][gettax] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

     // Delete Tax //

     deleteTaxes : async (req, res) => {
        try{
            let delTaxPayload = null;

            await knex.transaction (async (trx) => {
                let taxPaylaod = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required()
                });

                const result = Joi.validate(taxPaylaod,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const validTaxesId = await knex('taxes').where({ id: taxPaylaod.id });
              
                console.log('[controllers][tax][deletetax]: Taxes Code', validTaxesId);

                // Return error when username exist

                if (validTaxesId && validTaxesId.length) {
                    // Insert in users table,
                    const currentTime = new Date().getTime();
                    //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                    //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                    const updateDataResult = await knex.update({
                        isActive : 'false',
                        updatedAt : currentTime 
                        }).where({ 
                            id: taxPaylaod.id 
                        }).returning(['*']).transacting(trx).into('taxes');
                    
                    console.log('[controllers][tax][deletetax]: Delete Data', updateDataResult);

                    //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                    
                    updateTaxPayload = updateDataResult[0];
                
                }else{
                    return res.status(400).json({
                        errors: [
                            { code: 'TAXES_DOES_NOT_EXIST_ERROR', message: 'Id does not exist!!' }
                        ],
                    });
                }                  
              
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    taxes: updateTaxPayload
                },
                message: "Taxes deleted successfully !"
            });

        }catch (err){
            console.log('[controllers][tax][deletetax] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }    
   
};


module.exports = taxesfactionController;
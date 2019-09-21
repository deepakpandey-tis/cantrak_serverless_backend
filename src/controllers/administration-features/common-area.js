const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();



const commonAreaController = {

    // Add New Common Area //

    addCommonArea : async (req,res) => {
        try{
            let commonArea = null;
            await knex.transaction(async (trx) => {
                let commonPayload  = req.body;

                const schema = Joi.object().keys({
                     companyId : Joi.number().required(),
                     projectId : Joi.number().required(),
                     propertyTypeId : Joi.number().required(),
                     buildingPhaseId : Joi.number().required(),
                     floorZoneId : Joi.number().required(),
                     commonAreaCode : Joi.string().required(),
                     description : Joi.string().required()
                });

                const result = Joi.validate(commonPayload,schema);

                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors : [
                            { code : 'VALIDATON_ERRORS', message : result.error.message }
                        ]
                    });
                }

                const existCommonAreaCode = await knex('common_area').where({ commonAreaCode: commonPayload.commonAreaCode });
              
                console.log('[controllers][commonArea][addcommonArea]: Common Are Code', existCommonAreaCode);

                // Return error when username exist

                if (existCommonAreaCode && existCommonAreaCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'COMMON_AREA_CODE_EXIST_ERROR', message: 'Common Area Code already exist !' }
                        ],
                    });
                }  

                // Insert in common area table,
                const currentTime = new Date().getTime();
             
                const insertData = { ...commonPayload, commonAreaCode: commonPayload.commonAreaCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime, createdBy: 1 };

                console.log('[controllers][commonArea][addcommonArea]: Insert Data', insertData);

                const commonAreaResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('common_area');
                
                commonArea = commonAreaResult[0];
               
                trx.commit;

            });

            res.status(200).json({
                data: {
                    commonAreaRes : commonArea
                }
            });

        }catch (err){
            console.log('[controllers][generalsetup][addservice] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    // Update Common Area //

    updateCommonArea : async (req, res) => {
        try{
            let updateComPayload = null;

            await knex.transaction (async (trx) => {
                let commonUpdatePaylaod = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required(),
                    companyId : Joi.number().required(),
                    projectId : Joi.number().required(),
                    propertyTypeId : Joi.number().required(),
                    buildingPhaseId : Joi.number().required(),
                    floorZoneId : Joi.number().required(),
                    commonAreaCode : Joi.string().required(),
                    description : Joi.string().required()
                });

                const result = Joi.validate(commonUpdatePaylaod,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const existCommonAreaCode = await knex('common_area').where({ commonAreaCode: commonUpdatePaylaod.commonAreaCode.toUpperCase()}).whereNot({ id: commonUpdatePaylaod.id });
              
                console.log('[controllers][commonArea][addcommonArea]: Common Are Code', existCommonAreaCode);

                // Return error when username exist

                if (existCommonAreaCode && existCommonAreaCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'COMMON_AREA_CODE_EXIST_ERROR', message: 'Common Area Code already exist !' }
                        ],
                    });
                }  
                
                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({
                     commonAreaCode : commonUpdatePaylaod.commonAreaCode.toUpperCase(),
                     companyId : commonUpdatePaylaod.companyId,
                     projectId : commonUpdatePaylaod.projectId,
                     propertyTypeId : commonUpdatePaylaod.propertyTypeId,
                     buildingPhaseId : commonUpdatePaylaod.buildingPhaseId,
                     floorZoneId : commonUpdatePaylaod.floorZoneId,
                     description : commonUpdatePaylaod.description,
                     updatedAt : currentTime 
                    }).where({ 
                        id: commonUpdatePaylaod.id 
                    }).returning(['*']).transacting(trx).into('common_area');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][commonArea][updatecommonArea]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                updateComPayload = updateDataResult[0];
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    commonArea: updateComPayload
                },
                message: "Common Area updated successfully !"
            });

        }catch (err){
            console.log('[controllers][commonArea][updatecommonArea] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    // Get List of Common Area

    getCommonAreaList : async (req,res) => {
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

            if(companyId){
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("common_area").first(),
                    knex.select("*").from("common_area").offset(offset).limit(per_page).where({companyId: companyId})
                ])
            }else{
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("common_area").first(),
                    knex.select("*").from("common_area").offset(offset).limit(per_page)
                ])
            }

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
                message: "Common Area list successfully !"
            });

        } catch (err) {
            console.log('[controllers][commonArea][getcommonArea] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

     // Delete Common Area //

    deleteCommonArea : async (req, res) => {
        try{
            let delCommonPayload = null;

            await knex.transaction (async (trx) => {
                let delcommonAreaPaylaod = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required()
                });

                const result = Joi.validate(delcommonAreaPaylaod,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const validCommonAreaId = await knex('common_area').where({ id: delcommonAreaPaylaod.id });
              
                console.log('[controllers][commonArea][deletecommonArea]: Common Area Code', validCommonAreaId);

                // Return error when username exist

                if (validCommonAreaId && validCommonAreaId.length) {
                    // Insert in users table,
                    const currentTime = new Date().getTime();
                    //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                    //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                    const updateDataResult = await knex.update({
                        isActive : 'false',
                        updatedAt : currentTime 
                        }).where({ 
                            id: delcommonAreaPaylaod.id 
                        }).returning(['*']).transacting(trx).into('common_area');
                    
                    console.log('[controllers][commonArea][delcommonArea]: Delete Data', updateDataResult);

                    //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                    
                    updateComPayload = updateDataResult[0];
                
                }else{
                    return res.status(400).json({
                        errors: [
                            { code: 'COMMON_AREA_ID_DOES_NOT_EXIST_ERROR', message: 'Id does not exist!!' }
                        ],
                    });
                }                  
              
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    commonArea: updateComPayload
                },
                message: "Common Area deleted successfully !"
            });

        }catch (err){
            console.log('[controllers][commonArea][updatecommonArea] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    
    // Details View Common Area //

    getdetailsCommonArea : async (req, res) => {
        try{
            let viewCommonPayload = null;

            await knex.transaction (async (trx) => {
                let viewcommonAreaPayload = req.body;

                const schema = Joi.object().keys({
                    id : Joi.number().required()
                });

                const result = Joi.validate(viewcommonAreaPayload,schema);
                if(result && result.hasOwnProperty('error') && result.error){
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

              
                const validCommonAreaId = await knex('common_area').where({ id: viewcommonAreaPayload.id });
              
                console.log('[controllers][commonArea][viewcommonArea]: Common Area Code', validCommonAreaId);

                // Return error when username exist

                if (validCommonAreaId && validCommonAreaId.length) {
                   
                   DataResult = await knex('common_area').leftJoin('companies', 'common_area.companyId', '=', 'companies.id').leftJoin('projects', 'common_area.projectId', '=', 'projects.id').leftJoin('property_types', 'common_area.propertyTypeId', '=', 'property_types.id').leftJoin('buildings_and_phases', 'common_area.buildingPhaseId', '=', 'buildings_and_phases.id').leftJoin('floor_and_zones', 'common_area.floorZoneId', '=', 'floor_and_zones.id').select('companies.companyName', 'projects.projectName', 'property_types.propertyType', 'buildings_and_phases.buildingPhaseCode', 'floor_and_zones.floorZoneCode', 'common_area.*').where({ 'common_area.id': viewcommonAreaPayload.id });

                    console.log('[controllers][commonArea][commonareadetails]: View Data', DataResult);

                    //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                    DataResult = _.omit(DataResult[0], ['id'], ['companyId'], ['projectId'], ['propertyTypeId'], ['buildingPhaseId'], ['floorZoneId']);

                    generalDetails = DataResult;
                
                }else{
                    return res.status(400).json({
                        errors: [
                            { code: 'COMMON_AREA_ID_DOES_NOT_EXIST_ERROR', message: 'Id does not exist!' }
                        ],
                    });
                }                  
              
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    commonArea: generalDetails
                },
                message: "Common Area view details !"
            });

        }catch (err){
            console.log('[controllers][commonArea][updatecommonArea] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    }
};


module.exports = commonAreaController;
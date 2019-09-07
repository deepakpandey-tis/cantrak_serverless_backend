const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');

const knex = require('../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();


const serviceDetailsController = {

    getGeneralDetails: async (req, res) => {

        try {

            let generalDetails = null;
            let DataResult = null;
            
            await knex.transaction(async (trx) => {                        

                // Insert in users table,
                const incidentTypePayload = req.body;

                DataResult = await knex('property_units').join('companies','property_units.companyId', '=','companies.id').join('projects','property_units.projectId', '=','projects.id').join('property_types','property_units.propertyTypeId', '=','property_types.id').join('buildings_and_phases','property_units.buildingPhaseId', '=','buildings_and_phases.id').join('floor_and_zones','property_units.floorZoneId', '=','floor_and_zones.id').select('companies.companyName','projects.projectName','property_types.propertyType','buildings_and_phases.buildingPhaseCode','floor_and_zones.floorZoneCode','property_units.*').where({ 'property_units.houseId' : incidentTypePayload.houseId });
                            
                console.log('[controllers][servicedetails][generaldetails]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                DataResult = _.omit(DataResult[0], ['companyId'],['projectId'],['propertyTypeId'],['buildingPhaseId'],['floorZoneId']);

                generalDetails = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    generalDetails: generalDetails
                },
                message: "General details list successfully !"
            });


        } catch (err) {
            console.log('[controllers][entrance][signup] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getLocationTags: async (req, res) => {

        try {

            let locationTags = null;
            
            await knex.transaction(async (trx) => {                        

                // Get Location Tag List,               
                const DataResult = await knex('location_tags_master').where({ isActive: 'true' });
               
                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][servicedetails][locationtags]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                locationTags = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    locationTags: locationTags
                },
                message: "Location Tags list successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceType: async (req, res) => {

        try {

            let sourceRequest = null;
            
            await knex.transaction(async (trx) => {                        

                // Get Location Tag List,               
                const DataResult = await knex('source_of_request').where({ isActive: 'true' });
               
                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][servicedetails][sourcerequest]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                sourceRequest = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    sourceRequest: sourceRequest
                },
                message: "Source Of Request list successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getPriorityList: async (req, res) => {

        try {

            let priorityList = null;
            
            await knex.transaction(async (trx) => {                        

                // Get Location Tag List,               
                const DataResult = await knex('incident_priority').where({ isActive: 'true' });
               
                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][servicedetails][priority]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                priorityList = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    priorityList: priorityList
                },
                message: "Priority list successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][signup] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getServiceRequestList: async (req, res) => {

        try {

            let serviceRequestList = null;
            
            await knex.transaction(async (trx) => {                        

                // Get Location Tag List,               
                const DataResult = await knex('service_requests').where({ isActive: 'true', moderationStatus: 'true' });
               
                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

               // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][servicedetails][serviceRequestList]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                serviceRequestList = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    serviceRequestList: serviceRequestList
                },
                message: "Service Request List Successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][serviceRequestList] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    viewServiceRequestDetails: async (req, res) => {

        try {

            let serviceRequestList = null;
            
            await knex.transaction(async (trx) => {                        
                const viewRequestPayload = req.body;
                console.log('[controllers][servicedetails][viewrequest]', viewRequestPayload);

                // Get Location Tag List,               
                const DataResult = await knex('service_requests').where({ id: viewRequestPayload.serviceRequestId, isActive: 'true', moderationStatus: 'true' });
                                
                console.log('[controllers][servicedetails][serviceRequestList]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');
                
                serviceRequestList = DataResult;
               
                trx.commit;
            });
        
            res.status(200).json({
                data: {
                    serviceRequestList: serviceRequestList
                },
                message: "Service Request List Successfully !"
            });


        } catch (err) {
            console.log('[controllers][servicedetails][serviceRequestList] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
};

module.exports = serviceDetailsController;
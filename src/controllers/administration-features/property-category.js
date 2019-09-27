const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');


const knex = require('../../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();



const propertyCategoryController = {

    addCategory: async (req, res) => {

        try {

            let incident = null;

            await knex.transaction(async (trx) => {

                const categoryPayload = req.body;

                console.log('[controllers][category][add]', categoryPayload);

                // validate keys
                const schema = Joi.object().keys({
                    categoryCode: Joi.string().required(),
                    descriptionEng: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    remark: Joi.string().required()
                });


                const result = Joi.validate(categoryPayload, schema);
                console.log('[controllers][category][add]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existCategoryCode = await knex('incident_categories').where({ categoryCode: categoryPayload.categoryCode });

                console.log('[controllers][category][add]: CategoryCode', existCategoryCode);

                // Return error when username exist

                if (existCategoryCode && existCategoryCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Category Code already exist !' }
                        ],
                    });
                }

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                const insertData = { ...categoryPayload, categoryCode: categoryPayload.categoryCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][category][add]: Insert Data', insertData);

                const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_categories');

                incident = incidentResult[0];

                trx.commit;
            });

            res.status(200).json({
                data: {
                    category: incident
                },
                message: "Category added successfully !"
            });


        } catch (err) {
            console.log('[controllers][category][categoryAdd] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    updateCategory: async (req, res) => {

        try {

            let incident = null;

            await knex.transaction(async (trx) => {

                const categoryTypePayload = req.body;

                console.log('[controllers][Category][categoryType]', categoryTypePayload);

                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required(),
                    categoryCode: Joi.string().required(),
                    descriptionEng: Joi.string().required(),
                    descriptionThai: Joi.string().required(),
                    remark: Joi.string().required()
                });


                const result = Joi.validate(categoryTypePayload, schema);
                console.log('[controllers][Category][categoryType]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const existCateoryTypeCode = await knex('incident_categories').where({ categoryCode: categoryTypePayload.categoryCode });

                console.log('[controllers][Category][categoryType]: CategoryTypeCode', existCateoryTypeCode);

                // Return error when username exist

                if (existCateoryTypeCode && existCateoryTypeCode.length) {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Category Code already exist !' }
                        ],
                    });
                }

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({ categoryCode: categoryTypePayload.categoryCode.toUpperCase(), descriptionEng: categoryTypePayload.descriptionEng, descriptionThai: categoryTypePayload.descriptionThai, updatedAt: currentTime }).where({ id: categoryTypePayload.id }).returning(['*']).transacting(trx).into('incident_categories');

                // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][Category][incidentType]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                incident = updateDataResult[0];

                trx.commit;
            });

            res.status(200).json({
                data: {
                    category: incident
                },
                message: "Category updated successfully !"
            });


        } catch (err) {
            console.log('[controllers][category][categoryUpdate] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    deleteCategory: async (req, res) => {

        try {

            let incident = null;

            await knex.transaction(async (trx) => {

                const categoryDelPayload = req.body;

                console.log('[controllers][category][categoryDelete]', categoryDelPayload);

                // validate keys
                const schema = Joi.object().keys({
                    id: Joi.number().required()
                });

                const result = Joi.validate(categoryDelPayload, schema);
                console.log('[controllers][category][categoryDelete]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Check typeCode already exists 
                const notexistCategoryCode = await knex('incident_categories').where({ id: categoryDelPayload.id });

                console.log('[controllers][category][categoryDelete]: CategoryId', notexistCategoryCode);

                // Return error when username exist

                if (notexistCategoryCode == "") {
                    return res.status(400).json({
                        errors: [
                            { code: 'TYPE_CODE_EXIST_ERROR', message: 'Category does not exist !' }
                        ],
                    });
                }

                // Insert in users table,
                const currentTime = new Date().getTime();
                //console.log('[controllers][entrance][signup]: Expiry Time', tokenExpiryTime);

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                const updateDataResult = await knex.update({ isActive: 'false', updatedAt: currentTime }).where({ id: categoryDelPayload.id }).returning(['*']).transacting(trx).into('incident_categories');

                // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][category][categoryDelete]: Update Data', updateDataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                incident = updateDataResult[0];

                trx.commit;
            });

            res.status(200).json({
                data: {
                    category: incident
                },
                message: "Category deleted successfully !"
            });


        } catch (err) {
            console.log('[controllers][category][categoryDelete] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

    categoryList: async (req, res) => {

        try {

            let listCategories = null;

            await knex.transaction(async (trx) => {

                // Insert in users table,

                const DataResult = await knex('incident_categories').where({ isActive: 'true' });

                //const updateDataResult = await knex.table('incident_type').where({ id: incidentTypePayload.id }).update({ ...incidentTypePayload }).transacting(trx);
                //const updateDataResult = await knex.update({ isActive : 'false', updatedAt : currentTime }).where({ id: incidentTypePayload.id }).returning(['*']).transacting(trx).into('incident_type');

                // const updateData = { ...incidentTypePayload, typeCode: incidentTypePayload.typeCode.toUpperCase(), isActive: 'true', createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][category][categoryDelete]: View Data', DataResult);

                //const incidentResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('incident_type');

                listCategories = DataResult;

                trx.commit;
            });

            res.status(200).json({
                data: {
                    categories: listCategories
                },
                message: "Categories list successfully !"
            });

        } catch (err) {
            console.log('[controllers][category][categoryList] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },

};

module.exports = propertyCategoryController;
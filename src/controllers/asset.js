const Joi = require('@hapi/joi');
const moment = require('moment');
const uuidv4 = require('uuid/v4');
var jwt = require('jsonwebtoken');
const _ = require('lodash');

const knex = require('../db/knex');

const bcrypt = require('bcrypt');
const saltRounds = 10;
const trx = knex.transaction();
const assetController = {
    addAsset: async (req,res) => {
        try {

            let asset = null;
            let attribs = []

            await knex.transaction(async (trx) => {
                let assetPayload = req.body;
                console.log('[controllers][asset][payload]', assetPayload);
                assetPayload = _.omit(assetPayload, ['additionalAttributes','multiple'])
                // validate keys
                const schema = Joi.object().keys({
                        parentAssetId:Joi.string().allow('').optional(),
                        subAssetId:Joi.string().allow('').optional(), 
                        partId:Joi.string().allow('').optional(),
                        assetName:Joi.string().required(),
                        model:Joi.string().required(),
                        barcode:Joi.string().required(),
                        areaName:Joi.string().required(),
                        description:Joi.string().required(),
                        assetCategory:Joi.string().required(),
                        price:Joi.string().required(),
                        installationDate:Joi.string().required(),
                        warrentyExpiration:Joi.string().required(),
                        locationId:Joi.string().allow('').optional(),
                        assignedUsers:Joi.string().allow('').optional(),
                        assignedTeams:Joi.string().required(),
                        assignedVendors:Joi.string().required(),
                        additionalInformation:Joi.string().required()
                });

                let result = Joi.validate(assetPayload, schema);
                console.log('[controllers][asset][addAsset]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in asset_master table,
                let currentTime = new Date().getTime();

                let insertData = { ...assetPayload, createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][asset][addAsset]: Insert Data', insertData);
                let multiple = Number(req.body.multiple);
                let data = Array(multiple).fill(insertData)
                let assetResult = await knex.insert(data).returning(['*']).transacting(trx).into('asset_master');
                
                asset = assetResult

                let additionalAttributes = req.body.additionalAttributes;
                if (additionalAttributes.length > 0) {
                    for (asset of assetResult) {
                        for(attribute of additionalAttributes) {
                            let finalAttribute = {...attribute,assetId:asset.id, createdAt: currentTime, updatedAt: currentTime}
                            let d = await knex.insert(finalAttribute).returning(['*']).transacting(trx).into('asset_attributes');
                            attribs.push(d[0])
                        }   
                    }
                }
                trx.commit;

            });

            attribs = _.uniqBy(attribs,'attributeName')

            res.status(200).json({
                data: {
                    asset: { ...asset, attributes: attribs }
                },
                message: "Asset added successfully !"
            });

        } catch (err) {
            console.log('[controllers][asset][addAsset] :  Error', err);
            trx.rollback;
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getAssetList: async (req,res) => {
        try {

            let assetData = null;
            assetData = await knex.select().from('asset_master')
            
            console.log('[controllers][asset][getAssetList]: Asset List', assetData);
            
            //assetData = partData.map(d => _.omit(d, ['partId'], ['createdAt'], ['updatedAt'], ['isActive']));
            
            res.status(200).json({
                data: assetData,
                message: "Asset List"
            });


        } catch (err) {
            console.log('[controllers][parts][getParts] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getAssetDetails: async (req,res) => {
        try {

            let assetData = null;
            let additionalAttributes = null;
            let id = req.body.id;

            assetData = await knex('asset_master').where({id}).select()
            let assetDataResult = assetData[0];
            let omitedAssetDataResult = _.omit(assetDataResult, ['createdAt'],['updatedAt'], ['isActive'])
            additionalAttributes = await knex('asset_attributes').where({assetId:id}).select()


            console.log('[controllers][asset][getAssetDetails]: Asset Details', assetData);

            res.status(200).json({
                data: {asset:{...omitedAssetDataResult,additionalAttributes}},
                message: "Asset Details"
            });


        } catch (err) {
            console.log('[controllers][asset][getAssetDetails] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updateAssetDetails: async (req,res) => {
       
    }
}

module.exports = assetController;
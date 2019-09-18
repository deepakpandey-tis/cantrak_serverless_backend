const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');

const trx = knex.transaction();
const assetController = {
    addAsset: async (req, res) => {
        try {

            let asset = null;
            let attribs = []
            let images = []
            let files = []

            await knex.transaction(async (trx) => {
                let assetPayload = req.body;
                console.log('[controllers][asset][payload]: Asset Payload', assetPayload);
                assetPayload = _.omit(assetPayload, ['additionalAttributes', 'multiple', 'images', 'files'])
                // validate keys
                const schema = Joi.object().keys({
                    parentAssetId: Joi.string().allow('').optional(),
                    subAssetId: Joi.string().allow('').optional(),
                    partId: Joi.string().allow('').optional(),
                    assetName: Joi.string().required(),
                    model: Joi.string().required(),
                    barcode: Joi.string().required(),
                    areaName: Joi.string().required(),
                    description: Joi.string().required(),
                    assetCategory: Joi.string().required(),
                    price: Joi.string().required(),
                    installationDate: Joi.string().required(),
                    warrentyExpiration: Joi.string().required(),
                    locationId: Joi.string().allow('').optional(),
                    assignedUsers: Joi.string().allow('').optional(),
                    assignedTeams: Joi.string().required(),
                    assignedVendors: Joi.string().required(),
                    additionalInformation: Joi.string().required()
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
                let multiple = 1;
                if (req.body.multiple) {
                    multiple = Number(req.body.multiple);
                }
                let data = Array(multiple).fill(insertData)
                let assetResult = await knex.insert(data).returning(['*']).transacting(trx).into('asset_master');

                asset = assetResult

                let additionalAttributes = req.body.additionalAttributes;
                if (additionalAttributes && additionalAttributes.length > 0) {
                    for (asset of assetResult) {
                        for (attribute of additionalAttributes) {
                            let finalAttribute = { ...attribute, assetId: asset.id, createdAt: currentTime, updatedAt: currentTime }
                            let d = await knex.insert(finalAttribute).returning(['*']).transacting(trx).into('asset_attributes');
                            attribs.push(d[0])
                        }
                    }
                }

                // Insert images in images table
                let imagesData = req.body.images;
                if (imagesData && imagesData.length > 0) {
                    for (asset of assetResult) {
                        for (image of imagesData) {
                            let d = await knex.insert({ entityId: asset.id, ...image, entityType: 'asset_master', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('images');
                            images.push(d[0])
                        }
                    }
                }

                // Insert files in files table
                let filesData = req.body.files;
                if (filesData && filesData.length > 0) {
                    for (asset of assetResult) {
                        for (file of filesData) {
                            let d = await knex.insert({ entityId: asset.id, ...file, entityType: 'asset_master', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('files');
                            files.push(d[0])
                        }
                    }
                }

                trx.commit;

            });

            attribs = _.uniqBy(attribs, 'attributeName')

            res.status(200).json({
                data: {
                    asset: { ...asset, attributes: attribs, images, files }
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
    getAssetList: async (req, res) => {
        try {

            let assetData = null;
            assetData = await knex.select().from('asset_master')

            console.log('[controllers][asset][getAssetList]: Asset List', assetData);

            assetData = assetData.map(d => _.omit(d, ['createdAt'], ['updatedAt'], ['isActive']));

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
    getAssetDetails: async (req, res) => {
        try {

            let assetData = null;
            let additionalAttributes = null;
            let files = null;
            let images = null
            let id = req.body.id;

            assetData = await knex('asset_master').where({ id }).select()
            let assetDataResult = assetData[0];
            let omitedAssetDataResult = _.omit(assetDataResult, ['createdAt'], ['updatedAt'], ['isActive'])
            additionalAttributes = await knex('asset_attributes').where({ assetId: id }).select()


            files = await knex('files').where({ entityId: id, entityType: 'asset_master' }).select();
            images = await knex('images').where({ entityId: id, entityType: 'asset_master' }).select()

            console.log('[controllers][asset][getAssetDetails]: Asset Details', assetData);

            res.status(200).json({
                data: { asset: { ...omitedAssetDataResult, additionalAttributes, files, images } },
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
    updateAssetDetails: async (req, res) => {
        try {

            let asset = null;
            let attribs = []

            await knex.transaction(async (trx) => {
                let assetPayload = req.body;
                let id = req.body.id
                console.log('[controllers][asset][payload]: Update Asset Payload', assetPayload);
                assetPayload = _.omit(assetPayload, ['additionalAttributes'], ['id'])
                // validate keys
                const schema = Joi.object().keys({
                    parentAssetId: Joi.string().allow('').optional(),
                    subAssetId: Joi.string().allow('').optional(),
                    partId: Joi.string().allow('').optional(),
                    assetName: Joi.string().required(),
                    model: Joi.string().required(),
                    barcode: Joi.string().required(),
                    areaName: Joi.string().required(),
                    description: Joi.string().required(),
                    assetCategory: Joi.string().required(),
                    price: Joi.string().required(),
                    installationDate: Joi.string().required(),
                    warrentyExpiration: Joi.string().required(),
                    locationId: Joi.string().allow('').optional(),
                    assignedUsers: Joi.string().allow('').optional(),
                    assignedTeams: Joi.string().required(),
                    assignedVendors: Joi.string().required(),
                    additionalInformation: Joi.string().required()
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

                // Update in asset_master table,
                let currentTime = new Date().getTime();

                let insertData = { ...assetPayload, updatedAt: currentTime, isActive: true };

                console.log('[controllers][asset][updateAssetDetails]: Update Asset Insert Data', insertData);

                console.log('DATTAA ', insertData)
                let assetResult = await knex.update(insertData).where({ id: id }).returning(['*']).transacting(trx).into('asset_master');

                asset = assetResult[0]

                let additionalAttributes = req.body.additionalAttributes;
                if (additionalAttributes.length > 0) {
                    for (attribute of additionalAttributes) {
                        let finalAttribute = { ...attribute, assetId: asset.id, updatedAt: currentTime }
                        let d = await knex.update(finalAttribute).where({ id: attribute.id }).returning(['*']).transacting(trx).into('asset_attributes');
                        attribs.push(d[0])
                    }
                }
                trx.commit;

            });

            res.status(200).json({
                data: {
                    asset: { ...asset, attributes: attribs }
                },
                message: "Asset updated successfully !"
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

    }
}

module.exports = assetController;
const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');

//const trx = knex.transaction();
const assetController = {
    getAssetCategories: async (req,res) => {
        
        try {
            let categories
        let filters = req.body;
        if(filters) {
            categories = await knex('asset_category_master').select().where({...filters})    
        } else {
            categories = await knex('asset_category_master').select();
        }
		res.status(200).json({
			data: {
				categories,
				message: 'Categories List'
			}
		})
	}catch(err){
		return res.status(200).json({
			errors:[
				{code:'UNKNOWN SERVER ERROR', message: err.message}
			]
		})
	}
    },
    addAsset: async (req, res) => {
        try {

            let asset = null;
            let attribs = []
            let images = []
            let files = []
            let location = null

            await knex.transaction(async (trx) => {
                let assetPayload = req.body;
                console.log('[controllers][asset][payload]: Asset Payload', assetPayload);
                assetPayload = _.omit(assetPayload, ['additionalAttributes', 'multiple', 'images', 'files','assetCategory'])
                // validate keys
                const schema = Joi.object().keys({
                    //parentAssetId: Joi.string(),
                   // subAssetId: Joi.string(),
                   // partId: Joi.string(),
                    assetName: Joi.string().required(),
                    model: Joi.string().required(),
                    //barcode: Joi.string(),
                   // areaName: Joi.string(),
                   // description: Joi.string(),
                  //  price: Joi.string(),
                  //  installationDate: Joi.string(),
                   // warrentyExpiration: Joi.string(),
                   // locationId: Joi.string(),
                   // assignedUsers: Joi.string(),
                   // assignedTeams: Joi.string(),
                  //  assignedVendors: Joi.string(),
                   // additionalInformation: Joi.string()
                });

                let result = Joi.validate({ assetName: assetPayload.assetName, model: assetPayload.model}, schema);
                console.log('[controllers][asset][addAsset]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }


                
               let currentTime = new Date().getTime();
               
                let category
                let assetCategoryId
                let assetCategory = req.body.assetCategory;
                category = await knex.select().where({categoryName:assetCategory}).returning(['*']).transacting(trx).into('asset_category_master')
                if(category && category.length){
                    assetCategoryId = category[0].id;
                }else {
                    category = await knex.insert({categoryName:assetCategory,createdAt:currentTime,updatedAt:currentTime}).returning(['*']).transacting(trx).into('asset_category_master')
                    assetCategoryId = category[0].id;
                }

                // Insert in asset_master table,

                let insertData = { ...assetPayload, assetCategoryId, createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][asset][addAsset]: Insert Data', insertData);
                let multiple = 1;
                if (req.body.multiple) {
                    multiple = Number(req.body.multiple);
                }
                let data = Array(multiple).fill(insertData)
                let assetResult = await knex.insert(data).returning(['*']).transacting(trx).into('asset_master');

                asset = assetResult


                // Add asset to a location with help of locationId
                let locationTagPayload = {entityId: asset[0].id, entityType:'asset', locationTagId:Number(req.body.locationId),createdAt:currentTime,updatedAt:currentTime}
                const locationResult = await knex.insert(locationTagPayload).returning(['*']).transacting(trx).into('location_tags')
                location = locationResult[0]
                

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
                    asset: { ...asset, attributes: attribs, images, files,location }
                },
                message: "Asset added successfully !"
            });

        } catch (err) {
            console.log('[controllers][asset][addAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getAllAssetList:async(req,res) => {
        try {
            const assets = await knex('asset_master').select('id','assetName','model')
            return res.status(200).json({
                data: {
                    assets
                },
                message: 'All assets list'
            })
        } catch(err) {
            console.log('[controllers][asset][addAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getAssetList: async (req, res) => {
        // name, model, area, category
        try {

            let reqData = req.query;
            
            //let filters = {}
            let total, rows
            let {
                assetName,
                assetModel,
                // area,
                category
                } = req.body;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
    
            //  if(assetName){
            //   filters['asset_master.assetName'] = assetName
            //  }
            //  if(assetModel){
            //     filters['asset_master.model'] = assetModel
            //  }
            //  if(area){
            //     filters['asset_master.areaName'] = area
            //  }
            //  if(category){
            //     filters['asset_category_master.categoryName'] = category
            //  }
            

            // if (_.isEmpty(filters)) {
            //     [total, rows] = await Promise.all([
            //         knex.count('* as count').from("asset_master")
            //         .leftJoin('location_tags','asset_master.id','location_tags.entityId')
            //         .leftJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
            //         .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
            //         .first(),
                    
            //         knex("asset_master")
            //         .leftJoin('location_tags','asset_master.id','location_tags.entityId')
            //         .leftJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
            //         .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
            //         .select([
            //             'asset_master.assetName as Name',
            //             'asset_master.id as ID',
            //             'location_tags_master.title as Location',
            //             'asset_master.model as Model',
            //             'asset_master.barcode as Barcode',
            //             'asset_master.areaName as Area',
            //             'asset_category_master.categoryName as Category',
            //             'asset_master.createdAt as Date Created',
            //             'asset_master.unitOfMeasure as Unit Of Measure',

            //         ])
            //         .offset(offset).limit(per_page)
            //     ])
            //} else {
                //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                try {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from("asset_master")
                        .leftJoin('location_tags','asset_master.id','location_tags.entityId')
                        .leftJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
                        .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                        .where(qb => {
                            if(assetName){
                                qb.where('asset_master.assetName','like', `%${assetName}%`)
                            }
                            if(assetModel){
                                qb.where('asset_master.model', 'like', `%${assetModel}%`)

                            }
                            if(category){
                                qb.where('asset_category_master.categoryName', 'like', `%${category}%`)

                            }
                        }).first(),
                        knex("asset_master")
                        .leftJoin('location_tags','asset_master.id','location_tags.entityId')
                        .leftJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
                        .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                        .select([
                            'asset_master.assetName as Name',
                            'asset_master.id as ID',
                            'location_tags_master.title as Location',
                            'asset_master.model as Model',
                            'asset_master.barcode as Barcode',
                            'asset_master.areaName as Area',
                            'asset_category_master.categoryName as Category',
                            'asset_master.createdAt as Date Created',
                            'asset_master.unitOfMeasure as Unit Of Measure',
                        ])
                        .where(qb => {
                            if (assetName) {
                                qb.where('asset_master.assetName', 'like', `%${assetName}%`)
                            }
                            if (assetModel) {
                                qb.where('asset_master.model', 'like', `%${assetModel}%`)

                            }
                            if (category) {
                                qb.where('asset_category_master.categoryName', 'like', `%${category}%`)

                            }
                        }).offset(offset).limit(per_page)
                    ])
                } catch (e) {
                    // Error
                    console.log('Error: ' + e.message)
                }
            //}

            let count = total.count;
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
                    asset: pagination
                },
                message: 'Asset List!'
            })


            // let assetData = null;
            // assetData = await knex.select().from('asset_master')

            // console.log('[controllers][asset][getAssetList]: Asset List', assetData);

            // assetData = assetData.map(d => _.omit(d, ['createdAt'], ['updatedAt'], ['isActive']));

            // res.status(200).json({
            //     data: assetData,
            //     message: "Asset List"
            // });


        } catch (err) {
            console.log('[controllers][asset][getAssets] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getAssetListByCategory: async (req, res) => {
        // name, model, area, category
        try {

            let reqData = req.query;
            let total, rows
            let {
                assetCategoryId
            } = req.body;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            
            //let filters = { assetCategoryId}

            [total, rows] = await Promise.all([
                knex.count('* as count').from("asset_master")
                    .where({ assetCategoryId}).first(),

                knex("asset_master")
                    .select([
                        'id','assetName','model','barcode','areaName'
                    ]).where({ assetCategoryId})
                    .offset(offset).limit(per_page)
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

            return res.status(200).json({
                data: {
                    asset: pagination
                },
                message: 'Asset List!'
            })


            // let assetData = null;
            // assetData = await knex.select().from('asset_master')

            // console.log('[controllers][asset][getAssetList]: Asset List', assetData);

            // assetData = assetData.map(d => _.omit(d, ['createdAt'], ['updatedAt'], ['isActive']));

            // res.status(200).json({
            //     data: assetData,
            //     message: "Asset List"
            // });


        } catch (err) {
            console.log('[controllers][asset][getAssets] :  Error', err);
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

            assetData = await knex('asset_master').where({ id }).select('*')
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
                assetPayload = _.omit(assetPayload, ['additionalAttributes','id','assetCategory'])
                // validate keys
                const schema = Joi.object().keys({
                    // parentAssetId: Joi.string(),
                    // subAssetId: Joi.string(),
                    // partId: Joi.string(),
                    assetName: Joi.string().required(),
                    model: Joi.string().required(),
                    // barcode: Joi.string(),
                    // areaName: Joi.string(),
                    // description: Joi.string(),
                   //assetCategory: Joi.string().required(),
                    // price: Joi.string(),
                    // installationDate: Joi.string(),
                    // warrentyExpiration: Joi.string(),
                    // locationId: Joi.string(),
                    // assignedUsers: Joi.string(),
                    // assignedTeams: Joi.string(),
                    // assignedVendors: Joi.string(),
                    // additionalInformation: Joi.string()
                });

                let currentTime = new Date().getTime();

                let result = Joi.validate({assetName:assetPayload.assetName,model:assetPayload.model}, schema);
                console.log('[controllers][asset][addAsset]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let assetCategoryId
                let category
                let assetCategory = req.body.assetCategory;
                category = await knex.select().where({ categoryName: assetCategory }).returning(['*']).transacting(trx).into('asset_category_master')
                if (category && category.length) {
                    assetCategoryId = category[0].id;
                } else {
                    category = await knex.insert({ categoryName: assetCategory, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('asset_category_master')
                    assetCategoryId = category[0].id;
                }

                // Update in asset_master table,

                let insertData = { ...assetPayload, assetCategoryId, updatedAt: currentTime, isActive: true };

                console.log('[controllers][asset][updateAssetDetails]: Update Asset Insert Data', insertData);

                console.log('DATTAA ', insertData)
                let assetResult = await knex.update(insertData).where({ id: id }).returning(['*']).transacting(trx).into('asset_master');

                asset = assetResult[0]

                let additionalAttributes = req.body.additionalAttributes;
                if (additionalAttributes.length > 0) {
                    for (attribute of additionalAttributes) {
                        if(attribute.id){

                            let finalAttribute = { ...attribute, assetId: Number(id), updatedAt: currentTime }
                            let d = await knex.update(finalAttribute).where({ id: attribute.id }).returning(['*']).transacting(trx).into('asset_attributes');
                            attribs.push(d[0])
                        } else {
                            let d = await knex.insert({ attributeName: attribute.attributeName, attributeDescription: attribute.attributeDescription, assetId: Number(id) }).returning(['*']).transacting(trx).into('asset_attributes');
                            attribs.push(d[0])
                        
                        }
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
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }

    },
    addServiceOrderReplaceAsset: async (req, res) => {
        //if newAset exists in the table for this oldasset that we gonna replace with some other newasset add end date to that previous entry if end date blank
        try {
            let asset = null
            let updated = null
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    OldAssetId: Joi.string().required(),
                    newAssetId: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })
                const result = Joi.validate(payload, schema)
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime()
                //let currentDate = new Date().getDate()
                let ommitedPayload = _.omit(payload, ['serviceOrderId'])


                // Now first check whether this oldAssetId exists as the newAssetId for any previous entry where endDate is null
                let entry = await knex.select().where({ newAssetId: payload.OldAssetId, endDate: null, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('replaced_assets')

                if (entry.length > 0) {
                    // Update endDate of previous entry with today's date and insert new entry
                    let updatedEntry = await knex.update({ endDate: currentTime }).where({ newAssetId: payload.OldAssetId, entityType: 'service_orders' }).returning(['*']).transacting(trx).into('replaced_assets')

                    updated = updatedEntry[0]

                    let insertData = { startDate: currentTime, endDate: null, createdAt: currentTime, updatedAt: currentTime, entityId: payload.serviceOrderId, entityType: 'service_orders', ...ommitedPayload }
                    let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('replaced_assets')
                    asset = assetResult[0]
                } else {
                    let insertData = { startDate: currentTime, endDate: null, createdAt: currentTime, updatedAt: currentTime, entityId: payload.serviceOrderId, entityType: 'service_orders', ...ommitedPayload }
                    let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('replaced_assets')
                    asset = assetResult[0]
                }
                trx.commit
            })
            return res.status(200).json({
                data: {
                    asset: asset,
                    updatedEntry: updated
                },
                message: 'Asset replaced successfully'
            })
        } catch (err) {
            console.log('[controllers][asset][addServiceOrderReplaceAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceRequestReplaceAsset: async (req, res) => {
        try {
            let asset = null
            let updated = null
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    OldAssetId: Joi.string().required(),
                    newAssetId: Joi.string().required(),
                    serviceRequestId: Joi.string().required()
                })
                const result = Joi.validate(payload, schema)
                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }
                let currentTime = new Date().getTime()
                let ommitedPayload = _.omit(payload, ['serviceRequestId'])



                // Now first check whether this oldAssetId exists as the newAssetId for any previous entry where endDate is null
                let entry = await knex.select().where({ entityType: 'service_requests', newAssetId: payload.OldAssetId, endDate: null }).returning(['*']).transacting(trx).into('replaced_assets')

                if (entry.length > 0) {
                    // Update endDate of previous entry with today's date and insert new entry
                    let updatedEntry = await knex.update({ endDate: currentTime }).where({ newAssetId: payload.OldAssetId, entityType: 'service_requests' }).returning(['*']).transacting(trx).into('replaced_assets')

                    updated = updatedEntry[0]

                    let insertData = { startDate: currentTime, endDate: null, createdAt: currentTime, updatedAt: currentTime, entityId: payload.serviceRequestId, entityType: 'service_requests', ...ommitedPayload }
                    let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('replaced_assets')
                    asset = assetResult[0]
                } else {
                    let insertData = { startDate: currentTime, endDate: null, createdAt: currentTime, updatedAt: currentTime, entityId: payload.serviceRequestId, entityType: 'service_requests', ...ommitedPayload }
                    let assetResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('replaced_assets')
                    asset = assetResult[0]
                }
                trx.commit
            })
            return res.status(200).json({
                data: {
                    asset: asset,
                    updatedEntry: updated
                },
                message: 'Asset replaced successfully'
            })
        } catch (err) {
            console.log('[controllers][asset][addServiceRequestReplaceAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceOrderRelocateAsset: async (req, res) => {
        try {
            let updatedEntry = null
            let insertedEntry = null
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    locationId: Joi.string().required(),
                    serviceOrderId: Joi.string().required()
                })
                const result = Joi.validate(payload, schema)

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime()
                // Check whether this asset is already relocated once or this is the first time
                let entryCheck = await knex.select().where({ assetId: payload.assetId, entityType: 'service_orders', endDate: null }).returning(['*']).transacting(trx).into('relocated_assets')
                if (entryCheck.length > 0) {
                    let updateEntry = await knex.update({ endDate: currentTime, assetId: payload.assetId, entityType: 'service_orders', entityId: payload.serviceOrderId }).returning(['*']).transacting(trx).into('relocated_assets')
                    updatedEntry = updateEntry[0]

                    // Now insert new entry
                    let insertEntry = await knex.insert({ assetId: payload.assetId, locationId: payload.locationId, entityId: payload.serviceOrderId, entityType: 'service_orders', startDate: currentTime, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('relocated_assets')
                    insertedEntry = insertEntry[0]
                } else {
                    // Insert new entry with endDate equal to null
                    let insertEntry = await knex.insert({ assetId: payload.assetId, locationId: payload.locationId, entityId: payload.serviceOrderId, entityType: 'service_orders', startDate: currentTime, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('relocated_assets')
                    insertedEntry = insertEntry[0]
                }

                trx.commit;
            })

            res.status(200).json({
                data: {
                    relocatedEntry: insertedEntry,
                    updatedEntry: updatedEntry
                },
                message: 'Asset relocated successfully.'
            })

        } catch (err) {
            console.log('[controllers][asset][addServiceOrderRelocateAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addServiceRequestRelocateAsset: async (req, res) => {
        try {
            let updatedEntry = null
            let insertedEntry = null
            await knex.transaction(async trx => {
                let payload = req.body;
                const schema = Joi.object().keys({
                    assetId: Joi.string().required(),
                    locationId: Joi.string().required(),
                    serviceRequestId: Joi.string().required()
                })
                const result = Joi.validate(payload, schema)

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                let currentTime = new Date().getTime()
                // Check whether this asset is already relocated once or this is the first time
                let entryCheck = await knex.select().where({ assetId: payload.assetId, entityType: 'service_requests', endDate: null }).returning(['*']).transacting(trx).into('relocated_assets')
                if (entryCheck.length > 0) {
                    let updateEntry = await knex.update({ endDate: currentTime, assetId: payload.assetId, entityType: 'service_requests', entityId: payload.serviceRequestId }).returning(['*']).transacting(trx).into('relocated_assets')
                    updatedEntry = updateEntry[0]

                    // Now insert new entry
                    let insertEntry = await knex.insert({ assetId: payload.assetId, locationId: payload.locationId, entityId: payload.serviceRequestId, entityType: 'service_requests', startDate: currentTime, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('relocated_assets')
                    insertedEntry = insertEntry[0]
                } else {
                    // Insert new entry with endDate equal to null
                    let insertEntry = await knex.insert({ assetId: payload.assetId, locationId: payload.locationId, entityId: payload.serviceRequestId, entityType: 'service_requests', startDate: currentTime, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('relocated_assets')
                    insertedEntry = insertEntry[0]
                }

                trx.commit;
            })

            res.status(200).json({
                data: {
                    relocatedEntry: insertedEntry,
                    updatedEntry: updatedEntry
                },
                message: 'Asset relocated successfully.'
            })

        } catch (err) {
            console.log('[controllers][asset][addServiceOrderRelocateAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    assetSearch: async (req, res) => {
        try {

            let query = decodeURI(req.query.query).trim();

            const getFilteredItems = (searchTerm) => knex('asset_master')
                .where((qb) => {
                    qb.where('asset_master.assetName', 'like', `%${searchTerm}%`);

                    qb.orWhere('asset_master.barcode', 'like', `%${searchTerm}%`);

                    qb.orWhere('asset_master.areaName', 'like', `%${searchTerm}%`);
                    qb.orWhere('asset_master.assetCategory', 'like', `%${searchTerm}%`);
                    qb.orWhere('asset_master.price', 'like', `%${searchTerm}%`);
                    qb.orWhere('asset_master.additionalInformation', 'like', `%${searchTerm}%`);
                    qb.orWhere('asset_master.description', 'like', `%${searchTerm}%`);
                    qb.orWhere('asset_master.model', 'like', `%${searchTerm}%`);
                });
            const assets = await getFilteredItems(query)
            return res.status(200).json({
                data: {
                    assets: assets
                },
                message: 'Search results for: ' + query
            })

        } catch (err) {
            console.log('[controllers][asset][addServiceOrderRelocateAsset] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    exportAsset: async(req,res)=>{
        try {

            let reqData = req.query;
            let filters = {}
            let total, rows
            let {
                assetName,
                assetModel,
                area,
                category
                } = req.body;

                let pagination = {};
                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                if(assetName){
                    filters['asset_master.assetName'] = assetName
                   }
                   if(assetModel){
                      filters['asset_master.model'] = assetModel
                   }
                   if(area){
                      filters['asset_master.areaName'] = area
                   }
                   if(category){
                      filters['asset_category_master.categoryName'] = category
                   }
       
      
                  if (_.isEmpty(filters)) {
                      [total, rows] = await Promise.all([
                          knex.count('* as count').from("asset_master")
                          .innerJoin('location_tags','asset_master.id','location_tags.entityId')
                          .innerJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
                          .innerJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                          .first(),
                          
                          knex("asset_master")
                          .innerJoin('location_tags','asset_master.id','location_tags.entityId')
                          .innerJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
                          .innerJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                          .select([
                              'asset_master.assetName as Name',
                              'asset_master.id as ID',
                              'location_tags_master.title as Location',
                              'asset_master.model as Model',
                              'asset_master.barcode as Barcode',
                              'asset_master.areaName as Area',
                              'asset_category_master.categoryName as Category',
                              'asset_master.createdAt as Date Created'
                          ])
                          .offset(offset).limit(per_page)
                      ])
                  } else {
                      filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                      try {
                          [total, rows] = await Promise.all([
                              knex.count('* as count').from("asset_master")
                              .innerJoin('location_tags','asset_master.id','location_tags.entityId')
                              .innerJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
                              .innerJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                              .where(filters).offset(offset).limit(per_page).first(),
                              knex("asset_master")
                              .innerJoin('location_tags','asset_master.id','location_tags.entityId')
                              .innerJoin('location_tags_master','location_tags.locationTagId','location_tags_master.id')
                              .innerJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                              .select([
                                  'asset_master.assetName as Name',
                                  'asset_master.id as ID',
                                  'location_tags_master.title as Location',
                                  'asset_master.model as Model',
                                  'asset_master.barcode as Barcode',
                                  'asset_master.areaName as Area',
                                  'asset_category_master.categoryName as Category',
                                  'asset_master.createdAt as Date Created'
                              ])
                              .where(filters).offset(offset).limit(per_page)
                          ])
                      } catch (e) {
                          // Error
                          console.log('Error: ' + e.message)
                      }
                  }
      
                  var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
                  var ws = XLSX.utils.json_to_sheet(rows);
                  XLSX.utils.book_append_sheet(wb, ws, "pres");
                  XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
                  let filename = "uploads/AssetData-"+Date.now()+".csv";
                  let  check = XLSX.writeFile(wb,filename);
      
                  return res.status(200).json({
                      data:rows,
                      message:"Asset Data Export Successfully!"
                  })
      
                  
      
              } catch (err) {
                  console.log('[controllers][asset][getAssets] :  Error', err);
                  res.status(500).json({
                    errors: [
                        { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                    ],
                });
            }
    },
    getAssetListByLocation: async (req,res) => {
        try {  

            let reqData = req.query;
            
            let filters = _.pickBy(req.body,v=>v);
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;


            let buildingId
           let floorId
           let projectId
           let companyId
           let assetCategoryId = filters.assetCategoryId;

           if(filters.buildingPhaseCode){
               // go extract buildingId
              let buildingIdResult = await knex('buildings_and_phases').select('id').where(qb => {
                  qb.where('buildingPhaseCode', 'like', `%${filters.buildingPhaseCode}%`);
               })
               if(buildingIdResult && buildingIdResult.length){
                   buildingId = buildingIdResult[0].id
               }
           }

           if(filters.companyName){
               let buildingIdResult = await knex('companies').select('id').where(qb => {
                   qb.where('companyName', 'like', `%${filters.companyName}%`);
               })
               if (buildingIdResult && buildingIdResult.length) {
                   companyId = buildingIdResult[0].id
               }
           }
           if(filters.floorZoneCode){
               let buildingIdResult = await knex('floor_and_zones').select('id').where(qb => {
                   qb.where('floorZoneCode', 'like', `%${filters.floorZoneCode}%`);
               })
               if (buildingIdResult && buildingIdResult.length) {
                   floorId = buildingIdResult[0].id
               }
           }
           if(filters.projectName){
               let buildingIdResult = await knex('projects').select('id').where(qb => {
                   qb.where('projectName', 'like', `%${filters.projectName}%`);
               })
               if (buildingIdResult && buildingIdResult.length) {
                   projectId = buildingIdResult[0].id
               }
           }

            let condition = {}
            if(buildingId){
                condition['asset_location.buildingId'] = buildingId
            }
            if(floorId){
                condition['asset_location.floorId'] = floorId
            }
            if(companyId){
                condition['asset_location.companyId'] = companyId
            }
            if(projectId){
                condition['asset_location.projectId'] = projectId;
            }
            if(assetCategoryId){
                condition['asset_master.assetCategoryId'] = assetCategoryId;
            }

           //console.log('Condition: ',JSON.stringify(condition))

            
            [total, rows] = await Promise.all([
                knex.count('* as count').from("asset_master")
                    .innerJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
                    .select([
                        'asset_master.id as id', 
                        "assetName",
                        "model",
                        "barcode",
                        "areaName"
                    ]).where(condition).groupBy(["asset_master.id", "asset_location.id"]),
                knex.from("asset_master")
                    .innerJoin('asset_location', 'asset_master.id', 'asset_location.assetId')
                    .select([
                        'asset_master.id as id',
                        "assetName",
                        "model",
                        "barcode",
                        "areaName"
                    ]).where(condition).offset(offset).limit(per_page)
            ])
            

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
                    asset: pagination
                },
                message: 'Asset List!'
            })

        } catch(err) {
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
            
           
    
             

            
        
           
            console.log('[controllers][asset][addServiceOrderRelocateAsset] :  Error', err);
            

    },
    //getAssetCategoryById()
}

module.exports = assetController;

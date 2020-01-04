const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');
const fs = require('fs')
const request = require("request");
const path = require("path");
const QRCode =require('qrcode')
const uuid = require('uuid/v4')

const assetController = {
    getAssetCategories: async (req,res) => {
        
        try {
            let categories
        let filters = req.body;
        if(filters) {
            categories = await knex('asset_category_master').select().where({...filters,orgId:req.orgId})    
        } else {
            categories = await knex('asset_category_master').select().where({orgId:req.orgId});
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
                category = await knex.select().where({categoryName:assetCategory,orgId:req.orgId}).returning(['*']).transacting(trx).into('asset_category_master')
                if(category && category.length){
                    assetCategoryId = category[0].id;
                }else {
                    category = await knex.insert({categoryName:assetCategory,createdAt:currentTime,updatedAt:currentTime,orgId:req.orgId,createdBy:req.me.id}).returning(['*']).transacting(trx).into('asset_category_master')//.where({orgId:})
                    assetCategoryId = category[0].id;
                }

                // Insert in asset_master table,

                let insertData = {
                  ...assetPayload,
                  assetCategoryId,
                  createdAt: currentTime,
                  updatedAt: currentTime,
                  orgId: req.orgId,
                  uuid:uuid()
                };

                console.log('[controllers][asset][addAsset]: Insert Data', insertData);
                let multiple = 1;
                if (req.body.multiple) {
                    multiple = Number(req.body.multiple);
                }
                let data = Array(multiple).fill(insertData)
                let assetResult = await knex
                  .insert(data)
                  .returning(["*"])
                  .transacting(trx)
                  .into("asset_master")
                  //.where({ orgId: req.orgId });

                asset = assetResult


                // Add asset to a location with help of locationId
                let locationTagPayload = {entityId: asset[0].id, entityType:'asset', locationTagId:Number(req.body.locationId),createdAt:currentTime,updatedAt:currentTime,orgId:req.orgId}
                const locationResult = await knex
                  .insert(locationTagPayload)
                  .returning(["*"])
                  .transacting(trx)
                  .into("location_tags")
                  //.where({ orgId: req.orgId });
                location = locationResult[0]
                

                let additionalAttributes = req.body.additionalAttributes;
                if (additionalAttributes && additionalAttributes.length > 0) {
                    for (asset of assetResult) {
                        for (attribute of additionalAttributes) {
                          if(attribute.attributeName && attribute.attributeDescription){
                            let finalAttribute = {
                              ...attribute,
                              assetId: asset.id,
                              createdAt: currentTime,
                              updatedAt: currentTime,
                              orgId: req.orgId
                            };
                            let d = await knex
                              .insert(finalAttribute)
                              .returning(["*"])
                              .transacting(trx)
                              .into("asset_attributes")
                              //.where({ orgId: req.orgId });
                            attribs.push(d[0])
                          }
                        }
                    }
                }

                // Insert images in images table
                let imagesData = req.body.images;
                if (imagesData && imagesData.length > 0) {
                    for (asset of assetResult) {
                        for (image of imagesData) {
                            let d = await knex
                              .insert({
                                entityId: asset.id,
                                ...image,
                                entityType: "asset_master",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                              })
                              .returning(["*"])
                              .transacting(trx)
                              .into("images")
                            //   .where({ orgId: req.orgId });
                            images.push(d[0])
                        }
                    }
                }

                // Insert files in files table
                let filesData = req.body.files;
                if (filesData && filesData.length > 0) {
                    for (asset of assetResult) {
                        for (file of filesData) {
                            let d = await knex
                              .insert({
                                entityId: asset.id,
                                ...file,
                                entityType: "asset_master",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                              })
                              .returning(["*"])
                              .transacting(trx)
                              .into("files");
                              //.where({ orgId: req.orgId });
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
            const assets = await knex("asset_master")
              .select("id", "assetName", "model")
              .where({ orgId: req.orgId });
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
                category,
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
                      knex
                        .count("* as count")
                        .from("asset_master")
                        .leftJoin(
                          "location_tags",
                          "asset_master.id",
                          "location_tags.entityId"
                        )
                        .leftJoin(
                          "location_tags_master",
                          "location_tags.locationTagId",
                          "location_tags_master.id"
                        )
                        .leftJoin(
                          "asset_category_master",
                          "asset_master.assetCategoryId",
                          "asset_category_master.id"
                        )
                        .leftJoin(
                          "companies",
                          "asset_master.companyId",
                          "companies.id"
                        )
                        .where(qb => {
                          if (assetName) {
                            qb.where(
                              "asset_master.assetName",
                              "like",
                              `%${assetName}%`
                            );
                          }
                          if (assetModel) {
                            qb.where(
                              "asset_master.model",
                              "like",
                              `%${assetModel}%`
                            );
                          }
                          if (category) {
                            qb.where(
                              "asset_category_master.categoryName",
                              "like",
                              `%${category}%`
                            );
                          }
                        })
                        .first()
                        .where({ 'asset_master.orgId': req.orgId }),
                      knex("asset_master")
                        .leftJoin(
                          "location_tags",
                          "asset_master.id",
                          "location_tags.entityId"
                        )
                        .leftJoin(
                          "location_tags_master",
                          "location_tags.locationTagId",
                          "location_tags_master.id"
                        )
                        .leftJoin(
                          "asset_category_master",
                          "asset_master.assetCategoryId",
                          "asset_category_master.id"
                        )
                        .leftJoin(
                          "companies",
                          "asset_master.companyId",
                          "companies.id"
                        )
                        .select([
                          "asset_master.assetName as Name",
                          "asset_master.id as ID",
                          "location_tags_master.title as Location",
                          "asset_master.model as Model",
                          "asset_master.barcode as Barcode",
                          "asset_master.areaName as Area",
                          "asset_category_master.categoryName as Category",
                          "asset_master.createdAt as Date Created",
                          "asset_master.unitOfMeasure as Unit Of Measure",
                          "asset_master.price as Price",
                          "companies.companyName"
                        ])
                        .where({ 'asset_master.orgId': req.orgId })
                        .where(qb => {
                          if (assetName) {
                            qb.where(
                              "asset_master.assetName",
                              "like",
                              `%${assetName}%`
                            );
                          }
                          if (assetModel) {
                            qb.where(
                              "asset_master.model",
                              "like",
                              `%${assetModel}%`
                            );
                          }
                          if (category) {
                            qb.where(
                              "asset_category_master.categoryName",
                              "like",
                              `%${category}%`
                            );
                          }
                        })
                        .orderBy("asset_master.createdAt", "desc")
                        .offset(offset)
                        .limit(per_page)
                    ]);
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
                assetCategoryId,
                companyId,
            } = req.body;
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            
            //let filters = { assetCategoryId}


            // validate keys
            const schema = Joi.object().keys({
                assetCategoryId:Joi.number().required(),
                companyId:Joi.number().required()
            });

            let result = Joi.validate({
                assetCategoryId,
                companyId,
            }, schema);
            console.log('[controllers][asset][addAsset]: JOi Result', result);

            if (result && result.hasOwnProperty('error') && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: 'VALIDATION_ERROR', message: result.error.message }
                    ],
                });
            }


            [total, rows] = await Promise.all([
              knex
                .count("* as count")
                .from("asset_master")
                .where({ assetCategoryId, companyId })
                .first()
                .where({ orgId: req.orgId }),

              knex("asset_master")
                .select(["id", "assetName", "model", "barcode", "areaName"])
                .where({ assetCategoryId, companyId })
                .offset(offset)
                .limit(per_page)
                .where({ orgId: req.orgId })
            ]);

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
            let qrcode = ''

          qrcode = await QRCode.toDataURL('org-'+req.orgId+'-asset-'+id)

            assetData = await knex('asset_master').where({'asset_master.id':id })
                              .leftJoin('asset_category_master','asset_master.assetCategoryId','asset_category_master.id')
                              //.leftJoin('part_master','asset_master.partId','part_master.id')
                              //.leftJoin('vendor_master','asset_master.assignedVendors','vendor_master.id')
                              //.leftJoin('companies','asset_master.companyId','companies.id')
                              .select([
                                  'asset_master.*',
                                  'asset_category_master.categoryName',
                                //  'part_master.partCode',
                                  //'part_master.partName'
                                //  'vendor_master.name as assignedVendor'
                                ])
            let assetDataResult = assetData[0];
            let omitedAssetDataResult = _.omit(assetDataResult, ['createdAt'], ['updatedAt'], ['isActive'])
            additionalAttributes = await knex("asset_attributes")
              .where({ assetId: id,orgId: req.orgId })
              .select()
            //   .where({  });


            files = await knex("files")
              .where({
                entityId: id,
                entityType: "asset_master",
                orgId: req.orgId
              })
              .select();
            //   .where({ orgId: req.orgId });
            images = await knex("images")
              .where({
                entityId: id,
                entityType: "asset_master",
                orgId: req.orgId
              })
              .select()
            //   .where({ orgId: req.orgId });

            console.log('[controllers][asset][getAssetDetails]: Asset Details', assetData);
            // Get asset location
            const assetLocation = await knex("asset_location")
              .leftJoin("companies", "asset_location.companyId", "companies.id")
              .leftJoin("projects", "asset_location.projectId", "projects.id")
              .leftJoin(
                "buildings_and_phases",
                "asset_location.buildingId",
                "buildings_and_phases.id"
              )
              .leftJoin(
                "floor_and_zones",
                "asset_location.floorId",
                "floor_and_zones.id"
              )
              .leftJoin(
                "property_units",
                "asset_location.unitId",
                "property_units.id"
              )
              .select([
                "companies.companyName as companyName",
                "projects.projectName as projectName",
                "buildings_and_phases.description as building",
                "floor_and_zones.description as floorZone",
                "property_units.description as propertyUnit",
                "companies.id as companyId",
                "projects.id as projectId",
                "buildings_and_phases.id as buildingId",
                "floor_and_zones.id as floorId",
                "property_units.id as unitId",
                "asset_location.startDate as startDate",
                "asset_location.endDate as endDate",
                "asset_location.id as assetLocationId",
                "asset_location.houseId as houseId"
              ])
              .where({ assetId: id, 'asset_location.orgId': req.orgId });
            //   .where({ orgId: req.orgId });



            // // Get all service orders
            // const service_orders = await knex('assigned_assets')
            // .leftJoin('service_orders')
            // .select(['entityId','status'])
            // .where({entityType:'service_orders',orgId:req.orgId})


            res.status(200).json({
                data: { asset: { ...omitedAssetDataResult, additionalAttributes, files, images,assetLocation,qrcode } },
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
            let insertedImages = []
            let insertedFiles = []

            await knex.transaction(async (trx) => {
                let assetPayload = req.body;
                let id = req.body.id
                console.log('[controllers][asset][payload]: Update Asset Payload', assetPayload);
                assetPayload = _.omit(assetPayload, ['additionalAttributes','id','assetCategory','images','files'])
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
                category = await knex
                  .select()
                  .where({ categoryName: assetCategory })
                  .returning(["*"])
                  .transacting(trx)
                  .into("asset_category_master")
                  .where({ orgId: req.orgId });
                if (category && category.length) {
                    assetCategoryId = category[0].id;
                } else {
                    category = await knex
                      .insert({
                        categoryName: assetCategory,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("asset_category_master");
                    //   .where({ orgId: req.orgId });
                    assetCategoryId = category[0].id;
                }

                // Insert in images
                if(req.body.images && req.body.images.length){
                    for (let image of req.body.images) {
                        let insertedImageResult = await knex("images")
                          .insert({
                            ...image,
                            entityId: id,
                            entityType: "asset_master",
                            createdAt: currentTime,
                            updatedAt: currentTime,
                            orgId: req.orgId
                          })
                        //   .where({ orgId: req.orgId });
                        insertedImages.push(insertedImageResult[0])
                    }
                }
                //Insert In Files
                if (req.body.files && req.body.files.length) {
                    for (let file of req.body.files) {
                        let insertedFileResult = await knex("files").insert({
                          ...file,
                          entityId: id,
                          entityType: "asset_master",
                          createdAt: currentTime,
                          updatedAt: currentTime,
                          orgId: req.orgId
                        });
                        //   .where({ orgId: req.orgId });
                        insertedFiles.push(insertedFileResult[0])
                    }
                }
                
                // Update in asset_master table,

                let insertData = {
                  ...assetPayload,
                  assetCategoryId,
                  updatedAt: currentTime,
                  isActive: true,
                //   orgId: req.orgId
                };

                console.log('[controllers][asset][updateAssetDetails]: Update Asset Insert Data', insertData);

                console.log('DATTAA ', insertData)
                let assetResult = await knex
                  .update(insertData)
                  .where({ id: id, orgId: req.orgId })
                  .returning(["*"])
                  .transacting(trx)
                  .into("asset_master");
                //   .where({ orgId: req.orgId });

                asset = assetResult[0]

                let additionalAttributes = req.body.additionalAttributes;
                if (additionalAttributes.length > 0) {
                    for (attribute of additionalAttributes) {
                        if(attribute.id){

                            let finalAttribute = { ...attribute, assetId: Number(id), updatedAt: currentTime }
                            let d = await knex
                              .update(finalAttribute)
                              .where({ id: attribute.id, orgId: req.orgId })
                              .returning(["*"])
                              .transacting(trx)
                              .into("asset_attributes");
                            //   .where({ orgId: req.orgId });
                            attribs.push(d[0])
                        } else {
                            let d = await knex
                              .insert({
                                attributeName: attribute.attributeName,
                                attributeDescription:
                                  attribute.attributeDescription,
                                assetId: Number(id),
                                orgId: req.orgId
                              })
                              .returning(["*"])
                              .transacting(trx)
                              .into("asset_attributes")
                            //   .where({ orgId: req.orgId });
                            attribs.push(d[0])
                        
                        }
                    }
                }
                trx.commit;

            });

            res.status(200).json({
                data: {
                    asset: { ...asset, attributes: attribs, insertedImages,insertedFiles }
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
                let entry = await knex
                  .select()
                  .where({
                    newAssetId: payload.OldAssetId,
                    endDate: null,
                    entityType: "service_orders",
                    orgId: req.orgId
                  })
                  .returning(["*"])
                  .transacting(trx)
                  .into("replaced_assets")
                //   .where({ orgId: req.orgId });

                if (entry.length > 0) {
                    // Update endDate of previous entry with today's date and insert new entry
                    let updatedEntry = await knex
                      .update({ endDate: currentTime })
                      .where({
                        newAssetId: payload.OldAssetId,
                        entityType: "service_orders",
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("replaced_assets");
                    //   .where({ orgId: req.orgId });

                    updated = updatedEntry[0]

                    let insertData = {
                      startDate: currentTime,
                      endDate: null,
                      createdAt: currentTime,
                      updatedAt: currentTime,
                      entityId: payload.serviceOrderId,
                      entityType: "service_orders",
                      ...ommitedPayload,
                      orgId: req.orgId
                    };
                    let assetResult = await knex
                      .insert(insertData)
                      .returning(["*"])
                      .transacting(trx)
                      .into("replaced_assets")
                    //   .where({ orgId: req.orgId });
                    asset = assetResult[0]
                } else {
                    let insertData = {
                      startDate: currentTime,
                      endDate: null,
                      createdAt: currentTime,
                      updatedAt: currentTime,
                      entityId: payload.serviceOrderId,
                      entityType: "service_orders",
                      ...ommitedPayload,
                      orgId: req.orgId
                    };
                    let assetResult = await knex
                      .insert(insertData)
                      .returning(["*"])
                      .transacting(trx)
                      .into("replaced_assets")
                    //   .where({ orgId: req.orgId });
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
                let entry = await knex
                  .select()
                  .where({
                    entityType: "service_requests",
                    newAssetId: payload.OldAssetId,
                    endDate: null,
                    orgId: req.orgId
                  })
                  .returning(["*"])
                  .transacting(trx)
                  .into("replaced_assets")
                //   .where({ orgId: req.orgId });

                if (entry.length > 0) {
                    // Update endDate of previous entry with today's date and insert new entry
                    let updatedEntry = await knex
                      .update({ endDate: currentTime })
                      .where({
                        newAssetId: payload.OldAssetId,
                        entityType: "service_requests",
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("replaced_assets")
                    //   .where({ orgId: req.orgId });

                    updated = updatedEntry[0]

                    let insertData = {
                      startDate: currentTime,
                      endDate: null,
                      createdAt: currentTime,
                      updatedAt: currentTime,
                      entityId: payload.serviceRequestId,
                      entityType: "service_requests",
                      ...ommitedPayload,
                      orgId: req.orgId
                    };
                    let assetResult = await knex
                      .insert(insertData)
                      .returning(["*"])
                      .transacting(trx)
                      .into("replaced_assets")
                    //   .where({ orgId: req.orgId });
                    asset = assetResult[0]
                } else {
                    let insertData = {
                      startDate: currentTime,
                      endDate: null,
                      createdAt: currentTime,
                      updatedAt: currentTime,
                      entityId: payload.serviceRequestId,
                      entityType: "service_requests",
                      ...ommitedPayload,
                      orgId: req.orgId
                    };
                    let assetResult = await knex
                      .insert(insertData)
                      .returning(["*"])
                      .transacting(trx)
                      .into("replaced_assets")
                    //   .where({ orgId: req.orgId });
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
                let entryCheck = await knex
                  .select()
                  .where({
                    assetId: payload.assetId,
                    entityType: "service_orders",
                    endDate: null,
                    orgId: req.orgId
                  })
                  .returning(["*"])
                  .transacting(trx)
                  .into("relocated_assets")
                //   .where({ orgId: req.orgId });
                if (entryCheck.length > 0) {
                    let updateEntry = await knex
                      .update({
                        endDate: currentTime,
                        assetId: payload.assetId,
                        entityType: "service_orders",
                        entityId: payload.serviceOrderId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("relocated_assets")
                      .where({ orgId: req.orgId });
                    updatedEntry = updateEntry[0]

                    // Now insert new entry
                    let insertEntry = await knex
                      .insert({
                        assetId: payload.assetId,
                        locationId: payload.locationId,
                        entityId: payload.serviceOrderId,
                        entityType: "service_orders",
                        startDate: currentTime,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("relocated_assets")
                    //   .where({ orgId: req.orgId });
                    insertedEntry = insertEntry[0]
                } else {
                    // Insert new entry with endDate equal to null
                    let insertEntry = await knex
                      .insert({
                        assetId: payload.assetId,
                        locationId: payload.locationId,
                        entityId: payload.serviceOrderId,
                        entityType: "service_orders",
                        startDate: currentTime,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("relocated_assets")
                    //   .where({ orgId: req.orgId });
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
                let entryCheck = await knex
                  .select()
                  .where({
                    assetId: payload.assetId,
                    entityType: "service_requests",
                    endDate: null
                  })
                  .returning(["*"])
                  .transacting(trx)
                  .into("relocated_assets")
                  .where({ orgId: req.orgId });
                if (entryCheck.length > 0) {
                    let updateEntry = await knex
                      .update({
                        endDate: currentTime,
                        assetId: payload.assetId,
                        entityType: "service_requests",
                        entityId: payload.serviceRequestId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("relocated_assets")
                      .where({ orgId: req.orgId });
                    updatedEntry = updateEntry[0]

                    // Now insert new entry
                    let insertEntry = await knex
                      .insert({
                        assetId: payload.assetId,
                        locationId: payload.locationId,
                        entityId: payload.serviceRequestId,
                        entityType: "service_requests",
                        startDate: currentTime,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("relocated_assets")
                    //   .where({ orgId: req.orgId });
                    insertedEntry = insertEntry[0]
                } else {
                    // Insert new entry with endDate equal to null
                    let insertEntry = await knex
                      .insert({
                        assetId: payload.assetId,
                        locationId: payload.locationId,
                        entityId: payload.serviceRequestId,
                        entityType: "service_requests",
                        startDate: currentTime,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                      })
                      .returning(["*"])
                      .transacting(trx)
                      .into("relocated_assets")
                    //   .where({ orgId: req.orgId });
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

            const getFilteredItems = searchTerm =>
              knex("asset_master")
                .where(qb => {
                    qb.where({'asset_master.orgId':req.orgId})
                  qb.where("asset_master.assetName", "like", `%${searchTerm}%`);

                  qb.orWhere("asset_master.barcode", "like", `%${searchTerm}%`);

                  qb.orWhere(
                    "asset_master.areaName",
                    "like",
                    `%${searchTerm}%`
                  );
                  qb.orWhere(
                    "asset_master.assetCategory",
                    "like",
                    `%${searchTerm}%`
                  );
                  qb.orWhere("asset_master.price", "like", `%${searchTerm}%`);
                  qb.orWhere(
                    "asset_master.additionalInformation",
                    "like",
                    `%${searchTerm}%`
                  );
                  qb.orWhere(
                    "asset_master.description",
                    "like",
                    `%${searchTerm}%`
                  );
                  qb.orWhere("asset_master.model", "like", `%${searchTerm}%`);
                })
                // .where({ orgId: req.orgId });
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
    // exportAsset: async(req,res)=>{
    //     try {

    //         let reqData = req.query;
    //         let filters = {}
    //         let total, rows
    //         let {
    //             assetName,
    //             assetModel,
    //             area,
    //             category
    //             } = req.body;

    //             let pagination = {};
    //             let per_page = reqData.per_page || 10;
    //             let page = reqData.current_page || 1;
    //             if (page < 1) page = 1;
    //             let offset = (page - 1) * per_page;

    //             if(assetName){
    //                 filters['asset_master.assetName'] = assetName
    //                }
    //                if(assetModel){
    //                   filters['asset_master.model'] = assetModel
    //                }
    //                if(area){
    //                   filters['asset_master.areaName'] = area
    //                }
    //                if(category){
    //                   filters['asset_category_master.categoryName'] = category
    //                }
       
      
    //               if (_.isEmpty(filters)) {
    //                   [total, rows] = await Promise.all([
    //                     knex
    //                       .count("* as count")
    //                       .from("asset_master")
    //                       .innerJoin(
    //                         "location_tags",
    //                         "asset_master.id",
    //                         "location_tags.entityId"
    //                       )
    //                       .innerJoin(
    //                         "location_tags_master",
    //                         "location_tags.locationTagId",
    //                         "location_tags_master.id"
    //                       )
    //                       .innerJoin(
    //                         "asset_category_master",
    //                         "asset_master.assetCategoryId",
    //                         "asset_category_master.id"
    //                       )
    //                       .first(),

    //                     knex("asset_master")
    //                       .innerJoin(
    //                         "location_tags",
    //                         "asset_master.id",
    //                         "location_tags.entityId"
    //                       )
    //                       .innerJoin(
    //                         "location_tags_master",
    //                         "location_tags.locationTagId",
    //                         "location_tags_master.id"
    //                       )
    //                       .innerJoin(
    //                         "asset_category_master",
    //                         "asset_master.assetCategoryId",
    //                         "asset_category_master.id"
    //                       )
    //                       .select([
    //                         "asset_master.assetName as Name",
    //                         "asset_master.id as ID",
    //                         "location_tags_master.title as Location",
    //                         "asset_master.model as Model",
    //                         "asset_master.barcode as Barcode",
    //                         "asset_master.areaName as Area",
    //                         "asset_category_master.categoryName as Category",
    //                         "asset_master.createdAt as Date Created"
    //                       ])
    //                       .offset(offset)
    //                       .limit(per_page)
    //                       .where({ 'asset_master.orgId': req.orgId })
    //                   ]);
    //               } else {
    //                   filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
    //                   try {
    //                       [total, rows] = await Promise.all([
    //                         knex
    //                           .count("* as count")
    //                           .from("asset_master")
    //                           .innerJoin(
    //                             "location_tags",
    //                             "asset_master.id",
    //                             "location_tags.entityId"
    //                           )
    //                           .innerJoin(
    //                             "location_tags_master",
    //                             "location_tags.locationTagId",
    //                             "location_tags_master.id"
    //                           )
    //                           .innerJoin(
    //                             "asset_category_master",
    //                             "asset_master.assetCategoryId",
    //                             "asset_category_master.id"
    //                           )
    //                           .where(filters)
    //                           .offset(offset)
    //                           .limit(per_page)
    //                           .first(),
    //                         knex("asset_master")
    //                           .innerJoin(
    //                             "location_tags",
    //                             "asset_master.id",
    //                             "location_tags.entityId"
    //                           )
    //                           .innerJoin(
    //                             "location_tags_master",
    //                             "location_tags.locationTagId",
    //                             "location_tags_master.id"
    //                           )
    //                           .innerJoin(
    //                             "asset_category_master",
    //                             "asset_master.assetCategoryId",
    //                             "asset_category_master.id"
    //                           )
    //                           .select([
    //                             "asset_master.assetName as Name",
    //                             "asset_master.id as ID",
    //                             "location_tags_master.title as Location",
    //                             "asset_master.model as Model",
    //                             "asset_master.barcode as Barcode",
    //                             "asset_master.areaName as Area",
    //                             "asset_category_master.categoryName as Category",
    //                             "asset_master.createdAt as Date Created"
    //                           ])
    //                           .where(filters)
    //                           .offset(offset)
    //                           .limit(per_page)
    //                           .where({ 'asset_master.orgId': req.orgId })
    //                       ]);
    //                   } catch (e) {
    //                       // Error
    //                       console.log('Error: ' + e.message)
    //                   }
    //               }
      
    //               var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
    //               var ws = XLSX.utils.json_to_sheet(rows);
    //               XLSX.utils.book_append_sheet(wb, ws, "pres");
    //               XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
    //               let filename = "uploads/AssetData-"+Date.now()+".csv";
    //               let  check = XLSX.writeFile(wb,filename);
      
    //               return res.status(200).json({
    //                   data:rows,
    //                   message:"Asset Data Export Successfully!"
    //               })
      
                  
      
    //           } catch (err) {
    //               console.log('[controllers][asset][getAssets] :  Error', err);
    //               res.status(500).json({
    //                 errors: [
    //                     { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
    //                 ],
    //             });
    //         }
    // },
    // DEPRECATED API
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
              let buildingIdResult = await knex("buildings_and_phases")
                .select("id")
                .where(qb => {
                    qb.where({ orgId: req.orgId });
                  qb.where(
                    "buildingPhaseCode",
                    "like",
                    `%${filters.buildingPhaseCode}%`
                  );
                })
                // .where({ orgId: req.orgId });
               if(buildingIdResult && buildingIdResult.length){
                   buildingId = buildingIdResult[0].id
               }
           }

           if(filters.companyName){
               let buildingIdResult = await knex("companies")
                 .select("id")
                 .where(qb => {
                     qb.where({ orgId: req.orgId });
                   qb.where("companyName", "like", `%${filters.companyName}%`);
                 })
                //  .where({ orgId: req.orgId });
               if (buildingIdResult && buildingIdResult.length) {
                   companyId = buildingIdResult[0].id
               }
           }
           if(filters.floorZoneCode){
               let buildingIdResult = await knex("floor_and_zones")
                 .select("id")
                 .where(qb => {
                     qb.where({ orgId: req.orgId });
                   qb.where(
                     "floorZoneCode",
                     "like",
                     `%${filters.floorZoneCode}%`
                   );
                 })
                //  .where({ orgId: req.orgId });
               if (buildingIdResult && buildingIdResult.length) {
                   floorId = buildingIdResult[0].id
               }
           }
           if(filters.projectName){
               let buildingIdResult = await knex("projects")
                 .select("id")
                 .where(qb => {
                     qb.where({ orgId: req.orgId });
                   qb.where("projectName", "like", `%${filters.projectName}%`);
                 })
                //  .where({ orgId: req.orgId });
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
              knex
                .count("* as count")
                .from("asset_master")
                .innerJoin(
                  "asset_location",
                  "asset_master.id",
                  "asset_location.assetId"
                )
                .select([
                  "asset_master.id as id",
                  "assetName",
                  "model",
                  "barcode",
                  "areaName"
                ])
                .where(condition)
                .where({ 'asset_master.orgId': req.orgId })
                // .where({ orgId: req.orgId })
                .groupBy(["asset_master.id", "asset_location.id"]),
              knex
                .from("asset_master")
                .innerJoin(
                  "asset_location",
                  "asset_master.id",
                  "asset_location.assetId"
                )
                .select([
                  "asset_master.id as id",
                  "assetName",
                  "model",
                  "barcode",
                  "areaName"
                ])
                .where({ 'asset_master.orgId': req.orgId })
                .where(condition)
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
    updateAssetLocation:async(req,res) => {
        try {
            const payload = _.omit(req.body,['previousLocationId']);
            let currentTime = new Date().getTime()
/*
{ assetId: '1655',
  companyId: '112',
  buildingId: '156',
  projectId: '48',
  unitId: '11',
  houseId: '9922',
  floorId: '165' }
*/
            await knex('asset_location')
            .update({ endDate: currentTime })
            .where({ assetId: payload.assetId })
          console.log('***********************ASSET LOCATION:***********************', req.body)
            // Deprecated
            let updatedLastLocationEndDate
            if (req.body.previousLocationId){

                updatedLastLocationEndDate = await knex("asset_location")
                  .update({ updatedAt: currentTime })
                  .where({ id: req.body.previousLocationId })
                  .where({ orgId: req.orgId });
            }

            // Deprecation end

            const updatedAsset = await knex("asset_location")
              .insert({
                ...payload,
                createdAt: currentTime,
                updatedAt: currentTime,
                startDate:currentTime,
                orgId: req.orgId
              })
              .returning(["*"])
            //   .where({ orgId: req.orgId });

            // UPDATE ASSET LOCATION  
            


            return res.status(200).json({
                data: {
                    updatedAsset,
                    updatedLastLocationEndDate
                },
                message:'Asset location updated'
            })
        } catch(err) {
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    exportAssetData:async(req,res)=>{
      try {
       

        const assetResult = await knex("asset_master")
          .leftJoin(
            "asset_category_master",
            "asset_master.assetCategoryId",
            "asset_category_master.id"
          )
          .select([
            "asset_master.assetCode as ASSET_CODE",
            "asset_master.assetName as ASSET_NAME",
            "asset_master.unitOfMeasure as UNIT_OF_MEASURE",
            "asset_master.model as MODEL_CODE",
            "asset_category_master.assetCategoryCode as ASSET_CATEGORY_CODE",
            "asset_category_master.categoryName as ASSET_CATEGORY_NAME"
          ])
          .where({ 'asset_master.orgId': req.orgId });
        let assets = assetResult









      let tempraryDirectory = null;
      let bucketName = null;
      if (process.env.IS_OFFLINE) {
        bucketName = "sls-app-resources-bucket";
        tempraryDirectory = "tmp/";
      } else {
        tempraryDirectory = "/tmp/";
        bucketName = process.env.S3_BUCKET_NAME;
      }

      var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });
      var ws = XLSX.utils.json_to_sheet(assets);
      XLSX.utils.book_append_sheet(wb, ws, "pres");
      XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
      let filename = "AssetData-" + Date.now() + ".csv";
      let filepath = tempraryDirectory + filename;
      let check = XLSX.writeFile(wb, filepath);
      const AWS = require("aws-sdk");
      fs.readFile(filepath, function(err, file_buffer) {
        var s3 = new AWS.S3();
        var params = {
          Bucket: bucketName,
          Key: "Export/Asset/" + filename,
          Body: file_buffer,
          ACL: "public-read"
        };
        s3.putObject(params, function(err, data) {
          if (err) {
            console.log("Error at uploadCSVFileOnS3Bucket function", err);
            //next(err);
            res.status(500).json({
              errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
          } else {
            console.log("File uploaded Successfully");

            //next(null, filePath);
            fs.unlink(filepath, err => {
              console.log("File Deleting Error " + err);
            });
            let url =
              "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Asset/" +
              filename;

            return res.status(200).json({
              data: {
                assets: assets
              },
              message: "Asset Data Export Successfully!",
              url: url
            });
          }
        });
      });






      } catch(err) {
        console.log(err)
        res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
      }
    },
   importAssetData: async (req, res) => {

    try {
      if (req.file) {
        console.log(req.file)
        let tempraryDirectory = null;
        if (process.env.IS_OFFLINE) {
          tempraryDirectory = 'tmp/';
        } else {
          tempraryDirectory = '/tmp/';
        }
        let resultData = null;
        let file_path = tempraryDirectory + req.file.filename;
        let wb = XLSX.readFile(file_path, { type: "base64" });
        let ws = wb.Sheets[wb.SheetNames[0]];
        let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });
        //data         = JSON.stringify(data);
        console.log("+++++++++++++", data, "=========")
        let totalData = data.length - 1;
        let fail = 0;
        let success = 0;
        let result = null;

        if (data[0].A == "ASSET_CODE" || data[0].A == "Ã¯Â»Â¿ASSET_CODE" &&
          data[0].B == "ASSET_NAME" &&
          data[0].C == "UNIT_OF_MEASURE" &&
          data[0].D == "MODEL_CODE" &&
          data[0].E == "ASSET_CATEGORY_CODE" &&
          data[0].F == "ASSET_CATEGORY_NAME"
          // data[0].G == "CONTACT_PERSON" &&
          // data[0].H == "STATUS"
        ) {

          if (data.length > 0) {

            let i = 0;
            for (let assetData of data) {
              i++;

              if (i > 1) {
                //let currentTime = new Date().getTime()
                // let checkExist = await knex('asset_master').select('companyName')
                //   .where({ companyName: assetData.B, orgId: req.orgId })
                //   console.log("Check list company: ", checkExist);
                //if (checkExist.length < 1) {

                  // Check if this asset category exists
                  // if not create new and put that id
                  let assetCategoryId = ''
                  const cat = await knex('asset_category_master').where({categoryName:assetData.F,orgId:req.orgId}).select('id')
                  if(cat && cat.length) {
                    assetCategoryId = cat[0].id;
                  } else {
                    const catResult = await knex('asset_category_master').insert({categoryName:assetData.F,assetCategoryCode:assetData.E,orgId:req.orgId}).returning(['id'])
                    assetCategoryId = catResult[0].id;
                  }

                  let currentTime = new Date().getTime();
                  let insertData = {
                    orgId: req.orgId,
                    assetCode: assetData.A,
                    assetName: assetData.B,
                    unitOfMeasure: assetData.C,
                    model: assetData.D,
                    assetCategoryId,
                    isActive: true,
                    createdAt: currentTime,
                    updatedAt: currentTime
                  }

                  resultData = await knex.insert(insertData).returning(['*']).into('asset_master');

                  if (resultData && resultData.length) {
                    success++;
                  }
                // } else {
                //   fail++;
                // }
              }
            }
            let message = null;
            if (totalData == success) {
              message = "system has processed ( " + totalData + " ) entries and added them successfully!";
            } else {
              message = "system has processed ( " + totalData + " ) entries out of which only ( " + success + " ) are added";
            }
            let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
            return res.status(200).json({
              message: message,
            });
          }

        } else {

          return res.status(400).json({
            errors: [
              { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            ]
          });
        }
      } else {

        return res.status(400).json({
          errors: [
            { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
          ]
        });

      }

    } catch (err) {
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetListByHouseId:async(req,res) => {
    try{
      let houseId = req.body.houseId;
      let reqData = req.query
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;


      [total, rows] = await Promise.all([
        knex("asset_location")
          .leftJoin("asset_master", "asset_location.assetId", "asset_master.id")
          .leftJoin('companies', 'asset_location.companyId', 'companies.id')
          .leftJoin('projects', 'asset_location.projectId', 'projects.id')
          .leftJoin('buildings_and_phases', 'asset_location.buildingId', 'buildings_and_phases.id')
          .leftJoin('floor_and_zones', 'asset_location.floorId', 'floor_and_zones.id')
          .leftJoin('property_units', 'asset_location.unitId', 'property_units.id')
          .select([
            "asset_master.assetName as assetName",
            "asset_master.id as id",
            'companies.companyName',
            'companies.id as companyId',
            'projects.projectName as projectName',
            'projects.id as projectId',
            'buildings_and_phases.buildingPhaseCode as buildingPhaseCode',
            'buildings_and_phases.id as buildingId',
            'floor_and_zones.floorZoneCode as floorZoneCode',
            'floor_and_zones.id as floorId',
            'property_units.unitNumber as unitNumber',
            'property_units.id as unitId',
            'property_units.houseId as houseId'
          ])
          .where({
            "asset_location.houseId": houseId,
            "asset_master.orgId": req.orgId,
            "asset_location.endDate":null,
          }),
        knex("asset_location")
          .leftJoin("asset_master", "asset_location.assetId", "asset_master.id")
          .leftJoin('companies', 'asset_location.companyId', 'companies.id')
          .leftJoin('projects', 'asset_location.projectId', 'projects.id')
          .leftJoin('buildings_and_phases', 'asset_location.buildingId', 'buildings_and_phases.id')
          .leftJoin('floor_and_zones', 'asset_location.floorId', 'floor_and_zones.id')
          .leftJoin('property_units', 'asset_location.unitId', 'property_units.id')
          .select([
            "asset_master.assetName as assetName",
            "asset_master.id as id",
            'companies.companyName',
            'companies.id as companyId',
            'projects.projectName as projectName',
            'projects.id as projectId',
            'buildings_and_phases.buildingPhaseCode as buildingPhaseCode',
            'buildings_and_phases.id as buildingId',
            'floor_and_zones.floorZoneCode as floorZoneCode',
            'floor_and_zones.id as floorId',
            'property_units.unitNumber as unitNumber',
            'property_units.id as unitId',
            'property_units.houseId as houseId'
          ])
          .where({
            "asset_location.houseId": houseId,
            "asset_master.orgId": req.orgId,
            "asset_location.endDate": null,
          }).offset(offset).limit(per_page)
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
          asset:pagination
        },
        message:'Asset locations'
      })
    } catch(err) {
      console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
      //trx.rollback
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getServiceRequestRelocatedAssets:async(req,res) => {
    try {
      const {serviceRequestId} = req.body;

      let assets = await knex("asset_location")
        .innerJoin("asset_master", "asset_location.assetId", "asset_master.id")
        .innerJoin("companies", "asset_location.companyId", "companies.id")
        .innerJoin("projects", "asset_location.projectId", "projects.id")
        .innerJoin("buildings_and_phases", "asset_location.buildingId","buildings_and_phases.id")
        .innerJoin('property_units', 'asset_location.unitId','property_units.id')
        .select([
          "asset_master.id as id",
          "asset_master.assetName as assetName",
          "companies.companyName as companyName",
          "projects.projectName as projectName",
          "buildings_and_phases.buildingPhaseCode as buildingPhaseCode",
          "property_units.unitNumber as unitNumber",
          "property_units.houseId as houseId",
          "asset_location.createdAt as createdAt",
          "asset_location.updatedAt as updatedAt"
        ])
        .where({ serviceRequestId })
        .orderBy("asset_location.createdAt", "desc");

      return res.status(200).json({data: {assets}})
    } catch(err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  replaceAsset:async(req,res) => {
    try {
      let replaced
      let location_update
      let {oldAssetId,newAssetId,serviceRequestId,newAssetLocation} = req.body;
      let currentTime = new Date().getTime()
      await Promise.all([
        knex('asset_location')
          .update({ endDate: currentTime,serviceRequestId })
          .where({ assetId: oldAssetId, orgId: req.orgId }),
        knex('asset_location')
          .insert({ assetId: oldAssetId, startDate: currentTime, orgId: req.orgId })
      ])

      replaced = await knex('replaced_assets')
        .insert({
          oldAssetId,
          newAssetId,
          startDate: currentTime,
          // endDate: currentTime,
          entityId: serviceRequestId,
          entityType: 'service_requests',
          orgId: req.orgId,
          createdAt: currentTime,
          updatedAt: currentTime
        })
      location_update = await knex('asset_location')
      .insert({...newAssetLocation,assetId:newAssetId,createdAt:currentTime,updatedAt:currentTime,serviceRequestId,startDate:currentTime,orgId:req.orgId,serviceRequestId})
      // Change the old asset location to null
      

      return res.status(200).json({
        data: {
          replaced,
          location_update
        }
      })
    } catch(err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getReplacedAssetList:async(req,res) => {
    try {
      let {serviceRequestId} = req.body;
      let replacedAssetList

      replacedAssetList = await knex('replaced_assets')
      .select([
        'oldAssetId',
        'newAssetId',
        'startDate',
        'endDate'
      ])
      .where({
        'replaced_assets.entityId': serviceRequestId,
        'replaced_assets.entityType':'service_requests'
      })

      const Parallel = require("async-parallel")
      const assetNames = await Parallel.map(replacedAssetList, async item => {
        let {oldAssetId,newAssetId} = item;
        let old = await knex('asset_master').select('assetName').where({id:oldAssetId}).first()
        let newa = await knex('asset_master').select('assetName').where({id:newAssetId}).first()
        return ({ oldAssetName: old.assetName, newAssetName: newa.assetName,...item})
      })


      return res.status(200).json({
        data: {
          replacedAssetList: assetNames
        }
      })

    } catch(err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  },
  getAssetListForReplace:async(req,res) => {
    try {
      let reqData = req.query
      let total, rows;
      let pagination = {};
      let per_page = reqData.per_page || 10;
      let page = reqData.current_page || 1;
      if (page < 1) page = 1;
      let offset = (page - 1) * per_page;

      [total,rows] = await Promise.all([
      knex('asset_master')
      .leftJoin('asset_location','asset_location.assetId','asset_master.id')
      .leftJoin('companies','asset_location.companyId','companies.id')
      .leftJoin('projects', 'asset_location.projectId','projects.id')
      .leftJoin('buildings_and_phases', 'asset_location.buildingId','buildings_and_phases.id')
      .leftJoin('floor_and_zones','asset_location.floorId','floor_and_zones.id')
      .leftJoin('property_units','asset_location.unitId','property_units.id')
      .select([
        'asset_master.id as id',
        'asset_master.assetName',
        'companies.companyName',
        'companies.id as companyId',
        'projects.projectName as projectName',
        'projects.id as projectId',
        'buildings_and_phases.buildingPhaseCode as buildingPhaseCode',
        'buildings_and_phases.id as buildingId',
        'floor_and_zones.floorZoneCode as floorZoneCode',
        'floor_and_zones.id as floorId',
        'property_units.unitNumber as unitNumber',
        'property_units.id as unitId',
        'property_units.houseId as houseId'
      ]).distinct(['asset_location.assetId'])
      .where({'asset_master.orgId':req.orgId}),
        knex('asset_master')
          .leftJoin('asset_location', 'asset_location.assetId', 'asset_master.id')
          .leftJoin('companies', 'asset_location.companyId', 'companies.id')
          .leftJoin('projects', 'asset_location.projectId', 'projects.id')
          .leftJoin('buildings_and_phases', 'asset_location.buildingId', 'buildings_and_phases.id')
          .leftJoin('floor_and_zones', 'asset_location.floorId', 'floor_and_zones.id')
          .leftJoin('property_units', 'asset_location.unitId', 'property_units.id')
          .select([
            'asset_master.id as id',
            'asset_master.assetName',
            'companies.companyName',
            'projects.projectName as projectName',
            'buildings_and_phases.buildingPhaseCode as buildingPhaseCode',
            'floor_and_zones.floorZoneCode as floorZoneCode',
            'property_units.unitNumber as unitNumber',
            'property_units.houseId as houseId'
          ])
          .distinct(['asset_location.assetId'])
          .where({ 'asset_master.orgId': req.orgId })
          .offset(offset)
          .limit(per_page)
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
          assets:pagination
        }
      })
    } catch(err) {
      res.status(500).json({
        errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
      });
    }
  }
}

module.exports = assetController;

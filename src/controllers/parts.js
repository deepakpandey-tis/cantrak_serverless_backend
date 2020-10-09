const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');
const fs = require("fs")
const QRCode = require('qrcode')
const uuid = require('uuid/v4')
const moment = require('moment');


const partsController = {
    getParts: async(req, res) => {
        try {

            let projectIds = [];
            const accessibleProjects = req.userProjectResources;

            if (accessibleProjects.length) {
                for (let pro of accessibleProjects) {

                    if (pro.projects.length) {

                        for (let projectId of pro.projects) {
                            console.log("project=========", pro.projects, "===========================================")

                            projectIds.push(projectId);
                        }
                    }
                }
            }

            projectIds = _.uniqBy(projectIds);

            let companyResult = await knex.from('projects').select(['companyId', 'projectName', 'project as projectCode'])
                .whereIn('projects.id', projectIds)
                .where({ orgId: req.orgId });

            let companyIds = companyResult.map(v => v.companyId);


            let partData = null;
            let reqData = req.query;
            let total, rows
            let pagination = {};


            let {
                partName,
                partCode,
                partCategory,
                partId,
                company
            } = req.body;

            if (partName || partCode || partCategory || partId || company) {

                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;
                [total, rows] = await Promise.all([
                    knex.from("part_master")
                    .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                    .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                    .where(qb => {
                        if (partName) {
                            qb.where('part_master.partName', 'iLIKE', `%${partName}%`)
                        }
                        if (partCode) {
                            qb.where('part_master.partCode', 'iLIKE', `%${partCode}%`)

                        }
                        if (partCategory) {
                            qb.where('part_master.partCategory', partCategory)
                        }
                        if (partId) {
                            qb.where({ 'part_master.displayId': partId })
                        }
                        if (company) {
                            qb.where({ 'part_master.companyId': company })
                        }
                    })
                    .whereIn('part_master.companyId', companyIds)
                    .groupBy(['part_master.id'])
                    .distinct('part_master.id'),
                    //.first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_master')
                    .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                    .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
                    .leftJoin('companies', 'part_master.companyId', 'companies.id')
                    .select([
                        'part_master.id as partId',
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        knex.raw('SUM("part_ledger"."quantity") as Quantity'),
                        knex.raw('MAX("part_ledger"."unitCost") as Price'),
                        'part_master.unitOfMeasure',
                        'part_category_master.categoryName as Category',
                        'part_master.barcode as Barcode',
                        'part_master.createdAt as Date Added',
                        'part_master.isActive',
                        'part_master.displayId as PNo',
                        "companies.companyName",
                        "companies.companyId",
                    ])
                    .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                    .where(qb => {
                        if (partName) {
                            qb.where('part_master.partName', 'iLIKE', `%${partName}%`)
                        }
                        if (partCode) {
                            qb.where('part_master.partCode', 'iLIKE', `%${partCode}%`)

                        }
                        if (partCategory) {
                            qb.where('part_master.partCategory', partCategory)
                        }
                        if (partId) {
                            qb.where({ 'part_master.displayId': partId })
                        }
                        if (company) {
                            qb.where({ 'part_master.companyId': company })
                        }
                    })
                    .whereIn('part_master.companyId', companyIds)
                    .orderBy('part_master.createdAt', 'desc')
                    .groupBy(['part_master.id', 'companies.companyId', 'companies.companyName', 'part_category_master.id'])
                    .distinct('part_master.id')
                    .offset(offset).limit(per_page)
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


            } else {

                let per_page = reqData.per_page || 10;
                let page = reqData.current_page || 1;
                if (page < 1) page = 1;
                let offset = (page - 1) * per_page;

                [total, rows] = await Promise.all([
                    knex.from("part_master")
                    .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id').where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                    .whereIn('part_master.companyId', companyIds)
                    .groupBy(['part_master.id'])
                    .distinct('part_master.id'),
                    //.first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_master')
                    .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                    .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
                    .leftJoin('companies', 'part_master.companyId', 'companies.id')
                    .select([
                        'part_master.id as partId',
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        knex.raw('SUM("part_ledger"."quantity") as Quantity'),
                        knex.raw('MAX("part_ledger"."unitCost") as Price'),
                        'part_master.unitOfMeasure',
                        'part_category_master.categoryName as Category',
                        'part_master.barcode as Barcode',
                        'part_master.createdAt as Date Added',
                        'part_master.isActive',
                        'part_master.displayId as PNo',
                        "companies.companyName",
                        "companies.companyId",
                    ])
                    .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                    .whereIn('part_master.companyId', companyIds)
                    .orderBy('part_master.createdAt', 'desc')
                    .groupBy(['part_master.id', 'companies.companyId', 'companies.companyName', 'part_category_master.id'])
                    .distinct('part_master.id')
                    .offset(offset).limit(per_page)
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

            }

            return res.status(200).json({
                data: {
                    parts: pagination,
                    accessibleProjects,
                    companyIds,
                    companyResult,
                    projectIds,

                },
                message: 'Parts List!'
            })

        } catch (err) {
            console.log('[controllers][parts][getParts] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addParts: async(req, res) => {
        try {

            let part = null;
            let attribs = []
            let files = [];
            let images = [];
            let quantityObject;

            await knex.transaction(async(trx) => {
                let partPayload = req.body;
                let payload = req.body;
                console.log('[controllers][part][addParts]', partPayload);
                partPayload = _.omit(partPayload, ['minimumQuantity'], ['unitOfMeasure'], ['barcode'], ['image_url'], ['file_url'], 'quantity', 'unitCost', ['additionalAttributes'], ['images'], ['files'], ['additionalDescription'], 'partDescription', ['assignedVendors'], ['additionalPartDetails'], ['partId'], 'vendorId', 'additionalVendorId', 'teamId', 'mainUserId', 'additionalUsers')
                    // validate keys
                const schema = Joi.object().keys({
                    partName: Joi.string().required(),
                    partCode: Joi.string().required(),
                    partCategory: Joi.string().required(),
                    companyId: Joi.string().required(),
                });

                let result = Joi.validate(partPayload, schema);
                console.log('[controllers][part][addParts]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }


                let insertDataObj = {
                    "partName": payload.partName,
                    "partCode": payload.partCode,
                    "unitOfMeasure": payload.unitOfMeasure,
                    "minimumQuantity": payload.minimumQuantity ? payload.minimumQuantity : null,
                    "partDescription": payload.partDescription,
                    "partCategory": payload.partCategory,
                    "barcode": payload.barcode,
                    "assignedVendors": payload.assignedVendors ? payload.assignedVendors : null,
                    "additionalPartDetails": payload.additionalPartDetails,
                    "companyId": payload.companyId
                }


                // Insert in part_master table,
                let currentTime = new Date().getTime();

                let insertData = {...insertDataObj, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId, uuid: uuid() };

                console.log('[controllers][part][addParts]: Insert Data', insertData);

                let partResult

                if (req.body.partId) {
                    partResult = await knex.update(insertData).where({ id: req.body.partId }).returning(['*']).transacting(trx).into('part_master');
                } else {
                    partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('part_master');
                }

                part = partResult[0];


                // Insert unitCost and quantity in part_ledger table

                let unitCost = req.body.unitCost;
                let quantity = req.body.quantity
                    // let quantitySchema = Joi.object().keys({
                    //     unitCost: Joi.number().required(),
                    //     quantity: Joi.number().required(),
                    // })
                    // let quantityResult = Joi.validate({ unitCost, quantity }, quantitySchema);
                    // console.log('[controllers][part][addParts]: JOi Result', result);

                // if (quantityResult && quantityResult.hasOwnProperty('error') && quantityResult.error) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: 'VALIDATION_ERROR', message: quantityResult.error.message }
                //         ],
                //     });
                // }
                let quantityObject;

                if (unitCost || quantity) {
                    unitCost = unitCost ? unitCost : null;
                    quantity = quantity ? quantity : null;
                    let insertD = {
                        unitCost: unitCost,
                        quantity: quantity
                    }

                    let quantityData = { partId: part.id, unitCost, quantity, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId };
                    let partQuantityResult = await knex.insert(quantityData).returning(['*']).transacting(trx).into('part_ledger');

                    quantityObject = _.omit(partQuantityResult[0], ['id'], ['partId']);

                }
                // Insert attributes in part_attributes table

                let additionalAttributes = req.body.additionalAttributes;
                //console.log(additionalAttributes)
                if (additionalAttributes && additionalAttributes.length > 0) {


                    for (attribute of additionalAttributes) {

                        let d = await knex.insert({ partId: part.id, ...attribute, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('part_attributes');
                        attribs.push(d[0])

                    }
                }

                // Insert images in images table
                let imagesData = req.body.images;
                if (imagesData && imagesData.length > 0) {

                    for (image of imagesData) {
                        let d = await knex.insert({ entityId: part.id, ...image, entityType: 'part_master', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('images');
                        images.push(d[0])
                    }

                }

                // Insert files in files table
                let filesData = req.body.files;
                if (filesData && filesData.length > 0) {

                    for (file of filesData) {
                        let d = await knex.insert({ entityId: part.id, ...file, entityType: 'part_master', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('files');
                        files.push(d[0])
                    }

                }


                // Insert Vendors in Assigned vendors table
                let vendorsPData = req.body.vendorId;
                let vendorsADData = req.body.additionalVendorId;
                if (vendorsPData || vendorsADData) {

                    // Insert Primary Vendor Data
                    if (vendorsPData) {
                        let finalVendors = {
                            entityId: part.id,
                            entityType: 'parts',
                            isPrimaryVendor: true,
                            userId: vendorsPData,
                            createdAt: currentTime,
                            updatedAt: currentTime,
                            orgId: req.orgId
                        };
                        let d = await knex
                            .insert(finalVendors)
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_vendors")
                            //.where({ orgId: req.orgId });            
                    }
                    // Insert Secondary Vendor Data
                    if (vendorsADData) {
                        let finalADVendors = {
                            entityId: part.id,
                            userId: vendorsADData,
                            entityType: 'parts',
                            isPrimaryVendor: false,
                            createdAt: currentTime,
                            updatedAt: currentTime,
                            orgId: req.orgId
                        };
                        let d = await knex
                            .insert(finalADVendors)
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_vendors")
                            //.where({ orgId: req.orgId });           
                    }
                }

                // Insert Parts in Assigned Teams table

                // Insert into assigned_service_team table
                let { teamId, mainUserId, additionalUsers } = req.body;
                assignedServiceAdditionalUsers = additionalUsers

                const assignedServiceTeamPayload = { teamId, userId: mainUserId, entityId: part.id, entityType: 'parts', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }
                let assignedServiceTeamResult;
                if (assignedServiceTeamPayload.teamId) {
                    assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                    let assignedServiceTeam = assignedServiceTeamResult[0]
                }

                if (assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length) {
                    for (user of assignedServiceAdditionalUsers) {
                        await knex
                            .insert({
                                userId: user,
                                entityId: part.id,
                                entityType: "parts",
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            })
                            .returning(["*"])
                            .transacting(trx)
                            .into("assigned_service_additional_users");
                    }
                }


                trx.commit;
            });


            const update = await knex('part_master').update({ isActive: true }).where({ orgId: req.orgId, isActive: true }).returning(['*'])

            res.status(200).json({
                data: {
                    part: {...part, ...quantityObject, attributes: attribs, files, images }
                },
                message: "Part added successfully !"
            });

        } catch (err) {
            console.log('[controllers][part] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    updatePartDetails: async(req, res) => {
        try {

            let partDetails = null;
            let attribs = [];
            let images = [];
            let additionalUsers = [];


            await knex.transaction(async(trx) => {
                const partDetailsPayload = req.body;
                console.log('[controllers][part][updatePartDetails]', partDetailsPayload);
                partPayload = _.omit(partDetailsPayload, ['images'], ['files'], ['minimumQuantity'], ['unitOfMeasure'], ['barcode'], ['image_url'], ['file_url'], ['additionalPartDetails'], ['assignedVendors'], ['partDescription'], ['id'], ['quantity'], ['unitCost'], ['additionalAttributes'], 'vendorId', 'additionalVendorId', 'teamId', 'mainUserId', 'additionalUsers')

                // validate keys
                const schema = Joi.object().keys({
                    partName: Joi.string().required(),
                    partCode: Joi.string().required(),
                    partCategory: Joi.string().required(),
                    companyId: Joi.string().required(),
                });

                const result = Joi.validate(partPayload, schema);
                console.log('[controllers][part][updatePartDetails]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Update in part_master table,
                const currentTime = new Date().getTime();

                const updatePartDetails = await knex.update({
                    unitOfMeasure: partDetailsPayload.unitOfMeasure,
                    partName: partDetailsPayload.partName,
                    partCode: partDetailsPayload.partCode,
                    partDescription: partDetailsPayload.partDescription,
                    partCategory: partDetailsPayload.partCategory,
                    minimumQuantity: partDetailsPayload.minimumQuantity,
                    barcode: partDetailsPayload.barcode,
                    assignedVendors: partDetailsPayload.assignedVendors,
                    additionalPartDetails: partDetailsPayload.additionalPartDetails,
                    updatedAt: currentTime,
                    isActive: true,
                    companyId: partDetailsPayload.companyId
                }).where({ id: partDetailsPayload.id, orgId: req.orgId }).returning(['*']).transacting(trx).into('part_master');

                console.log('[controllers][part][updatePartDetails]: Update Part Details', updatePartDetails);

                partDetails = updatePartDetails[0];

                let unitCost = req.body.unitCost;
                let quantity = req.body.quantity


                let quantityData = { unitCost, quantity, updatedAt: currentTime };
                let partQuantityResult = await knex.update(quantityData).where({ partId: partDetailsPayload.id }).returning(['*']).transacting(trx).into('part_ledger');

                quantityObject = _.omit(partQuantityResult[0], ['id'], ['partId']);


                let additionalAttributes = req.body.additionalAttributes;
                console.log(additionalAttributes)
                if (additionalAttributes.length > 0) {

                    let delAttribute = await knex.from('part_attributes').where({ partId: partDetailsPayload.id }).del();

                    for (attribute of additionalAttributes) {
                        console.log('attribute: ', attribute)
                        let d = await knex.insert({ partId: partDetailsPayload.id, ...attribute, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('part_attributes');
                        //let d = await knex.update({ ...attribute, updatedAt: currentTime }).where({ id: attribute.id, partId: partDetailsPayload.id }).returning(['*']).transacting(trx).into('part_attributes');
                        attribs.push(d[0])
                    }
                }

                //

                // Insert images in images table
                let imagesData = req.body.images;
                if (imagesData && imagesData.length > 0) {

                    for (image of imagesData) {
                        let d = await knex.insert({ entityId: partDetailsPayload.id, ...image, entityType: 'part_master', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('images');
                        images.push(d[0])
                    }

                }

                // Insert files in files table
                let filesData = req.body.files;
                if (filesData && filesData.length > 0) {

                    for (file of filesData) {
                        let d = await knex.insert({ entityId: partDetailsPayload.id, ...file, entityType: 'part_master', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }).returning(['*']).transacting(trx).into('files');
                        files.push(d[0])
                    }

                }
                //

                // Insert Vendors in Assigned vendors table
                let vendorsPData = req.body.vendorId;
                let vendorsADData = req.body.additionalVendorId;

                if (vendorsPData || vendorsADData) {

                    // Insert Primary Vendor Data
                    if (vendorsPData) {
                        getPrimaryVendorExist = await knex("assigned_vendors")
                            .where({
                                entityId: partDetailsPayload.id,
                                entityType: "parts",
                                orgId: req.orgId,
                                isPrimaryVendor: true,
                            })
                            .select('*');
                        console.log("assignedVendors", getPrimaryVendorExist);

                        if (getPrimaryVendorExist) {

                            let finalVendors = {
                                entityId: partDetailsPayload.id,
                                entityType: 'parts',
                                isPrimaryVendor: true,
                                userId: vendorsPData,
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            };

                            let d = await knex
                                .update(finalVendors)
                                .where({
                                    entityId: partDetailsPayload.id,
                                    entityType: "parts",
                                    orgId: req.orgId,
                                    isPrimaryVendor: true,
                                })
                                .returning(["*"])
                                .transacting(trx)
                                .into("assigned_vendors")
                        } else {

                            let finalVendors = {
                                entityId: partDetailsPayload.id,
                                entityType: 'parts',
                                isPrimaryVendor: true,
                                userId: vendorsPData,
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            };

                            let d = await knex
                                .insert(finalVendors)
                                .returning(["*"])
                                .transacting(trx)
                                .into("assigned_vendors")
                                //.where({ orgId: req.orgId });            
                        }
                    }


                    // Insert Secondary Vendor Data
                    if (vendorsADData) {

                        getAdditionalVendorExist = await knex("assigned_vendors")
                            .where({
                                entityId: partDetailsPayload.id,
                                entityType: "parts",
                                orgId: req.orgId,
                                isPrimaryVendor: false,
                            })
                            .select('*');

                        if (getAdditionalVendorExist) {

                            let finalADVendors = {
                                entityId: partDetailsPayload.id,
                                entityType: 'parts',
                                isPrimaryVendor: false,
                                userId: vendorsADData,
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            };

                            let d = await knex
                                .update(finalADVendors)
                                .where({
                                    entityId: partDetailsPayload.id,
                                    entityType: "parts",
                                    orgId: req.orgId,
                                    isPrimaryVendor: false,
                                })
                                .returning(["*"])
                                .transacting(trx)
                                .into("assigned_vendors")

                        } else {

                            let finalADVendors = {
                                entityId: partDetailsPayload.id,
                                userId: vendorsADData,
                                entityType: 'parts',
                                isPrimaryVendor: false,
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                orgId: req.orgId
                            };

                            let d = await knex
                                .insert(finalADVendors)
                                .returning(["*"])
                                .transacting(trx)
                                .into("assigned_vendors")
                                //.where({ orgId: req.orgId });  
                        }
                    }
                }
                //


                // Insert Parts in Assigned Teams table

                // Insert into assigned_service_team table
                let { teamId, mainUserId, additionalUsers } = req.body;
                assignedServiceAdditionalUsers = additionalUsers


                const assignedServiceTeamPayload = { teamId, userId: mainUserId, entityId: partDetailsPayload.id, entityType: 'parts', createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId }

                let checkPartTeamExist = await knex("assigned_service_team")
                    .where({
                        entityId: partDetailsPayload.id,
                        entityType: "parts",
                        orgId: req.orgId,
                    })
                    .select('*');

                if (checkPartTeamExist && assignedServiceTeamPayload.teamId) {
                    let updateTeam = await knex
                        .update(assignedServiceTeamPayload)
                        .where({
                            entityId: partDetailsPayload.id,
                            entityType: "parts",
                            orgId: req.orgId,
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_service_team")
                } else {

                    if (assignedServiceTeamPayload.teamId) {
                        let assignedServiceTeamResult = await knex.insert(assignedServiceTeamPayload).returning(['*']).transacting(trx).into('assigned_service_team')
                        let assignedServiceTeam = assignedServiceTeamResult[0]
                    }
                }


                let selectedUsers = await knex
                    .select('*')
                    .where({
                        entityId: partDetailsPayload.id,
                        entityType: "parts",
                        orgId: req.orgId
                    })
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_service_additional_users")


                console.log("selectedUser", selectedUsers);


                if (_.isEqual(selectedUsers, assignedServiceAdditionalUsers)) {} else {
                    if (assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length) {

                        // Remove old users

                        for (user of selectedUsers) {
                            await knex
                                .del()
                                .where({
                                    entityId: partDetailsPayload.id,
                                    entityType: "parts",
                                    orgId: req.orgId
                                })
                                .returning(["*"])
                                .transacting(trx)
                                .into("assigned_service_additional_users");
                        }

                        // Insert New Users  

                        for (user of assignedServiceAdditionalUsers) {
                            await knex
                                .insert({
                                    userId: user,
                                    entityId: partDetailsPayload.id,
                                    entityType: "parts",
                                    createdAt: currentTime,
                                    updatedAt: currentTime,
                                    orgId: req.orgId
                                })
                                .returning(["*"])
                                .transacting(trx)
                                .into("assigned_service_additional_users");
                        }
                    }
                }

                trx.commit;
            });

            res.status(200).json({
                data: {
                    partDetails: {...partDetails, additionalAttributes: attribs }
                },
                message: "Part details updated successfully !"
            });

        } catch (err) {
            console.log('[controllers][service][request] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    getPartDetails: async(req, res) => {
        try {

            let partData = null;
            let additionalAttributes = null;
            let partQuantityData = null
            let files = null;
            let images = null;
            let id = req.body.id;
            let qrcode = ''
            let quantityResult;

            qrcode = await QRCode.toDataURL('org-' + req.orgId + '-part-' + id)


            partData = await knex('part_master')
                .leftJoin('vendor_master', 'part_master.assignedVendors', 'vendor_master.id')
                .where({ 'part_master.id': id }).select('part_master.*', 'vendor_master.name')
            let partDataResult = partData[0];
            let omitedPartDataResult = _.omit(partDataResult, ['createdAt'], ['updatedAt'], ['isActive'])
            additionalAttributes = await knex('part_attributes').where({ partId: id }).select()
            partQuantityData = await knex('part_ledger')
                .where({ partId: id }).select(
                    'unitCost',
                    'quantity'
                ).orderBy('id', 'desc')
            let partQuantityDataResult = partQuantityData


            quantityResult = await knex.from('part_ledger')
                .sum('quantity as quantity')
                .where({ partId: id, orgId: req.orgId }).first();


            let totalQuantity = 0;

            if (quantityResult) {
                totalQuantity = quantityResult.quantity;
            }
            // for (let i = 0; i < partQuantityDataResult.length; i++) {
            //     totalQuantity += parseInt(partQuantityDataResult[i].quantity)
            // }
            let totalUnitCost = 0;

            // for (let i = 0; i < partQuantityDataResult.length; i++) {
            //     totalUnitCost += parseInt(partQuantityDataResult[i].unitCost)
            // }

            files = await knex('files').where({ entityId: id, entityType: 'part_master' }).select()
            images = await knex('images').where({ entityId: id, entityType: 'part_master' }).select()

            console.log('[controllers][parts][getPartDetails]: Part Details', partData);

            if (partQuantityDataResult[0]) {
                return res.status(200).json({
                    data: { part: { quantity: totalQuantity, unitCost: partQuantityDataResult[0].unitCost, ...omitedPartDataResult, additionalAttributes, images, files, qrcode } },
                    message: "Part Details",
                    quantityResult
                });
            }

            return res.status(200).json({
                data: { part: { quantity: totalQuantity, unitCost: '', ...omitedPartDataResult, additionalAttributes, images, files, qrcode } },
                message: "Part Details"
            });


        } catch (err) {
            console.log('[controllers][part][Details] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    addPartStock: async(req, res) => {

        try {

            let partStock = null;


            await knex.transaction(async(trx) => {
                const currentTime1 = new Date().getTime();
                let partStockPayload = _.omit(req.body, 'date');
                console.log('[controllers][part][stock]', partStockPayload);
                // validate keys
                let result;
                if (partStockPayload.adjustType == "1" || partStockPayload.adjustType == "3") {

                    let issueById;
                    let issueToId;
                    let receiveBy;
                    let deductBy;

                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        serviceOrderNo: Joi.number().allow("").allow(null).optional(),
                        isPartAdded: Joi.string().required(),
                        issueBy: Joi.string().allow("").allow(null).optional(),
                        issueTo: Joi.string().allow("").allow(null).optional(),
                        name: Joi.string().allow("").allow(null).optional(),
                        email: Joi.string().allow("").allow(null).optional(),
                        mobile: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),
                        deductBy: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        receiveBy: Joi.string().allow("").allow(null).optional(),
                    });

                    // Validate Service Order No
                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;
                    let validSRMaster = await knex('service_orders').where({ displayId: partStockPayload.serviceOrderNo, companyId: companyMasterId, orgId: req.orgId }).returning(['*']).first();
                    //console.log("validSRMaster", validSRMaster);
                    if (validSRMaster) {
                        result = Joi.validate(_.omit(partStockPayload, 'receiveFrom', 'storeAdjustmentBy', 'description', 'date', 'workOrderId', 'receiveDate', 'returnedBy', 'deductTo', 'deductDate', 'building', 'floor'), schema);
                        if (partStockPayload.adjustType == "1") {

                            // Issue By Id Manage with Manually and Select from list

                            if (partStockPayload.name || partStockPayload.email || partStockPayload.mobile) {

                                let requestByData = await knex('adjust_part_users')
                                    .where({ name: partStockPayload.name, orgId: req.orgId })
                                    .orWhere({ mobile: partStockPayload.mobile })
                                    .orWhere({ email: partStockPayload.email })
                                    .returning(['*']);

                                if (requestByData && requestByData.length) {
                                    requestedByResult = requestByData;
                                    issueById = requestedByResult[0].id;
                                } else {

                                    requestedByResult = await knex('adjust_part_users').insert({
                                        name: partStockPayload.name,
                                        mobile: partStockPayload.mobile,
                                        email: partStockPayload.email,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: req.orgId
                                    }).returning(['*'])
                                    issueById = requestedByResult[0].id;
                                }
                            } else {

                                let usersData = await knex('users').where({ id: partStockPayload.issueBy, orgId: req.orgId }).returning(['*']).first();
                                let issuedByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                                if (issuedByData && issuedByData.length) {
                                    issuedByDataResult = issuedByData;
                                    issueById = issuedByDataResult[0].id;
                                } else {
                                    issuedByDataResult = await knex('adjust_part_users').insert({
                                        name: usersData.name,
                                        mobile: usersData.mobileNo,
                                        email: usersData.email,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: usersData.orgId
                                    }).returning(['*'])
                                    issueById = issuedByDataResult[0].id;
                                }
                                //issueById = partStockPayload.issueBy;
                            }


                            // Issue To Manage with Manually and Select from list

                            if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                                let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                                if (requestByData && requestByData.length) {

                                    requestedByResult = requestByData;
                                    issueToId = requestedByResult[0].id;
                                } else {

                                    requestedByResult = await knex('adjust_part_users').insert({
                                        name: partStockPayload.name1,
                                        mobile: partStockPayload.mobile1,
                                        email: partStockPayload.email1,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: req.orgId
                                    }).returning(['*'])
                                    issueToId = requestedByResult[0].id;
                                }
                            } else {
                                let usersData = await knex('users').where({ id: partStockPayload.issueTo, orgId: req.orgId }).returning(['*']).first();
                                let issuedToData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                                if (issuedToData && issuedToData.length) {
                                    issuedToDataResult = issuedToData;
                                    issueToId = issuedToDataResult[0].id;
                                } else {
                                    issuedToDataResult = await knex('adjust_part_users').insert({
                                        name: usersData.name,
                                        mobile: usersData.mobileNo,
                                        email: usersData.email,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: usersData.orgId
                                    }).returning(['*'])
                                    issueToId = issuedToDataResult[0].id;
                                }
                                //issueToId = partStockPayload.issueTo;
                            }

                            partStockPayload = _.omit(partStockPayload, ['receiveFrom', 'companyId', 'companyId2', 'storeAdjustmentBy', 'returnedBy', 'receiveBy', 'receiveDate', 'workOrderId', 'deductBy', 'deductDate', 'deductTo', 'building', 'floor', 'issueBy',
                                'issueTo',
                                'name',
                                'email',
                                'mobile',
                                'name1',
                                'email1',
                                'mobile1'
                            ])

                            partStockPayload.issueBy = issueById;
                            partStockPayload.issueTo = issueToId;
                            partStockPayload.companyId = companyMasterId;

                        } else if (partStockPayload.adjustType == "3") {
                            // Issue By Id Manage with Manually and Select from list

                            if (partStockPayload.name || partStockPayload.email || partStockPayload.mobile) {

                                let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name, mobile: partStockPayload.mobile, email: partStockPayload.email, orgId: req.orgId }).returning(['*']);

                                if (requestByData && requestByData.length) {

                                    requestedByResult = requestByData;
                                    deductBy = requestedByResult[0].id;
                                } else {

                                    requestedByResult = await knex('adjust_part_users').insert({
                                        name: partStockPayload.name,
                                        mobile: partStockPayload.mobile,
                                        email: partStockPayload.email,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: req.orgId
                                    }).returning(['*'])
                                    deductBy = requestedByResult[0].id;
                                }
                            } else {

                                let usersData = await knex('users').where({ id: partStockPayload.deductBy, orgId: req.orgId }).returning(['*']).first();
                                let returnByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                                if (returnByData && returnByData.length) {
                                    returnByDataResult = returnByData;
                                    deductBy = returnByDataResult[0].id;
                                } else {
                                    returnByDataResult = await knex('adjust_part_users').insert({
                                        name: usersData.name,
                                        mobile: usersData.mobileNo,
                                        email: usersData.email,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: usersData.orgId
                                    }).returning(['*'])
                                    deductBy = returnByDataResult[0].id;
                                }
                                //returnBy = partStockPayload.returnedBy;
                            }


                            // Issue To Manage with Manually and Select from list

                            if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                                let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                                if (requestByData && requestByData.length) {

                                    requestedByResult = requestByData;
                                    receiveBy = requestedByResult[0].id;
                                } else {

                                    requestedByResult = await knex('adjust_part_users').insert({
                                        name: partStockPayload.name1,
                                        mobile: partStockPayload.mobile1,
                                        email: partStockPayload.email1,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: req.orgId
                                    }).returning(['*'])
                                    receiveBy = requestedByResult[0].id;
                                }
                            } else {
                                let usersData = await knex('users').where({ id: partStockPayload.receiveBy, orgId: req.orgId }).returning(['*']).first();
                                let receiveByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                                if (receiveByData && receiveByData.length) {
                                    receiveByDataResult = receiveByData;
                                    receiveBy = receiveByDataResult[0].id;
                                } else {
                                    receiveByDataResult = await knex('adjust_part_users').insert({
                                        name: usersData.name,
                                        mobile: usersData.mobileNo,
                                        email: usersData.email,
                                        createdAt: currentTime1,
                                        updatedAt: currentTime1,
                                        orgId: usersData.orgId
                                    }).returning(['*'])
                                    receiveBy = receiveByDataResult[0].id;
                                }
                                //receiveBy = partStockPayload.receiveBy;
                            }

                            partStockPayload = _.omit(partStockPayload, ['receiveFrom', 'companyId2', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'receiveDate', 'workOrderId', 'deductDate', 'building', 'floor', 'name',
                                'email',
                                'mobile',
                                'name1',
                                'email1',
                                'mobile1',
                                'companyId',
                                "deductTo",
                                "returnedBy"
                            ])

                            let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                            let companyMasterId = partInfoData.companyId;

                            partStockPayload.deductBy = deductBy;
                            partStockPayload.receiveBy = receiveBy;
                            partStockPayload.companyId = companyMasterId;
                            // partStockPayload.serviceOrderNo = null;

                        } else {
                            partStockPayload = _.omit(partStockPayload, ['receiveFrom', 'companyId', 'companyId2', 'storeAdjustmentBy', 'issueBy', 'returnedBy', 'issueTo', 'receiveBy', 'receiveDate', 'workOrderId', 'deductBy', 'deductDate', 'building', 'floor', 'name',
                                'email',
                                'mobile',
                                'name1',
                                'email1',
                                'mobile1'
                            ])

                        }
                    } else {
                        return res.status(500).json({
                            errors: [
                                { code: 'VALIDATION_ERROR', message: 'Service order no does not exists' }
                            ],
                        });
                    }

                } else if (partStockPayload.adjustType == "2") {

                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        serviceOrderNo: Joi.string().allow("").allow(null).optional(),
                        isPartAdded: Joi.string().required(),
                        //receiveBy: Joi.string().required(),
                        //receiveDate: Joi.string().required(),
                        deductBy: Joi.number().allow("").allow(null).optional(),
                        //deductDate: Joi.string().allow("").allow(null).optional(),
                        building: Joi.string().allow("").allow(null).optional(),
                        floor: Joi.string().allow("").allow(null).optional(),
                        returnedBy: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        deductTo: Joi.number().allow("").allow(null).optional(),
                        name: Joi.string().allow("").allow(null).optional(),
                        email: Joi.string().allow("").allow(null).optional(),
                        mobile: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),

                        //deductBy : Joi.number().required()

                    });
                    result = Joi.validate(_.omit(partStockPayload, 'receiveBy', 'receiveDate', 'receiveFrom', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'description', 'date', 'workOrderId', 'building', 'floor'), schema);

                    // Issue By Id Manage with Manually and Select from list

                    if (partStockPayload.name || partStockPayload.email || partStockPayload.mobile) {

                        let deductByData = await knex('adjust_part_users').where({ name: partStockPayload.name, mobile: partStockPayload.mobile, email: partStockPayload.email, orgId: req.orgId }).returning(['*']);

                        if (deductByData && deductByData.length) {

                            deductedByResult = deductByData;
                            deductById = deductedByResult[0].id;
                        } else {

                            deductedByResult = await knex('adjust_part_users').insert({
                                name: partStockPayload.name,
                                mobile: partStockPayload.mobile,
                                email: partStockPayload.email,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: req.orgId
                            }).returning(['*'])
                            deductById = deductedByResult[0].id;
                        }
                    } else {
                        let usersData = await knex('users').where({ id: partStockPayload.deductBy, orgId: req.orgId }).returning(['*']).first();
                        let deductByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                        if (deductByData && deductByData.length) {
                            deductByDataResult = deductByData;
                            deductById = deductByDataResult[0].id;
                        } else {
                            deductByDataResult = await knex('adjust_part_users').insert({
                                name: usersData.name,
                                mobile: usersData.mobileNo,
                                email: usersData.email,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: usersData.orgId
                            }).returning(['*'])
                            deductById = deductByDataResult[0].id;
                        }
                        // deductById = partStockPayload.deductBy;
                    }


                    // Issue To Manage with Manually and Select from list

                    if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                        let deductToData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                        if (deductToData && deductToData.length) {

                            deductedToResult = deductToData;
                            deductToId = deductedToResult[0].id;
                        } else {

                            deductedByResult = await knex('adjust_part_users').insert({
                                name: partStockPayload.name1,
                                mobile: partStockPayload.mobile1,
                                email: partStockPayload.email1,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: req.orgId
                            }).returning(['*'])
                            deductToId = deductedByResult[0].id;
                        }
                    } else {
                        let usersData = await knex('users').where({ id: partStockPayload.deductTo, orgId: req.orgId }).returning(['*']).first();
                        let deductToData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                        if (deductToData && deductToData.length) {
                            deductToDataResult = deductToData;
                            deductToId = deductToDataResult[0].id;
                        } else {
                            deductToDataResult = await knex('adjust_part_users').insert({
                                name: usersData.name,
                                mobile: usersData.mobileNo,
                                email: usersData.email,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: usersData.orgId
                            }).returning(['*'])
                            deductToId = deductToDataResult[0].id;
                        }
                        //deductToId = partStockPayload.deductTo;
                    }

                    partStockPayload = _.omit(partStockPayload, ['receiveBy', 'receiveDate', 'receiveFrom', 'companyId', 'companyId2', 'serviceOrderNo', 'returnedBy', 'workOrderId', 'storeAdjustmentBy', 'issueBy', 'issueTo',
                        'name',
                        'email',
                        'mobile',
                        'name1',
                        'email1',
                        'mobile1',
                    ])

                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;

                    partStockPayload.deductBy = deductById;
                    partStockPayload.deductTo = deductToId;
                    partStockPayload.companyId = companyMasterId;
                    partStockPayload.serviceOrderNo = null;
                    //partStockPayload.deductDate = new Date(partStockPayload.deductDate).getTime();

                } else if (partStockPayload.adjustType == "6") {
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        serviceOrderNo: Joi.string().allow("").allow(null).optional(),
                        isPartAdded: Joi.string().required(),
                        //deductBy: Joi.string().required(),
                        //deductDate: Joi.string().required(),
                        building: Joi.string().allow("").allow(null).optional(),
                        floor: Joi.string().allow("").allow(null).optional(),
                        receiveBy: Joi.string().allow("").allow(null).optional(),
                        receiveDate: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),
                    });
                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;

                    result = Joi.validate(_.omit(partStockPayload, 'receiveFrom', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'returnedBy', 'description', 'receiveDate', 'workOrderId', 'deductBy', 'deductDate', 'deductTo', 'name', 'email', 'mobile', 'name1', 'email1', 'mobile1'), schema);
                    // result = Joi.validate(_.omit(partStockPayload, 'receiveFrom', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'returnedBy', 'description', 'receiveDate', 'workOrderId', 'deductBy', 'deductDate', 'deductTo', 'name', 'email', 'mobile'), schema);
                    //partStockPayload.receiveDate = new Date(partStockPayload.receiveDate).getTime();
                    if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                        let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                        // let requestByData = await knex('adjust_part_users')
                        //     .where({ name: partStockPayload.name1, orgId: req.orgId })
                        //     .orWhere({ mobile: partStockPayload.mobile1 })
                        //     .orWhere({ email: partStockPayload.email1 })
                        //     .returning(['*']);
                        console.log("requestDate-Type-6", requestByData);
                        if (requestByData && requestByData.length) {

                            requestedByResult = requestByData;
                            receiveBy = requestedByResult[0].id;
                        } else {

                            requestedByResult = await knex('adjust_part_users').insert({
                                name: partStockPayload.name1,
                                mobile: partStockPayload.mobile1,
                                email: partStockPayload.email1,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: req.orgId
                            }).returning(['*'])
                            receiveBy = requestedByResult[0].id;
                        }
                    } else {
                        let usersData = await knex('users').where({ id: partStockPayload.receiveBy, orgId: req.orgId }).returning(['*']).first();
                        let receiveByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                        if (receiveByData && receiveByData.length) {
                            receiveByDataResult = receiveByData;
                            receiveBy = receiveByDataResult[0].id;
                        } else {
                            receiveByDataResult = await knex('adjust_part_users').insert({
                                name: usersData.name,
                                mobile: usersData.mobileNo,
                                email: usersData.email,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: usersData.orgId
                            }).returning(['*'])
                            receiveBy = receiveByDataResult[0].id;
                        }
                        //receiveBy = partStockPayload.receiveBy;
                    }
                    partStockPayload = _.omit(partStockPayload, ['receiveFrom', 'receiveBy', 'companyId', 'companyId2', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'returnedBy', 'receiveDate', 'deductBy', 'deductDate', 'deductTo', 'building', 'floor', 'name', 'email', 'mobile', 'name1', 'email1', 'mobile1'])

                    partStockPayload.companyId = companyMasterId;
                    partStockPayload.receiveBy = receiveBy;

                } else if (partStockPayload.adjustType == "10") {
                    let issueById;
                    let issueToId;

                    partStockPayloadNew = _.omit(partStockPayload, ['receiveFrom', 'companyId', 'companyId2', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'returnedBy', 'deductBy', 'deductDate', 'deductTo', 'building', 'floor'])


                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        workOrderId: Joi.string().required(),
                        isPartAdded: Joi.string().required(),
                        issueBy: Joi.string().allow("").allow(null).optional(),
                        issueTo: Joi.string().allow("").allow(null).optional(),
                        name: Joi.string().allow("").allow(null).optional(),
                        email: Joi.string().allow("").allow(null).optional(),
                        mobile: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        receiveFrom: Joi.string().allow("").allow(null).optional(),
                    });

                    // Validate Work Order No
                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;
                    let validWOMaster = await knex('task_group_schedule_assign_assets').where({ displayId: partStockPayload.workOrderId, companyId: companyMasterId, orgId: req.orgId }).returning(['*']).first();
                    //console.log("validWOMaster", validWOMaster);
                    if (validWOMaster) {

                        // Issue By Id Manage with Manually and Select from list

                        if (partStockPayload.name || partStockPayload.email || partStockPayload.mobile) {

                            let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name, mobile: partStockPayload.mobile, email: partStockPayload.email, orgId: req.orgId }).returning(['*']);

                            if (requestByData && requestByData.length) {

                                requestedByResult = requestByData;
                                issueById = requestedByResult[0].id;
                            } else {

                                requestedByResult = await knex('adjust_part_users').insert({
                                    name: partStockPayload.name,
                                    mobile: partStockPayload.mobile,
                                    email: partStockPayload.email,
                                    createdAt: currentTime1,
                                    updatedAt: currentTime1,
                                    orgId: req.orgId
                                }).returning(['*'])
                                issueById = requestedByResult[0].id;
                            }
                        } else {
                            let usersData = await knex('users').where({ id: partStockPayload.issueBy, orgId: req.orgId }).returning(['*']).first();
                            let issuedByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                            if (issuedByData && issuedByData.length) {
                                issuedByDataResult = issuedByData;
                                issueById = issuedByDataResult[0].id;
                            } else {
                                issuedByDataResult = await knex('adjust_part_users').insert({
                                    name: usersData.name,
                                    mobile: usersData.mobileNo,
                                    email: usersData.email,
                                    createdAt: currentTime1,
                                    updatedAt: currentTime1,
                                    orgId: usersData.orgId
                                }).returning(['*'])
                                issueById = issuedByDataResult[0].id;
                            }

                        }


                        // Issue To Manage with Manually and Select from list

                        if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                            let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                            if (requestByData && requestByData.length) {

                                requestedByResult = requestByData;
                                issueToId = requestedByResult[0].id;
                            } else {

                                requestedByResult = await knex('adjust_part_users').insert({
                                    name: partStockPayload.name1,
                                    mobile: partStockPayload.mobile1,
                                    email: partStockPayload.email1,
                                    createdAt: currentTime1,
                                    updatedAt: currentTime1,
                                    orgId: req.orgId
                                }).returning(['*'])
                                issueToId = requestedByResult[0].id;
                            }
                        } else {
                            let usersData = await knex('users').where({ id: partStockPayload.issueTo, orgId: req.orgId }).returning(['*']).first();
                            let issuedToData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                            if (issuedToData && issuedToData.length) {
                                issuedToDataResult = issuedToData;
                                issueToId = issuedToDataResult[0].id;
                            } else {
                                issuedToDataResult = await knex('adjust_part_users').insert({
                                    name: usersData.name,
                                    mobile: usersData.mobileNo,
                                    email: usersData.email,
                                    createdAt: currentTime1,
                                    updatedAt: currentTime1,
                                    orgId: usersData.orgId
                                }).returning(['*'])
                                issueToId = issuedToDataResult[0].id;
                            }
                            // issueToId = partStockPayload.issueTo;
                        }


                        result = Joi.validate(_.omit(partStockPayload, 'storeAdjustmentBy', 'returnedBy', 'serviceOrderNo', 'description', 'date', 'receiveBy', 'receiveDate', 'deductBy', 'deductTo', 'deductDate', 'building', 'floor'), schema);
                        partStockPayload = _.omit(partStockPayload, ['serviceOrderNo',
                                "receiveDate",
                                "building",
                                "floor",
                                "storeAdjustmentBy",
                                "deductBy",
                                "returnedBy",
                                'companyId',
                                'companyId2',
                                'deductDate',
                                'issueBy',
                                'issueTo',
                                'name',
                                'email',
                                'mobile',
                                'name1',
                                'email1',
                                'mobile1',
                                'deductTo',
                                "receiveBy",
                                "receiveFrom"
                            ])
                            // partStockPayload.companyId = req.body.companyId2;
                        partStockPayload.issueBy = issueById;
                        partStockPayload.issueTo = issueToId;
                        partStockPayload.companyId = companyMasterId;

                    } else {
                        return res.status(500).json({
                            errors: [
                                { code: 'VALIDATION_ERROR', message: 'Work Order no does not exists' }
                            ],
                        });
                    }

                } else if (partStockPayload.adjustType == "11") {

                    partStockPayloadNew = _.omit(partStockPayload, ['receiveFrom', 'companyId', 'companyId2', 'storeAdjustmentBy', 'issueBy', 'issueTo', 'returnedBy', 'deductBy', 'deductDate', 'deductTo', 'building', 'floor'])
                    let receiveById;

                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        workOrderId: Joi.string().required(),
                        isPartAdded: Joi.string().required(),
                        issueBy: Joi.string().allow("").allow(null).optional(),
                        issueTo: Joi.string().allow("").allow(null).optional(),
                        name: Joi.string().allow("").allow(null).optional(),
                        email: Joi.string().allow("").allow(null).optional(),
                        mobile: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        receiveFrom: Joi.string().allow("").allow(null).optional(),
                        receiveBy: Joi.string().allow("").allow(null).optional(),
                    });

                    // Validate Work Order No
                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;
                    let validWOMaster = await knex('task_group_schedule_assign_assets').where({ displayId: partStockPayload.workOrderId, companyId: companyMasterId, orgId: req.orgId }).returning(['*']).first();
                    //console.log("validWOMaster", validWOMaster);
                    if (validWOMaster) {

                        if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                            let receiveByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                            if (receiveByData && receiveByData.length) {

                                receiveByResult = receiveByData;
                                receiveById = receiveByResult[0].id;
                            } else {

                                receiveByResult = await knex('adjust_part_users').insert({
                                    name: partStockPayload.name1,
                                    mobile: partStockPayload.mobile1,
                                    email: partStockPayload.email1,
                                    createdAt: currentTime1,
                                    updatedAt: currentTime1,
                                    orgId: req.orgId
                                }).returning(['*'])
                                receiveById = receiveByResult[0].id;
                            }
                        } else {

                            let usersData = await knex('users').where({ id: partStockPayload.receiveBy, orgId: req.orgId }).returning(['*']).first();
                            let receiveByData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                            if (receiveByData && receiveByData.length) {
                                receiveByDataResult = receiveByData;
                                receiveById = receiveByDataResult[0].id;
                            } else {
                                receiveByDataResult = await knex('adjust_part_users').insert({
                                    name: usersData.name,
                                    mobile: usersData.mobileNo,
                                    email: usersData.email,
                                    createdAt: currentTime1,
                                    updatedAt: currentTime1,
                                    orgId: usersData.orgId
                                }).returning(['*'])
                                receiveById = receiveByDataResult[0].id;
                            }

                            //receiveById = partStockPayload.receiveBy;
                        }

                        result = Joi.validate(_.omit(partStockPayload, 'storeAdjustmentBy', 'returnedBy', 'serviceOrderNo', 'description', 'date', 'receiveDate', 'deductBy', 'deductTo', 'deductDate', 'issueBy', 'issueTo', 'building', 'floor'), schema);

                        partStockPayload = _.omit(partStockPayload, ['serviceOrderNo',
                            "receiveDate",
                            "building",
                            "floor",
                            "storeAdjustmentBy",
                            "deductBy",
                            "returnedBy",
                            'companyId',
                            'companyId2',
                            'deductDate',
                            'issueBy',
                            'issueTo',
                            'name',
                            'email',
                            'mobile',
                            'name1',
                            'email1',
                            'mobile1',
                            'deductTo',
                            "receiveBy"
                        ])
                        partStockPayload.receiveBy = receiveById;
                        partStockPayload.companyId = companyMasterId;
                    } else {
                        return res.status(500).json({
                            errors: [
                                { code: 'VALIDATION_ERROR', message: 'Work Order no does not exists' }
                            ],
                        });
                    }

                } else if (partStockPayload.adjustType == "4") {


                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        //serviceOrderNo: Joi.string().allow("").allow(null).optional(),
                        isPartAdded: Joi.string().required(),
                        //deductBy: Joi.string().required(),
                        //deductDate: Joi.string().required(),
                        building: Joi.string().allow("").allow(null).optional(),
                        floor: Joi.string().allow("").allow(null).optional(),
                        //receiveBy: Joi.string().required(),
                        //receiveDate: Joi.string().required()
                        storeAdjustmentBy: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        name: Joi.string().allow("").allow(null).optional(),
                        email: Joi.string().allow("").allow(null).optional(),
                        mobile: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),
                        issueTo: Joi.string().allow("").allow(null).optional(),

                    });
                    result = Joi.validate(_.omit(partStockPayload, 'receiveFrom', 'issueBy', 'returnedBy', 'description', 'date', 'serviceOrderNo', 'receiveBy', 'receiveDate', 'workOrderId', 'deductBy', 'deductDate', 'deductTo'), schema);


                    // Issue To Manage with Manually and Select from list
                    let storeAdjustmentByNew;

                    if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                        let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                        if (requestByData && requestByData.length) {

                            requestedByResult = requestByData;
                            storeAdjustmentByNew = requestedByResult[0].id;
                        } else {

                            requestedByResult = await knex('adjust_part_users').insert({
                                name: partStockPayload.name1,
                                mobile: partStockPayload.mobile1,
                                email: partStockPayload.email1,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: req.orgId
                            }).returning(['*'])
                            storeAdjustmentByNew = requestedByResult[0].id;
                        }
                    } else {
                        //storeAdjustmentByNew = partStockPayload.issueTo;
                        let usersData = await knex('users').where({ id: partStockPayload.issueTo, orgId: req.orgId }).returning(['*']).first();
                        let issueToData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                        if (issueToData && issueToData.length) {
                            issueToDataResult = issueToData;
                            storeAdjustmentByNew = issueToDataResult[0].id;
                        } else {
                            issueToDataResult = await knex('adjust_part_users').insert({
                                name: usersData.name,
                                mobile: usersData.mobileNo,
                                email: usersData.email,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: usersData.orgId
                            }).returning(['*'])
                            storeAdjustmentByNew = issueToDataResult[0].id;
                        }
                    }

                    partStockPayload = _.omit(partStockPayload, ['receiveFrom', 'companyId', 'companyId2', 'issueBy', 'returnedBy', 'deductBy', 'deductDate', 'deductTo', 'building', 'floor', 'date', 'serviceOrderNo', 'receiveBy', 'receiveDate', 'workOrderId', 'storeAdjustmentBy', 'name1', 'email1', 'mobile1', 'name', 'email', 'mobile', 'issueTo'])

                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;

                    partStockPayload.storeAdjustmentBy = storeAdjustmentByNew;
                    partStockPayload.companyId = companyMasterId;
                } else if (partStockPayload.adjustType == "5") {

                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        //serviceOrderNo: Joi.string().allow("").allow(null).optional(),
                        isPartAdded: Joi.string().required(),
                        //deductBy: Joi.string().required(),
                        //deductDate: Joi.string().required(),
                        building: Joi.string().allow("").allow(null).optional(),
                        floor: Joi.string().allow("").allow(null).optional(),
                        //receiveBy: Joi.string().required(),
                        //receiveDate: Joi.string().required()
                        storeAdjustmentBy: Joi.string().allow("").allow(null).optional(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                        name: Joi.string().allow("").allow(null).optional(),
                        email: Joi.string().allow("").allow(null).optional(),
                        mobile: Joi.string().allow("").allow(null).optional(),
                        name1: Joi.string().allow("").allow(null).optional(),
                        email1: Joi.string().allow("").allow(null).optional(),
                        mobile1: Joi.string().allow("").allow(null).optional(),
                        issueTo: Joi.string().allow("").allow(null).optional(),

                    });

                    result = Joi.validate(_.omit(partStockPayload, 'receiveFrom', 'issueBy', 'returnedBy', 'description', 'date', 'serviceOrderNo', 'receiveBy', 'receiveDate', 'workOrderId', 'deductBy', 'deductDate', 'deductTo'), schema);


                    // Issue To Manage with Manually and Select from list
                    let storeAdjustmentByNew;

                    if (partStockPayload.name1 || partStockPayload.email1 || partStockPayload.mobile1) {

                        let requestByData = await knex('adjust_part_users').where({ name: partStockPayload.name1, mobile: partStockPayload.mobile1, email: partStockPayload.email1, orgId: req.orgId }).returning(['*']);

                        if (requestByData && requestByData.length) {

                            requestedByResult = requestByData;
                            storeAdjustmentByNew = requestedByResult[0].id;
                        } else {

                            requestedByResult = await knex('adjust_part_users').insert({
                                name: partStockPayload.name1,
                                mobile: partStockPayload.mobile1,
                                email: partStockPayload.email1,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: req.orgId
                            }).returning(['*'])
                            storeAdjustmentByNew = requestedByResult[0].id;
                        }
                    } else {
                        // storeAdjustmentByNew = partStockPayload.issueTo;
                        let usersData = await knex('users').where({ id: partStockPayload.issueTo, orgId: req.orgId }).returning(['*']).first();
                        let issueToData = await knex('adjust_part_users').where({ name: usersData.name, mobile: usersData.mobileNo, email: usersData.email, orgId: usersData.orgId }).returning(['*']);

                        if (issueToData && issueToData.length) {
                            issueToDataResult = issueToData;
                            storeAdjustmentByNew = issueToDataResult[0].id;
                        } else {
                            issueToDataResult = await knex('adjust_part_users').insert({
                                name: usersData.name,
                                mobile: usersData.mobileNo,
                                email: usersData.email,
                                createdAt: currentTime1,
                                updatedAt: currentTime1,
                                orgId: usersData.orgId
                            }).returning(['*'])
                            storeAdjustmentByNew = issueToDataResult[0].id;
                        }
                    }

                    partStockPayload = _.omit(partStockPayload, ['receiveFrom', 'companyId', 'companyId2', 'issueBy', 'issueTo', 'returnedBy', 'deductBy', 'deductDate', 'deductTo', 'building', 'floor', 'date', 'serviceOrderNo', 'receiveBy', 'receiveDate', 'workOrderId', 'storeAdjustmentBy', 'name1', 'email1', 'mobile1', 'name', 'email', 'mobile'])

                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;

                    partStockPayload.storeAdjustmentBy = storeAdjustmentByNew;
                    partStockPayload.companyId = companyMasterId;
                } else {
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        unitCost: Joi.string().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        isPartAdded: Joi.string().required(),
                        companyId: Joi.string().allow("").allow(null).optional(),
                        companyId2: Joi.string().allow("").allow(null).optional(),
                    });
                    result = Joi.validate(_.omit(partStockPayload, 'receiveFrom', 'serviceOrderNo', 'description', 'date', 'workOrderId', 'receiveBy', 'receiveDate', 'deductBy', 'deductDate', 'building', 'floor'), schema);
                    let partInfoData = await knex('part_master').where({ id: partStockPayload.partId, orgId: req.orgId }).returning(['*']).first();
                    let companyMasterId = partInfoData.companyId;
                    partStockPayload.companyId = companyMasterId;
                }

                console.log('[controllers][part]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }


                let unitCost;
                if (partStockPayload.unitCost) {
                    if (partStockPayload.adjustType == 11 || partStockPayload.adjustType == 1 || partStockPayload.adjustType == 2 || partStockPayload.adjustType == 3 || partStockPayload.adjustType == 5 || partStockPayload.adjustType == 10) {
                        let ledgerResult = await knex.from('part_ledger').where({ partId: partStockPayload.partId }).whereNot({ unitCost: 0 })
                            .select('unitCost')
                            .orderBy('id', 'desc')
                            .limit('1')
                            .first()
                        console.log("ledgerResult", ledgerResult);
                        unitCost = ledgerResult.unitCost;
                    } else {
                        unitCost = partStockPayload.unitCost
                        console.log("ledgerResult++partStockPayload.unitCost", partStockPayload.unitCost);
                    }

                } else {
                    let ledgerResult = await knex.from('part_ledger').where({ partId: partStockPayload.partId }).whereNot({ unitCost: 0 })
                        .select('unitCost')
                        .orderBy('id', 'desc')
                        .limit('1')
                        .first()
                    console.log("ledgerResult", ledgerResult);
                    unitCost = ledgerResult.unitCost;
                }

                let quantity;
                if (partStockPayload.adjustType == 1 || partStockPayload.adjustType == 2 || partStockPayload.adjustType == 5 || partStockPayload.adjustType == 7 || partStockPayload.adjustType == 10) {
                    quantity = "-" + partStockPayload.quantity;
                } else {
                    quantity = partStockPayload.quantity;
                }


                // Insert in part_ledger table,

                let currentTime;
                if (req.body.date) {
                    currentTime = new Date(req.body.date).getTime();

                } else {

                    currentTime = new Date().getTime();
                }


                let insertData = {
                    ...partStockPayload,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    orgId: req.orgId,
                    unitCost: unitCost,
                    quantity: quantity
                };

                console.log('[controllers][part][addPartStock]: Insert Data', insertData);

                let partStockResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('part_ledger');
                partStock = partStockResult[0];


                trx.commit;

            });

            res.status(200).json({
                data: {
                    part: partStock
                },
                message: "Part Stock added successfully !"
            });

        } catch (err) {
            console.log('[controllers][part][addPartStock] :  Error', err);
            //trx.rollback
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }

    },

    searchParts: async(req, res) => {

        try {

            let query = decodeURI(req.query.query).trim();
            const getFilteredItems = (searchTerm) => knex('part_master')
                .where((qb) => {
                    qb.where('part_master.partName', 'like', `%${searchTerm}%`);

                    qb.orWhere('part_master.partCode', 'like', `%${searchTerm}%`);

                    qb.orWhere('part_master.partCategory', 'like', `%${searchTerm}%`);
                    qb.orWhere('part_master.barcode', 'like', `%${searchTerm}%`);
                });
            const parts = await getFilteredItems(query)
            return res.status(200).json({
                data: {
                    parts: parts
                },
                message: 'Search results for: ' + query
            })
        } catch (err) {
            console.log('[controllers][part][searchPart] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    // exportPart:async (req,res)=>{

    //     try{ 
    //         let partData = null;
    //         let reqData = req.query;
    //         let total, rows

    //         let pagination = {};
    //         let per_page = reqData.per_page || 10;
    //         let page = reqData.current_page || 1;
    //         if (page < 1) page = 1;
    //         let offset = (page - 1) * per_page;


    //         let { partName,
    //             partCode,
    //             partCategory } = req.body;


    //         let filters = {}

    //         if (partName) {
    //             filters['part_master.partName'] = partName
    //         }

    //         if (partCode) {
    //             filters['part_master.partCode'] = partCode
    //         }

    //         if (partCategory) {
    //             filters['part_master.partCategory'] = partCategory
    //         }



    //         if (_.isEmpty(filters)) {
    //             [total, rows] = await Promise.all([
    //                 knex.count('* as count').from("part_ledger")
    //                 .innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
    //                 knex.from('part_ledger').
    //                 innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
    //                 .select([
    //                     'part_master.partName as Name',
    //                     'part_master.partCode as ID',
    //                     'part_ledger.quantity as Quantity',
    //                     'part_ledger.unitCost as Price',
    //                     'part_master.partCategory as Category',
    //                     'part_master.barcode as Barcode',
    //                     'part_ledger.createdAt as Date Added'

    //                 ])
    //                 .offset(offset).limit(per_page)
    //             ])
    //         } else {
    //             //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
    //             try {
    //                 [total, rows] = await Promise.all([
    //                     knex.count('* as count').from("part_ledger").innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
    //                     knex.from('part_ledger').innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
    //                     .select([
    //                     'part_master.partName as Name',
    //                     'part_master.partCode as ID',
    //                     'part_ledger.quantity as Quantity',
    //                     'part_ledger.unitCost as Price',
    //                     'part_master.partCategory as Category',
    //                     'part_master.barcode as Barcode',
    //                     'part_ledger.createdAt as Date Added'

    //                 ])
    //                     .where(filters).offset(offset).limit(per_page)
    //                 ])
    //             } catch (e) {
    //                 // Error
    //             }
    //         }


    //         var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
    //         var ws = XLSX.utils.json_to_sheet(rows);
    //         XLSX.utils.book_append_sheet(wb, ws, "pres");
    //         XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
    //         let filename = "uploads/Parts-"+Date.now()+".csv";
    //         let  check = XLSX.writeFile(wb,filename);

    //             return res.status(200).json({
    //                 data:rows,
    //                 message:"Parts Data Export Successfully!"
    //             })


    //      } catch(err){
    //          return res.status(500).json({
    //             errors: [
    //                 { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
    //             ],
    //          })
    //      }   
    // },
    // Part List for DropDown
    partList: async(req, res) => {

        try {

            let partList = await knex.from('part_master').returning('*');

            return res.status(200).json({
                data: partList,
                message: "Part List Successfully!"
            })

        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    //CHECK PART CODE EXIST OR NOT
    partCodeExist: async(req, res) => {
        try {

            let payload = req.query;
            let partResult = await knex.from('part_master')
                .select([
                    'part_master.id as id',
                    'part_master.partName as partName',
                    'part_master.partCode',
                    'part_master.partDescription as partDescription',
                    'part_master.partCategory as partCategory',
                    'part_master.minimumQuantity as minimumQuantity',
                    'part_master.barcode as barcode',
                    'part_master.assignedVendors as assignedVendors',
                    'part_master.additionalPartDetails as additionalPartDetails'
                ])
                .returning('*')
                .where({ partCode: payload.partCode })

            if (partResult.length > 0) {

                let partLedgerResult = await knex.from('part_ledger')
                    .select([
                        'part_ledger.id as partLedgerId',
                        'part_ledger.unitCost as unitCost',
                        'part_ledger.quantity as quantity'
                    ])
                    .where({ partId: partResult[0].id })
                let unitCost = partLedgerResult[0].unitCost
                let quantity = partLedgerResult[0].quantity

                let additionalAttribute = await knex.from('part_attributes')
                    .select([
                        'part_attributes.id as partAttributeId',
                        'part_attributes.attributeName as attributeName',
                        'part_attributes.attributeDescription as attributeDescription',
                    ])
                    .where({ partId: partResult[0].id })

                return res.status(200).json({
                    message: "This Part Code already Exist!",
                    partResult: {...partResult[0], unitCost, quantity, additionalAttributes: additionalAttribute }
                })
            } else {
                return res.status(200).json({
                    message: "Part Code Not Found!",
                    partResult: ""
                })
            }

        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    //GET PART DETAIL BY ID
    getPartDetailById: async(req, res) => {
        try {

            let payload = req.query;
            let id = payload.id;
            let partResult = await knex.from('part_master')
                .innerJoin("part_category_master", 'part_master.partCategory', 'part_category_master.id')
                .select([
                    'part_master.id as id',
                    'part_master.partName as partName',
                    'part_master.unitOfMeasure',
                    'part_master.partCode',
                    'part_master.partDescription as partDescription',
                    'part_master.partCategory as partCategory',
                    'part_category_master.categoryName as partCatgoryName ',
                    'part_master.minimumQuantity as minimumQuantity',
                    'part_master.barcode as barcode',
                    'part_master.assignedVendors as assignedVendors',
                    'part_master.additionalPartDetails as additionalPartDetails',
                    'part_master.companyId'
                ])

            .returning('*')
                .where({ 'part_master.id': payload.id })

            let partLedgerResult = await knex.from('part_ledger')
                .select([
                    'part_ledger.id as partLedgerId',
                    'part_ledger.unitCost as unitCost',
                    'part_ledger.quantity as quantity'
                ])
                .where({ partId: id })

            // This 687 ,688 needs to be removed because its irrelevant but its here because we dont know where this is being used
            let unitCost = partLedgerResult.length ? partLedgerResult[0].unitCost : '0'
            let quantity = partLedgerResult.length ? partLedgerResult[0].quantity : '0'


            let additionalAttribute = await knex.from('part_attributes')
                .select([
                    'part_attributes.id as partAttributeId',
                    'part_attributes.attributeName as attributeName',
                    'part_attributes.attributeDescription as attributeDescription',
                ])
                .where({ partId: id })

            files = await knex('files').where({ entityId: id, entityType: 'part_master' }).select()
            images = await knex('images').where({ entityId: id, entityType: 'part_master' }).select()

            return res.status(200).json({
                message: "Part Details Successfully!",
                partDetail: {...partResult[0], partLedgerResult, additionalAttributes: additionalAttribute, images, files, unitCost, quantity }
            })

        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    // IMPORT PART DETAILS
    importPartDetails: async(req, res) => {

        try {

            if (req.file) {
                return res.json(req.file)
                console.log("======", req.file, "=====");
            } else {
                return res.status(400).json({

                    message: "Select File!"
                });
            }

        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    //  CHECK WORK ORDER ID 
    checkOrderWorkId: async(req, res) => {
        try {
            let orgId = req.orgId;
            let workOrderId = req.query.workOrderId;
            let companyId = req.query.companyId;

            let result = "";
            result = await knex('task_group_schedule_assign_assets')
                .leftJoin('task_group_schedule', 'task_group_schedule_assign_assets.scheduleId', 'task_group_schedule.id')
                .leftJoin('pm_master2', 'task_group_schedule.pmId', 'pm_master2.id')
                .returning('*')
                .where({ 'task_group_schedule_assign_assets.displayId': workOrderId, 'pm_master2.companyId': companyId, 'task_group_schedule_assign_assets.orgId': orgId })
            return res.status(200).json({
                data: result,
                message: "Work Order no. Successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    // PART REQUISITION LOG LIST
    partRequisitionLogList: async(req, res) => {
        try {

            let { partId, partCode, partName, serviceOrderNo, workOrderId, adjustType, pId, fromDate, toDate } = req.body
            let reqData = req.query;
            let total, rows
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            if (partId || partName || serviceOrderNo || workOrderId || adjustType || partCode || pId || fromDate || toDate) {

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                    .where(qb => {
                        qb.where({ 'part_ledger.orgId': req.orgId })
                        if (partId) {
                            qb.where('part_master.displayId', partId)
                        }
                        if (partName) {
                            qb.where('part_master.partName', 'iLIKE', `%${partName}%`)
                        }
                        if (serviceOrderNo) {
                            qb.where('part_ledger.serviceOrderNo', 'like', `%${serviceOrderNo}%`)
                        }
                        if (workOrderId) {

                            qb.where('part_ledger.workOrderId', 'like', `%${workOrderId}%`)
                        }
                        if (adjustType) {
                            qb.where('part_ledger.adjustType', adjustType)
                        }
                        if (partCode) {
                            qb.where('part_master.partCode', 'iLIKE', `%${partCode}%`)

                        }

                        if (pId) {
                            qb.where('part_ledger.partId', pId)
                        }

                        if (fromDate && toDate) {

                            qb.whereBetween('part_ledger.createdAt', [fromDate, toDate])

                        }

                    })
                    .first(),
                    knex.from('part_ledger')
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                    .select([
                        'part_ledger.id as Log Id',
                        'part_master.displayId as P No',
                        'part_master.id as Part Id',
                        'part_master.partName as Part Name',
                        'part_master.partCode as Part Code',
                        'part_ledger.quantity as Quantity',
                        'part_ledger.unitCost as Unit Cost',
                        'part_ledger.serviceOrderNo as SO No',
                        'part_ledger.workOrderId as Work Order ID',
                        'adjust_type.adjustType as Adjust Type',
                        'part_ledger.adjustType as adjustTypeId',
                        'part_ledger.approved',
                        'part_ledger.description',
                        'part_ledger.approvedBy',
                        'part_ledger.createdAt as Transaction Date',
                    ])
                    .where(qb => {
                        qb.where({ 'part_ledger.orgId': req.orgId })

                        if (partId) {
                            qb.where('part_master.displayId', partId)
                        }
                        if (partName) {
                            qb.where('part_master.partName', 'iLIKE', `%${partName}%`)
                        }
                        if (serviceOrderNo) {
                            qb.where('part_ledger.serviceOrderNo', 'like', `%${serviceOrderNo}%`)
                        }
                        if (workOrderId) {

                            qb.where('part_ledger.workOrderId', 'like', `%${workOrderId}%`)
                        }
                        if (adjustType) {
                            qb.where('part_ledger.adjustType', adjustType)
                        }

                        if (partCode) {
                            qb.where('part_master.partCode', 'iLIKE', `%${partCode}%`)

                        }

                        if (pId) {
                            qb.where('part_ledger.partId', pId);
                        }

                        if (fromDate && toDate) {

                            qb.whereBetween('part_ledger.createdAt', [fromDate, toDate])

                        }

                    })
                    .orderBy('part_ledger.createdAt', 'desc')
                    .orderBy('part_ledger.id', 'desc')
                    .offset(offset).limit(per_page)
                ])

            } else {

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                    .where({ 'part_ledger.orgId': req.orgId })

                    .first(),
                    knex.from('part_ledger')
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                    .where({ 'part_ledger.orgId': req.orgId })

                    .select([
                        'part_ledger.id as Log Id',
                        'part_master.id as Part Id',
                        'part_master.displayId as P No',
                        'part_master.partName as Part Name',
                        'part_master.partCode as Part Code',
                        'part_ledger.quantity as Quantity',
                        'part_ledger.unitCost as Unit Cost',
                        'part_ledger.serviceOrderNo as SO No',
                        'part_ledger.workOrderId as Work Order ID',
                        'adjust_type.adjustType as Adjust Type',
                        'part_ledger.adjustType as adjustTypeId',
                        'part_ledger.approved',
                        'part_ledger.description',
                        'part_ledger.approvedBy',
                        'part_ledger.createdAt as Transaction Date',
                    ])
                    .orderBy('part_ledger.createdAt', 'desc')
                    .orderBy('part_ledger.id', 'desc')
                    .offset(offset).limit(per_page)
                ])
            }


            const Parallel = require('async-parallel');
            rows = await Parallel.map(rows, async st => {

                let quantity = 0.000;
                let unitCost = 0.000;

                if (st.Quantity) {

                    quantity = st.Quantity.toFixed(3)
                }

                if (st["Unit Cost"]) {

                    unitCost = st["Unit Cost"].toFixed(2);
                }


                return {
                    ...st,
                    Quantity: quantity,
                    "Unit Cost": unitCost
                }

            })


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
                    partsRequisition: pagination
                },
                message: 'Part Requisition Log List!'
            })

        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    // ADJUST TYPE LIST FOR DROP DOWN
    adjustTypeList: async(req, res) => {

        try {

            let result = await knex('adjust_type').returning('*')

            return res.status(200).json({
                data: {
                    adjustTypeList: result
                },
                message: 'Adjust type List!'
            })

        } catch (err) {

            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }

    },
    /*DELETE PART */
    deletePart: async(req, res) => {

        try {
            let part = null;
            let payload = req.body;
            const schema = Joi.object().keys({
                id: Joi.string().required()
            });
            const result = Joi.validate(payload, schema);
            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }
            let partResult;
            let message;
            let checkStatus = await knex.from('part_master').where({ id: payload.id }).returning(['*']);

            if (checkStatus.length) {

                if (checkStatus[0].isActive == true) {

                    partResult = await knex
                        .update({ isActive: false })
                        .where({ id: payload.id })
                        .returning(["*"])
                        .into("part_master");
                    part = partResult[0];

                    message = "Part Deactivate Successfully!"

                } else {


                    partResult = await knex
                        .update({ isActive: true })
                        .where({ id: payload.id })
                        .returning(["*"])
                        .into("part_master");
                    part = partResult[0];

                    message = "Part Activate Successfully!"

                }
            }

            return res.status(200).json({
                data: {
                    part: part
                },
                message: message
            });

        } catch (err) {

            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    importPartData: async(req, res) => {
        //req.setTimeout(900000);
        try {
            // if (req.file) {
            // console.log(req.file)
            // let tempraryDirectory = null;
            // if (process.env.IS_OFFLINE) {
            //     tempraryDirectory = 'tmp/';
            // } else {
            //     tempraryDirectory = '/tmp/';
            // }
            // let resultData = null;
            // let file_path = tempraryDirectory + req.file.filename;
            // let wb = XLSX.readFile(file_path, { type: 'string' });
            // let ws = wb.Sheets[wb.SheetNames[0]];
            // let data = XLSX.utils.sheet_to_json(ws, { type: 'string', header: 'A', raw: false });
            // //data         = JSON.stringify(data);
            // console.log("+++++++++++++", data, "=========")
            let data = req.body;
            let totalData = data.length - 1;
            let fail = 0;
            let success = 0;
            let result = null;
            let errors = []
            let header = Object.values(data[0]);
            header.unshift('Error');
            errors.push(header)

            if (data[0].A == "Ã¯Â»Â¿PART_CODE" || data[0].A == "PART_CODE" &&
                data[0].B == "PART_NAME" &&
                data[0].C == "UNIT_OF_MEASURE" &&
                data[0].D == "PART_CATEGORY_CODE" &&
                data[0].E == "COMPANY_ID" &&
                data[0].F == "quantity" &&
                data[0].G == "AVG_UNIT_COST"
                // data[0].H == "MINIMUM_QUANTITY"
            ) {

                if (data.length > 0) {

                    let i = 0;
                    for (let partData of data) {
                        i++;

                        if (i > 1) {
                            let currentTime = new Date().getTime()
                                // let checkExist = await knex('asset_master').select('companyName')
                                //   .where({ companyName: partData.B, orgId: req.orgId })
                                //   console.log("Check list company: ", checkExist);
                                //if (checkExist.length < 1) {

                            // Check if this asset category exists
                            // if not create new and put that id
                            let partCategoryId = ''
                            const cat = await knex('part_category_master').where({ categoryName: partData.D, orgId: req.orgId }).select('id')
                            if (cat && cat.length) {
                                partCategoryId = cat[0].id;
                            } else {
                                const catResult = await knex("part_category_master")
                                    .insert({
                                        categoryName: partData.D,
                                        orgId: req.orgId,
                                        createdAt: currentTime,
                                        updatedAt: currentTime
                                    })
                                    .returning(["id"]);
                                partCategoryId = catResult[0].id;
                            }


                            let companyData = await knex("companies")
                                .select("id")
                                .where({ companyId: partData.E, orgId: req.orgId });
                            let companyId = null;
                            if (!companyData.length) {
                                fail++;
                                let values = _.values(partData)
                                values.unshift('Company ID does not exists.')
                                errors.push(values);
                                continue;
                            }
                            if (companyData && companyData.length) {
                                companyId = companyData[0].id;
                            }


                            let checkExist = await knex("part_master")
                                .select("id")
                                .where({
                                    partCode: partData.A,
                                    partName: partData.B,
                                    orgId: req.orgId
                                });
                            // if (checkExist.length < 1) {

                            let min = null;
                            if (partData.H) {
                                min = partData.H;
                            }

                            let insertData = {
                                orgId: req.orgId,
                                partCode: partData.A,
                                partName: partData.B,
                                unitOfMeasure: partData.C,
                                partCategory: partCategoryId,
                                companyId: companyId,
                                createdAt: currentTime,
                                updatedAt: currentTime,
                                minimumQuantity: min,
                            }

                            resultData = await knex.insert(insertData).returning(['*']).into('part_master');


                            if (isNaN(partData.G)) {
                                fail++;
                                let values = _.values(partData)
                                values.unshift('Unit cost is not a number.')
                                errors.push(values);
                                continue;
                            }

                            if (isNaN(partData.F)) {
                                fail++;
                                let values = _.values(partData)
                                values.unshift('Quantity is not a number.')
                                errors.push(values);
                                continue;
                            }

                            let quantityData = { partId: resultData[0].id, unitCost: partData.G, quantity: partData.F, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId };
                            let partQuantityResult = await knex.insert(quantityData).returning(['*']).into('part_ledger');

                            if (resultData && resultData.length) {
                                success++;
                            }
                            // } else {
                            //     fail++;
                            //     let values = _.values(partData)
                            //     values.unshift('Part name with corresponding part code already exists.')
                            //     errors.push(values);
                            // }

                        }
                    }
                    let message = null;
                    if (totalData == success) {
                        message =
                            "System has processed processed ( " +
                            totalData +
                            " ) entries and added them successfully!";
                    } else {
                        message =
                            "System has processed processed ( " +
                            totalData +
                            " ) entries out of which only ( " +
                            success +
                            " ) are added and others are failed ( " +
                            fail +
                            " ) due to validation!";
                    }


                    const update = await knex('part_master').update({ isActive: true }).where({ orgId: req.orgId, isActive: true }).returning(['*'])


                    //let deleteFile = await fs.unlink(file_path, (err) => { console.log("File Deleting Error " + err) })
                    return res.status(200).json({
                        message: message,
                        errors
                    });
                }

            } else {

                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
                    ]
                });
            }
            // } else {

            // return res.status(400).json({
            //     errors: [
            //         { code: "VALIDATION_ERROR", message: "Please Choose valid File!" }
            //     ]
            // });

            // }

        } catch (err) {
            console.log("[controllers][propertysetup][importCompanyData] :  Error", err);
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    exportPartData: async(req, res) => {
        try {


            let payload = req.body;
            let [rows] = await Promise.all([

                knex.from('part_master')
                .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
                .leftJoin(
                    "companies",
                    "part_master.companyId",
                    "companies.id"
                )
                .select([
                    "part_master.partCode as PART_CODE",
                    "part_master.partName as PART_NAME",
                    "part_master.unitOfMeasure as UNIT_OF_MEASURE",
                    "part_category_master.categoryName as PART_CATEGORY_CODE",
                    "companies.companyId as COMPANY_ID",
                    knex.raw('SUM("part_ledger"."quantity") as QUANTITY'),
                    //knex.raw('MAX("part_ledger"."unitCost") as UNIT_COST'),
                    "part_master.avgUnitPrice as AVG_UNIT_COST",
                    "part_master.minimumQuantity as MINIMUM_QUANTITY",

                ])
                .where(qb => {
                    if (payload.partName) {
                        qb.where('part_master.partName', 'iLIKE', `%${payload.partName}%`)
                    }
                    if (payload.partCode) {
                        qb.where('part_master.partCode', 'iLIKE', `%${payload.partCode}%`)
                    }
                    if (payload.partCategory) {
                        qb.where('part_master.partCategory', payload.partCategory)
                    }
                    if (payload.partId) {
                        qb.where('part_master.displayId', payload.partId)
                    }
                    if (payload.company) {
                        qb.where('part_master.companyId', payload.company)
                    }

                })
                .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                .groupBy(['part_master.id', 'part_category_master.id', 'companies.id'])
                //.distinct('part_master.id as ""')
            ])

            let tempraryDirectory = null;
            let bucketName = null;
            if (process.env.IS_OFFLINE) {
                bucketName = process.env.S3_BUCKET_NAME;
                tempraryDirectory = "tmp/";
            } else {
                tempraryDirectory = "/tmp/";
                bucketName = process.env.S3_BUCKET_NAME;
            }

            var wb = XLSX.utils.book_new({ sheet: "Sheet JS" });


            var ws;
            if (rows && rows.length) {
                ws = XLSX.utils.json_to_sheet(rows);
            } else {
                ws = XLSX.utils.json_to_sheet([{
                    PART_CODE: "",
                    PART_NAME: "",
                    UNIT_OF_MEASURE: "",
                    PART_CATEGORY_CODE: "",
                    COMPANY_ID: "",
                    quantity: "",
                    unit_cost: "",
                    MINIMUM_QUANTITY: "",
                }]);
            }

            //var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
            let filename = "PartData-" + Date.now() + ".csv";
            let filepath = tempraryDirectory + filename;
            let check = XLSX.writeFile(wb, filepath);
            const AWS = require("aws-sdk");
            fs.readFile(filepath, function(err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/Part/" + filename,
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
                        let url = process.env.S3_BUCKET_URL + "/Export/Part/" +
                            filename;
                        // let url =
                        //     "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Part/" +
                        //     filename;

                        return res.status(200).json({
                            data: {
                                parts: rows
                            },
                            url: url,
                            message: "Part Data Export Successfully!",
                        });
                    }
                });
            });




        } catch (err) {

            console.log(err);
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }
    },
    getServiceRequestAssignedParts: async(req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { serviceRequestId } = req.body;
            let serviceOrderResult = await knex('service_orders').where({ orgId: req.orgId, serviceRequestId: serviceRequestId }).returning(['*']).first();

            console.log("serviceRequestPArtsData", serviceOrderResult);

            if (!serviceOrderResult) {
                pagination.total = 0;
                pagination.per_page = per_page;
                pagination.offset = offset;
                pagination.to = offset + 0;
                pagination.last_page = null;
                pagination.current_page = page;
                pagination.from = offset;
                pagination.data = [];

                return res.status(200).json({
                    data: {
                        assignedParts: pagination
                    }
                })
            }


            let serviceOrderId = serviceOrderResult.id;

            [total, rows] = await Promise.all([
                knex("part_master")
                .innerJoin(
                    "assigned_parts",
                    "part_master.id",
                    "assigned_parts.partId"
                )
                .select([
                    "part_master.partName as partName",
                    "part_master.id as id",
                    "part_master.partCode as partCode",
                    "assigned_parts.quantity as quantity",
                    "assigned_parts.unitCost as unitCost",
                    "assigned_parts.status as status",
                    "assigned_parts.id as apId",
                    "part_master.displayId as pNo",

                ])
                .where({
                    "assigned_parts.entityId": serviceOrderId,
                    "assigned_parts.entityType": "service_orders"
                }),
                knex("part_master")
                .innerJoin(
                    "assigned_parts",
                    "part_master.id",
                    "assigned_parts.partId"
                )
                .select([
                    "part_master.partName as partName",
                    "part_master.id as id",
                    "part_master.partCode as partCode",
                    "assigned_parts.quantity as quantity",
                    "assigned_parts.unitCost as unitCost",
                    "assigned_parts.status as status",
                    "assigned_parts.id as apId",
                    "part_master.displayId as pNo",

                ])
                .where({
                    "assigned_parts.entityId": serviceOrderId,
                    "assigned_parts.entityType": "service_orders"
                })
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
                    assignedParts: pagination
                }
            })


        } catch (err) {
            console.log(err);
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getServiceOrderAssignedParts: async(req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { serviceOrderId } = req.body;


            [total, rows] = await Promise.all([
                knex("part_master")
                .innerJoin(
                    "assigned_parts",
                    "part_master.id",
                    "assigned_parts.partId"
                )
                //.leftJoin('part_ledger_sum', 'part_ledger_sum.partId', 'part_master.id')
                .select([
                    "part_master.partName as partName",
                    "part_master.id as id",
                    "part_master.partCode as partCode",
                    "assigned_parts.quantity as quantity",
                    "assigned_parts.unitCost as unitCost",
                    "assigned_parts.status as status",
                    "assigned_parts.id as apId",
                    "part_master.displayId as pNo",
                    "assigned_parts.avgUnitPrice"
                ])
                .where({
                    entityId: serviceOrderId,
                    entityType: "service_orders"
                }),
                knex("part_master")
                .innerJoin(
                    "assigned_parts",
                    "part_master.id",
                    "assigned_parts.partId"
                )
                //.leftJoin('part_ledger_sum', 'part_ledger_sum.partId', 'part_master.id')
                //.leftJoin('part_ledger_sum', 'part_master.id', 'part_ledger_sum.partId')
                .select([
                    "part_master.partName as partName",
                    "part_master.id as id",
                    "part_master.partCode as partCode",
                    "assigned_parts.quantity as quantity",
                    "assigned_parts.unitCost as unitCost",
                    "assigned_parts.status as status",
                    "assigned_parts.id as apId",
                    "part_master.displayId as pNo",
                    "assigned_parts.avgUnitPrice"
                ])
                .where({
                    entityId: serviceOrderId,
                    entityType: "service_orders"
                })
                .offset(offset)
                .limit(per_page)
            ]);



            // const Parallel = require('async-parallel');

            // rows = await Parallel.map(rows, async st => {


            //     return {...st, "unitCost": st.avgUnitPrice };

            // })


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
                    assignedParts: pagination
                }
            })


        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationAssignedParts: async(req, res) => {
        try {
            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            let { quotationId } = req.body;


            [total, rows] = await Promise.all([
                knex("part_master")
                .innerJoin(
                    "assigned_parts",
                    "part_master.id",
                    "assigned_parts.partId"
                )
                //.leftJoin('part_ledger_sum', 'part_master.id', 'part_ledger_sum.partId')
                .select([
                    "part_master.partName as partName",
                    "part_master.id as id",
                    "part_master.partCode as partCode",
                    "assigned_parts.quantity as quantity",
                    "assigned_parts.unitCost as unitCost",
                    "assigned_parts.id as apId",
                    "part_master.displayId as pNo",
                    "assigned_parts.avgUnitPrice"


                ])
                .where({
                    entityId: quotationId,
                    entityType: "quotations"
                }),
                knex("part_master")
                .innerJoin(
                    "assigned_parts",
                    "part_master.id",
                    "assigned_parts.partId"
                )
                //.leftJoin('part_ledger_sum', 'part_master.id', 'part_ledger_sum.partId')
                .select([
                    "part_master.partName as partName",
                    "part_master.id as id",
                    "part_master.partCode as partCode",
                    "assigned_parts.quantity as quantity",
                    "assigned_parts.unitCost as unitCost",
                    "assigned_parts.id as apId",
                    "part_master.displayId as pNo",
                    "assigned_parts.avgUnitPrice"

                ])
                .where({
                    entityId: quotationId,
                    entityType: "quotations"
                })
                .offset(offset)
                .limit(per_page)
            ]);

            const Parallel = require('async-parallel');

            // rows = await Parallel.map(rows, async row => {


            //     return {...row, unitCost: row.avgUnitPrice };

            // })


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
                    assignedParts: pagination
                }
            })


        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getPendingApprovalRequestsForParts: async(req, res) => {
        try {

            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let filters = {}
            if (req.body.entityType) {
                filters['assigned_parts.entityType'] = req.body.entityType;
            } else {
                filters['assigned_parts.entityType'] = 'service_orders';
            }
            if (req.body.status) {
                filters['assigned_parts.status'] = req.body.status;
            }
            if (req.body.partId) {
                filters['part_master.displayId'] = req.body.partId
            }
            if (req.body.serviceOrderId && filters['assigned_parts.entityType'] == 'service_orders') {
                filters['service_orders.displayId'] = req.body.serviceOrderId
            } else if (req.body.serviceOrderId && filters['assigned_parts.entityType'] == 'task_assigned_part') {
                filters['task_group_schedule_assign_assets.displayId'] = req.body.serviceOrderId
            } else if (req.body.serviceOrderId) {
                filters['service_orders.displayId'] = req.body.serviceOrderId
            }

            [total, rows] = await Promise.all([
                    knex('assigned_parts')
                    .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                    .leftJoin('service_orders', 'assigned_parts.entityId', 'service_orders.id')
                    .leftJoin('task_assigned_part', 'assigned_parts.entityId', 'task_assigned_part.id')
                    .leftJoin('task_group_schedule_assign_assets', 'task_assigned_part.workOrderId', 'task_group_schedule_assign_assets.id')
                    .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                    .select([
                        'assigned_parts.id as approvalId',
                        'assigned_parts.entityType as enType',
                        'part_master.id',
                        'part_master.displayId as PNo',
                        'part_master.partName',
                        'part_master.minimumQuantity',
                        'assigned_parts.unitCost as requestedPartsUnitCost',
                        'assigned_parts.quantity as requestedParts',
                        'assigned_parts.status as approvalStatus',
                        'assigned_parts.entityId',
                        'service_orders.displayId as SONo',
                        "task_group_schedule_assign_assets.id as workOrderId",
                        "task_group_schedule_assign_assets.displayId as TGAA",
                    ])
                    .where({
                        'part_master.orgId': req.orgId,
                        // 'assigned_parts.entityType': 'service_orders'
                    })
                    .where(qb => {

                        if (req.body.entityType) {
                            qb.where('assigned_parts.entityType', req.body.entityType);
                        } else {
                            qb.whereIn('assigned_parts.entityType', ['service_orders', 'task_assigned_part']);
                        }
                        if (req.body.status) {
                            qb.where('assigned_parts.status', req.body.status);
                        }
                        if (req.body.partId) {
                            qb.where('part_master.displayId', req.body.partId)
                        }

                        if (req.body.serviceOrderId) {

                            qb.where('service_orders.displayId', req.body.serviceOrderId)
                            qb.orWhere('task_group_schedule_assign_assets.displayId', req.body.serviceOrderId)
                        }


                        if (!_.isEmpty(filters)) {
                            //qb.where(filters)
                        }
                        if (req.body.partName) {
                            qb.where('part_master.partName', 'ilike', `%${req.body.partName}%`)
                        }
                    }),

                    knex('assigned_parts')
                    .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                    .leftJoin('service_orders', 'assigned_parts.entityId', 'service_orders.id')
                    .leftJoin('task_assigned_part', 'assigned_parts.entityId', 'task_assigned_part.id')
                    .leftJoin('task_group_schedule_assign_assets', 'task_assigned_part.workOrderId', 'task_group_schedule_assign_assets.id')
                    .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                    .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')
                    //.leftJoin('users', 'service_requests.approvedBy', 'users.id')
                    .select(['assigned_parts.id as approvalId',
                        'part_master.partCategory',
                        'part_master.id',
                        'part_master.displayId as PNo',
                        'part_master.partName',
                        'part_master.minimumQuantity',
                        'assigned_parts.unitCost as requestedPartsUnitCost',
                        'assigned_parts.quantity as requestedParts',
                        'assigned_parts.status as approvalStatus',
                        'assigned_parts.entityId',
                        'assigned_parts.entityType as enType',
                        'service_orders.displayId as SONo',
                        'task_assigned_part.id as TPID',
                        "task_group_schedule_assign_assets.id as workOrderId",
                        "task_group_schedule_assign_assets.displayId as TGAA",
                        "assigned_parts.createdAt",
                        "requested_by.name as requestedBy",
                        "requested_by.id as requestedById"

                    ])
                    .where({
                        'part_master.orgId': req.orgId,
                        // 'assigned_parts.entityType': 'service_orders'
                    })
                    //  .orWhere({ 
                    //     'part_master.orgId': req.orgId, 
                    //     'assigned_parts.entityType': 'task_assigned_part'
                    // })
                    .where(qb => {

                        if (req.body.entityType) {
                            qb.where('assigned_parts.entityType', req.body.entityType);
                        } else {
                            qb.whereIn('assigned_parts.entityType', ['service_orders', 'task_assigned_part']);
                        }
                        if (req.body.status) {
                            qb.where('assigned_parts.status', req.body.status);
                        }
                        if (req.body.partId) {
                            qb.where('part_master.displayId', req.body.partId)
                        }

                        if (req.body.serviceOrderId) {

                            qb.where('service_orders.displayId', req.body.serviceOrderId)
                            qb.orWhere('task_group_schedule_assign_assets.displayId', req.body.serviceOrderId)
                        }


                        if (!_.isEmpty(filters)) {
                            //  qb.where(filters)
                        } else {
                            // qb.whereIn('assigned_parts.entityType', ['service_orders', 'task_assigned_part'])
                        }
                        if (req.body.partName) {
                            qb.where('part_master.partName', 'ilike', `%${req.body.partName}%`)
                        }
                    })
                    //.whereIn('assigned_parts.entityType', ['service_orders', 'task_assigned_part'])
                    .orderBy('assigned_parts.createdAt', 'desc')
                    .offset(offset)
                    .limit(per_page)
                ])
                // .distinct(['part_master.id'])
            const Parallel = require('async-parallel')
            const partsWithTotalQuantity = await Parallel.map(rows, async(part) => {
                let { id } = part;
                let quantity = await knex('part_ledger').where({ partId: id, orgId: req.orgId }).select('quantity')
                let totalParts = 0
                for (let i = 0; i < quantity.length; i++) {
                    const element = quantity[i];
                    totalParts += Number(element.quantity);
                }
                let me = req.me;
                return {...part, totalParts, issueBy: me.name }
            })


            let count = total.length;
            pagination.total = count;
            pagination.per_page = per_page;
            pagination.offset = offset;
            pagination.to = offset + rows.length;
            pagination.last_page = Math.ceil(count / per_page);
            pagination.current_page = page;
            pagination.from = offset;
            pagination.data = partsWithTotalQuantity;

            return res.status(200).json({
                data: {
                    pagination
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    approvePartRequisitionRequest: async(req, res) => {
        try {
            let approvalId = req.body.approvalId;
            let currentTime = new Date().getTime();
            let payload = req.body;
            let recDate = new Date(payload.receiveDate).getTime()
                // let issueDate = new Date(payload.issueDate).getTime();
            let receiveById;
            let issueToId;
            let issueById;
            let getInfoData = await knex("assigned_parts")
                .select(
                    "assigned_parts.entityId as Id"
                )
                .where({
                    id: approvalId,
                    entityType: "task_assigned_part"
                }).first();

            console.log("getInfoData", getInfoData);

            const update = await knex('assigned_parts').update({ status: 'approved' }).where({ orgId: req.orgId, id: approvalId }).returning(['*'])
            let assignedResult = update[0];
            let quantity = "-" + assignedResult.quantity;


            /*GET RECEIVE BY & ISSUE BY & ISSUE TO ID OPEN */

            if (payload.receiveBy) {

                let requestByData = await knex('adjust_part_users')
                    .where({ name: payload.receiveBy, orgId: req.orgId })
                    //.orWhere({ mobile: partStockPayload.mobile })
                    //.orWhere({ email: partStockPayload.email })
                    .returning(['*']);

                if (requestByData && requestByData.length) {

                    receiveById = requestByData[0].id;
                } else {

                    let requestedByResult = await knex('adjust_part_users').insert({
                        name: payload.receiveBy,
                        // mobile: partStockPayload.mobile,
                        //email: partStockPayload.email,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                    }).returning(['*'])
                    receiveById = requestedByResult[0].id;
                }
            }


            if (payload.issueBy) {

                let issueData = await knex('adjust_part_users')
                    .where({ name: payload.issueBy, orgId: req.orgId })
                    //.orWhere({ mobile: partStockPayload.mobile })
                    //.orWhere({ email: partStockPayload.email })
                    .returning(['*']);

                if (issueData && issueData.length) {

                    issueById = issueData[0].id;
                } else {

                    let issueByResult = await knex('adjust_part_users').insert({
                        name: payload.issueBy,
                        // mobile: partStockPayload.mobile,
                        //email: partStockPayload.email,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                    }).returning(['*'])
                    issueById = issueByResult[0].id;
                }
            }

            if (payload.issueTo) {

                let issueToData = await knex('adjust_part_users')
                    .where({ name: payload.issueTo, orgId: req.orgId })
                    //.orWhere({ mobile: partStockPayload.mobile })
                    //.orWhere({ email: partStockPayload.email })
                    .returning(['*']);

                if (issueToData && issueToData.length) {

                    issueToId = issueToData[0].id;
                } else {

                    let issueToResult = await knex('adjust_part_users').insert({
                        name: payload.issueTo,
                        // mobile: partStockPayload.mobile,
                        //email: partStockPayload.email,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                        orgId: req.orgId
                    }).returning(['*'])
                    issueToId = issueToResult[0].id;
                }
            }

            /*GET RECEIVE BY & ISSUE BY & ISSUE TO ID CLOSE */



            let ledgerObject = {
                partId: assignedResult.partId,
                unitCost: assignedResult.unitCost,
                quantity: quantity,
                isPartAdded: true,
                createdAt: currentTime,
                updatedAt: currentTime,
                adjustType: 1,
                serviceOrderNo: assignedResult.entityId,
                orgId: req.orgId,
                approvedBy: req.me.id,
                receiveBy: receiveById,
                receiveDate: recDate,
                issueBy: issueById,
                issueTo: issueToId,
                taskAssignPartId: assignedResult.entityId,
                // issueDate: issueDate,
            }
            let partLedger = await knex.insert(ledgerObject).returning(['*']).into('part_ledger');

            // update task_assigned_parts_in pm

            if (getInfoData) {

                const updateAssignParts = await knex('task_assigned_part').update({ status: 1 }).where({ orgId: req.orgId, id: getInfoData.Id }).returning(['*'])
            }

            return res.status(200).json({
                data: {
                    updatedStatus: {...update, partLedger }
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    editPartRequisitionRequest: async(req, res) => {
        try {
            const payload = _.omit(req.body, ['approvalId', 'partCategory']);
            console.log('Payload:*********************************************** ', payload)

            const updated = await knex('assigned_parts')
                .update({
                    ...payload
                    /*partId:payload.partId,
                    unitCost: payload.requestedPartsUnitCost, 
                    quantity: payload.requestedParts*/
                })
                .where({ id: req.body.approvalId })

            return res.status(200).json({
                data: {
                    updatedApproval: updated
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    declinePartRequisitionRequest: async(req, res) => {
        try {
            let { approvalId } = req.body;
            const declined = await knex('assigned_parts').update({ status: 'declined' }).where({ id: approvalId, orgId: req.orgId }).returning(['*'])
            getInfoData = await knex('assigned_parts').select('*').where({ id: approvalId, entityType: 'task_assigned_part' }).returning(['*']).first();

            if (getInfoData) {
                updateAssignParts = await knex('task_assigned_part').update({ status: 2 }).where({ orgId: req.orgId, id: getInfoData.entityId })

            }
            return res.status(200).json({
                data: {
                    declined: declined
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getAllPartCategories: async(req, res) => {
        try {
            const allCategories = await knex('part_category_master')
                .where({ orgId: req.orgId }).select('*')

            return res.status(200).json({
                data: {
                    allPartCategories: allCategories
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getAvailableParts: async(req, res) => {
        try {
            const allStock = await knex('part_ledger').where({ partId: req.body.partId, orgId: req.orgId }).select('quantity')
            let total = 0
            for (let i = 0; i < allStock.length; i++) {
                const element = allStock[i];
                total += Number(element.quantity)

            }
            return res.status(200).json({
                data: {
                    total: total
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    //  CHECK SERVICE ID 
    checkServiceOrderId: async(req, res) => {
        try {
            let orgId = req.orgId;
            let serviceId = req.query.serviceId;
            let companyId = req.query.companyId;
            let result = "";
            result = await knex('service_orders').returning('*')
                .where({ companyId: companyId, displayId: serviceId, orgId: orgId })
            return res.status(200).json({
                data: result,
                message: "Service order Id Successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    //ALL ADJUST LIST FOR DROPDOWN

    allAdjustList: async(req, res) => {
        try {
            let orgId = req.orgId;

            let result = "";
            result = await knex('adjust_type').returning('*')
            return res.status(200).json({
                data: result,
                message: "Adjust list Successfully!"
            });
        } catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    deleteQuotationAssignedParts: async(req, res) => {
        try {
            const id = req.body.partId;
            const entityId = req.body.entityId;
            const entityType = req.body.entityType;


            const currentTime = new Date().getTime();


            let getQuotationId = await knex('assigned_parts').where({ id, "entityType": entityType }).select('entityId', 'partId');
            let quotationId = getQuotationId[0].entityId;
            let partId = getQuotationId[0].partId;
            let quotationsData = await knex(entityType).where({ "id": quotationId }).returning(['*']);
            console.log("quotationsJsonArray", quotationsData);
            //deletedRow = quotationsData;
            let filtered = {};
            if (quotationsData && quotationsData.invoiceData) {
                let invoiceData = quotationsData.invoiceData;
                console.log("invoiceData", invoiceData);
                let partsData = invoiceData.parts;
                console.log("parts data ++++++++++++++++++", partsData);

                filtered.parts = partsData.filter(function(partsData) {
                    return partsData.id !== partId;
                });

                console.log("filteredPartsLength", filtered.parts);

                let subTotalAmt = 0;
                let stotal = 0;
                for (let i = 0; i < filtered.parts.length; i++) {
                    console.log("idata", filtered.parts[i].quantity);
                    stotal = filtered.parts[i].unitCost * filtered.parts[i].quantity;
                    console.log("stotal", stotal);
                    subTotalAmt += stotal;
                }

                console.log("subTotalAmt", subTotalAmt);


                let subChargesTotalAmt = 0;
                let ctotal = 0;
                for (let q = 0; q < invoiceData.charges.length; q++) {
                    ctotal = invoiceData.charges[q].rate * invoiceData.charges[q].totalHours;
                    subChargesTotalAmt += ctotal;
                }
                let subTotalFinal = 0;
                subTotalFinal = (subTotalAmt + subChargesTotalAmt);
                let grandTotal = 0;
                grandTotal = subTotalFinal + (subTotalFinal * invoiceData.vatRate / 100);

                console.log("grandTotal", grandTotal);

                filtered.charges = invoiceData.charges;
                filtered.vatId = invoiceData.vatId;
                filtered.vatRate = invoiceData.vatRate;
                filtered.subTotal = subTotalFinal;
                filtered.grandTotal = grandTotal;


            }


            // deleteRow = filtered;
            const deletedRow = await knex('assigned_parts').where({ id, "entityType": entityType }).del().returning(['*'])

            let updateQuotationInvoiceData = await knex
                .update({
                    invoiceData: JSON.stringify(filtered),
                    updatedAt: currentTime
                })
                .where({ id: quotationId })
                .returning(["*"])
                .into(entityType);


            return res.status(200).json({
                data: {
                    updateQuotationInvoiceData,
                    message: 'Deleted row successfully!'
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    deleteQuotationAssignedPartsNew: async(req, res) => {
        try {
            const id = req.body.id;
            const currentTime = new Date().getTime();

            let getQuotationId = await knex('assigned_parts').where({ id, "entityType": "quotations" }).select('entityId', 'partId');
            let quotationId = getQuotationId[0].entityId;
            let partId = getQuotationId[0].partId;
            let quotationsData = await knex('quotations').where({ "id": quotationId }).returning(['*']);
            //console.log("quotationsJsonArray", quotationsData);
            //deletedRow = quotationsData;
            // let invoiceData = quotationsData[0].invoiceData[0];
            // console.log("invoiceData", invoiceData);
            // let partsData = invoiceData.parts;
            // let filtered = {}

            // filtered.parts = partsData.filter(function (partsData) {
            //     return partsData.id !== partId;
            // });
            // console.log("filtererdPartsLength", filtered.parts);

            // let subTotalAmt = 0;
            // let stotal = 0;
            // for (let i = 0; i < filtered.parts.length; i++) {
            //     console.log("idata", filtered.parts[i].quantity);
            //     stotal = filtered.parts[i].unitCost * filtered.parts[i].quantity;
            //     console.log("stotal", stotal);
            //     subTotalAmt += stotal;
            // }

            // console.log("subTotalAmit", subTotalAmt);


            // let subChargesTotalAmt = 0;
            // let ctotal = 0;
            // for (let q = 0; q < invoiceData.charges.length; q++) {
            //     ctotal = invoiceData.charges[q].rate * invoiceData.charges[q].totalHours;
            //     subChargesTotalAmt += ctotal;
            // }
            // let subTotalFinal = 0;
            // subTotalFinal = (subTotalAmt + subChargesTotalAmt);
            // let grandTotal = 0;
            // grandTotal = subTotalFinal + (subTotalFinal * invoiceData.vatRate / 100);

            // console.log("grandTotal", grandTotal);

            // filtered.charges = invoiceData.charges;
            // filtered.vatId = invoiceData.vatId;
            // filtered.vatRate = invoiceData.vatRate;
            // filtered.subTotal = subTotalFinal;
            // filtered.grandTotal = grandTotal;

            // deleteRow = filtered;
            const deletedRow = await knex('assigned_parts').where({ id, "entityType": "quotations" }).del().returning(['*'])

            // let updateQuotationInvoiceData = await knex
            //     .update({
            //         invoiceData: JSON.stringify(filtered),
            //         updatedAt: currentTime
            //     })
            //     .where({ id: quotationId })
            //     .returning(["*"])
            //     .into("quotations");


            return res.status(200).json({
                data: {
                    message: 'Deleted row successfully!'
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    generateNewPartId: async(req, res) => {
        try {
            let currentTime = new Date().getTime()
            const newPart = await knex('part_master').insert({ createdAt: currentTime, updatedAt: currentTime }).returning(['*'])

            return res.status(200).json({
                data: {
                    newPart: newPart[0]
                },
                message: 'New part id generated successfully!'
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /* STOCK REPORT*/
    stockReport: async(req, res) => {
        try {

            let payload = req.body;
            let fromDate = payload.fromDate;
            let toDate = payload.toDate;

            if (fromDate && toDate) {

                let fromNewDate = moment(fromDate).startOf('date').format();
                let toNewDate = moment(toDate).endOf('date', 'days').format();
                let fromTime = new Date(fromNewDate).getTime();
                let toTime = new Date(toNewDate).getTime();


                let stockResult = await knex.from('part_ledger')
                    .leftJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                    .leftJoin('buildings_and_phases', 'part_ledger.building', 'buildings_and_phases.id')
                    .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
                    .leftJoin('floor_and_zones', 'part_ledger.floor', 'floor_and_zones.id')
                    .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                    .leftJoin('adjust_part_users as re', 'part_ledger.receiveBy', 're.id')
                    .leftJoin('adjust_part_users as ib', 'part_ledger.issueBy', 'ib.id')
                    .leftJoin('adjust_part_users as it', 'part_ledger.issueTo', 'it.id')
                    .select([
                        'part_ledger.*',
                        'part_master.partName',
                        'part_master.partCode',
                        'part_master.unitOfMeasure',
                        'part_master.displayId as PNo',
                        'part_category_master.categoryName as partCategory',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingDescription',
                        'projects.project as projectCode',
                        'projects.projectName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorDescripton',
                        'adjust_type.adjustType as adjustTypeName',
                        're.name as receiveByName',
                        'ib.name as issueByName',
                        'it.name as issueToName'

                    ])
                    .where(qb => {
                        if (payload.partId) {

                            qb.where('part_ledger.partId', payload.partId)
                        }

                        if (payload.partCode) {

                            qb.where('part_master.partCode', 'iLIKE', `%${payload.partCode}%`)
                        }

                        if (payload.partName) {

                            qb.where('part_master.partName', 'iLIKE', `%${payload.partName}%`)
                        }

                        if (payload.partCategory) {

                            qb.where('part_master.partCategory', payload.partCategory)
                        }

                        if (payload.adjustType) {

                            qb.where('part_ledger.adjustType', payload.adjustType)
                        }

                    })
                    .where({ 'part_ledger.orgId': req.orgId })
                    .whereBetween('part_ledger.createdAt', [fromDate, toDate])
                    .orderBy('part_ledger.createdAt', 'asc', 'part_ledger.partId', 'asc')


                //let lessOne = moment(fromTime) 

                let fromDateEnd = moment(fromTime).startOf('date').format();
                let fromTimeEnd = new Date(fromDateEnd).getTime();


                const Parallel = require('async-parallel')
                const final = await Parallel.map(_.uniqBy(stockResult, 'partId'), async(st) => {
                    let balance = await knex.from('part_ledger')
                        .sum('quantity as quantity')
                        .where('part_ledger.createdAt', '<', fromDate)
                        //.where('part_ledger.createdAt', '<', fromTimeEnd)
                        .where({ partId: st.partId, orgId: req.orgId }).first();


                    //.whereBetween('part_ledger.createdAt', [fromTime, toTime]).first()

                    let stockData = await knex.from('part_ledger')
                        .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                        .leftJoin('adjust_part_users as re', 'part_ledger.receiveBy', 're.id')
                        .leftJoin('adjust_part_users as ib', 'part_ledger.issueBy', 'ib.id')
                        .leftJoin('adjust_part_users as it', 'part_ledger.issueTo', 'it.id')
                        .select([
                            'part_ledger.*',
                            'adjust_type.adjustType as adjustTypeName',
                            're.name as receiveByName',
                            'ib.name as issueByName',
                            'it.name as issueToName'
                        ])
                        .where(qb => {

                            if (payload.adjustType) {

                                qb.where('part_ledger.adjustType', payload.adjustType)
                            }
                        })
                        .where({ 'part_ledger.orgId': req.orgId, partId: st.partId })
                        .whereBetween('part_ledger.createdAt', [fromDate, toDate])
                        .orderBy('part_ledger.createdAt', 'asc', 'part_ledger.partId', 'asc');



                    let openingBalance = 0;
                    if (balance.quantity) {
                        openingBalance = balance.quantity;
                    }




                    let updatedStockDataWithInAndOut = [];
                    let newBal = openingBalance;
                    let s = 0;
                    let totalIn = 0;
                    let totalOut = 0;
                    for (let d of stockData) {
                        s++;
                        let i = 0;
                        let o = 0;
                        let bal = 0

                        //  if (d.quantity && d.quantity.includes('-')) {

                        if (d.quantity && Math.sign(d.quantity) == -1) {
                            o = Number(d.quantity)
                                //    balance.totalQuantity = Number(balance.totalQuantity) + o
                                //if (s > 1) {
                            bal = Number(newBal) + o;
                            //} else {
                            //   bal = Number(balance.quantity);
                            //}

                        } else {

                            i = Number(d.quantity)
                                //    balance.totalQuantity = Number(balance.totalQuantity) + i
                                //if (s > 1) {
                            bal = Number(newBal) + i;
                            //} else {
                            //   bal = Number(balance.quantity);
                            //}

                        }
                        newBal = bal;
                        totalIn += i;
                        totalOut += Math.abs(o);

                        updatedStockDataWithInAndOut.push({...d, in: i, out: o, balance: newBal, totalIn: totalIn, totalOut: totalOut })
                    }



                    return {
                        PNo: st.PNo,
                        partId: st.partId,
                        partCode: st.partCode,
                        partName: st.partName,
                        openingBalance: openingBalance,
                        stockData: updatedStockDataWithInAndOut,
                        unitOfMeasure: st.unitOfMeasure
                    }
                })


                /*Export Data open */
                let updatedStockDataWithInAndOut2 = [];
                let newBal2 = 0;
                let s2 = 0;
                let totalIn2 = 0;
                let totalOut2 = 0;
                let partArr = [];
                for (let d2 of _.orderBy(stockResult, 'partName')) {
                    s2++;
                    let i2 = 0;
                    let o2 = 0;
                    let bal2 = 0

                    var lastValue = partArr[partArr.length - 1];

                    if (d2.partCode == lastValue) {
                        // console.log("yesss",lastValue)

                    } else {

                        newBal2 = 0;
                        //console.log("NOOOOOOOOOOOOOoo")
                    }

                    partArr.push(d2.partCode);



                    if (d2.quantity && Math.sign(d2.quantity) == -1) {
                        o2 = Number(d2.quantity)


                        //    balance.totalQuantity = Number(balance.totalQuantity) + o
                        //if (s > 1) {
                        bal2 = Number(newBal2) + o2;
                        //} else {
                        //   bal = Number(balance.quantity);
                        //}

                    } else {

                        i2 = Number(d2.quantity)
                            //    balance.totalQuantity = Number(balance.totalQuantity) + i
                            //if (s > 1) {
                        bal2 = Number(newBal2) + i2;
                        //} else {
                        //   bal = Number(balance.quantity);
                        //}


                    }


                    newBal2 = bal2;
                    totalIn2 += i2;
                    totalOut2 += Math.abs(o2);

                    updatedStockDataWithInAndOut2.push({...d2, in: i2, out: o2, balance: newBal2, totalIn: totalIn2, totalOut: totalOut2, partArr })
                }
                /*Export Data close */

                res.status(200).json({
                    data: {
                        stockReport: final,
                        fromDate,
                        toDate,
                        fromTime,
                        toTime,
                        exportStockData: updatedStockDataWithInAndOut2,
                    },
                    message: "Stock report Successfully!"
                })

            }
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    /*GET REQUISITION REPORT */
    getRequisitionReport: async(req, res) => {

        try {

            let meData = req.me;
            let payload = req.query;
            const schema = Joi.object().keys({
                id: Joi.string().required(),
                soId: Joi.string().required()
            });

            const result = Joi.validate(payload, schema);
            console.log("[controllers][service][problem]: JOi Result", result);

            if (result && result.hasOwnProperty("error") && result.error) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: result.error.message }
                    ]
                });
            }


            let serviceResult = await knex('service_orders')
                .leftJoin('service_requests', 'service_orders.serviceRequestId', 'service_requests.id')
                .leftJoin('companies', 'service_requests.companyId', 'companies.id')
                .leftJoin('projects', 'service_requests.projectId', 'projects.id')
                .leftJoin('property_units', 'service_requests.houseId', 'property_units.id')
                .leftJoin('buildings_and_phases', 'property_units.buildingPhaseId', 'buildings_and_phases.id')
                .leftJoin('requested_by', 'service_requests.requestedBy', 'requested_by.id')

            .select([
                    'service_orders.*',
                    'companies.companyId',
                    'companies.companyName',
                    'companies.logoFile',
                    'projects.project as ProjectCode',
                    'projects.projectName',
                    'buildings_and_phases.buildingPhaseCode',
                    'buildings_and_phases.description as BuildingDescription',
                    'requested_by.name as requestedByUser',

                ])
                .where({ 'service_orders.id': payload.soId, 'service_orders.orgId': req.orgId }).first();

            let partResult = await knex('assigned_parts')
                .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                .select([
                    'assigned_parts.*',
                    'part_master.*',
                    'part_category_master.*',
                    'assigned_parts.createdAt as requestedAt'
                ])
                .where({ 'assigned_parts.id': payload.id, 'assigned_parts.orgId': req.orgId })

            let approveResult = await knex('part_ledger').where({ 'serviceOrderNo': payload.soId, 'part_ledger.orgId': req.orgId })
                .leftJoin("users", 'part_ledger.approvedBy', 'users.id')
                .leftJoin('adjust_part_users as iBy', 'part_ledger.issueBy', 'iBy.id')
                .leftJoin('adjust_part_users as iTo', 'part_ledger.issueTo', 'iTo.id')
                //.leftJoin('adjust_part_users as rBy', 'part_ledger.issueBy', 'rBy.id')
                //.leftJoin('users as ib', 'part_ledger.issueBy', 'ib.id')
                //.leftJoin('users as it', 'part_ledger.issueTo', 'it.id')
                .select([
                    'users.name as approvedUser',
                    'part_ledger.createdAt as approvedAt',
                    'iBy.name as issueBy',
                    'iTo.name as issueTo',
                    'part_ledger.issueDate',
                    'part_ledger.receiveDate'
                ])
                .first()


            const Parallel = require('async-parallel')
            partResult = await Parallel.map(partResult, async(part) => {
                // let { id } = part;
                let quantity = await knex('part_ledger').where({ partId: part.partId, orgId: req.orgId }).select('quantity')
                let totalParts = 0
                for (let i = 0; i < quantity.length; i++) {
                    const element = quantity[i];
                    totalParts += Number(element.quantity);
                }
                return {...part, totalParts }
            })

            res.status(200).json({
                data: {...serviceResult, printedBy: meData, partResult, approveResult },
                message: "Requsition report Successfully!"
            })



        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    },
    /*GET BUILDING LIST BY PART ID */
    getBuildingListByPartId: async(req, res) => {

        try {

            let partId = req.query.partId;
            let partResult = await knex.from('part_master').where({ id: partId, orgId: req.orgId }).first();

            let projectResult = await knex.from('projects').where({ companyId: partResult.companyId, orgId: req.orgId });

            let projectIds = projectResult.map(v => v.id);
            let buildingResult = await knex('buildings_and_phases')
                .whereIn('projectId', projectIds)
                .where({ orgId: req.orgId })


            res.json({
                data: buildingResult,
                message: "Building list successfully!"
            })


        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }

    },
    /*STOCK SUMMARY REPORT */
    stockSummaryReport: async(req, res) => {

        try {

            let payload = req.body;
            let fromDate = payload.fromDate;
            let toDate = payload.toDate;

            if (fromDate && toDate) {

                let fromNewDate = moment(fromDate).startOf('date').format();
                let toNewDate = moment(toDate).endOf('date', 'days').format();
                let fromTime = new Date(fromNewDate).getTime();
                let toTime = new Date(toNewDate).getTime();


                let stockResult = await knex.from('part_ledger')
                    .leftJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                    .leftJoin('buildings_and_phases', 'part_ledger.building', 'buildings_and_phases.id')
                    .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
                    .leftJoin('floor_and_zones', 'part_ledger.floor', 'floor_and_zones.id')
                    .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')

                .select([
                        'part_ledger.*',
                        'part_master.partName',
                        'part_master.partCode',
                        'part_master.unitOfMeasure',
                        'part_category_master.categoryName as partCategory',
                        'buildings_and_phases.buildingPhaseCode',
                        'buildings_and_phases.description as buildingDescription',
                        'projects.project as projectCode',
                        'projects.projectName',
                        'floor_and_zones.floorZoneCode',
                        'floor_and_zones.description as floorDescripton',
                        'adjust_type.adjustType as adjustTypeName',
                        'part_master.minimumQuantity',
                        'part_master.avgUnitPrice as avgUnitPriceMaster'

                    ])
                    .where(qb => {
                        if (payload.partId) {

                            qb.where('part_ledger.partId', payload.partId)
                        }

                        if (payload.partCode) {

                            qb.where('part_master.partCode', 'iLIKE', `%${payload.partCode}%`)
                        }

                        if (payload.partName) {

                            qb.where('part_master.partName', 'iLIKE', `%${payload.partName}%`)
                        }

                        if (payload.partCategory) {

                            qb.where('part_master.partCategory', payload.partCategory)
                        }

                        if (payload.adjustType) {

                            qb.where('part_ledger.adjustType', payload.adjustType)
                        }

                    })
                    .where({ 'part_ledger.orgId': req.orgId })
                    .whereBetween('part_ledger.createdAt', [fromDate, toDate])
                    .orderBy('part_ledger.createdAt', 'asc', 'part_ledger.partId', 'asc')


                let fromDateEnd = moment(fromTime).startOf('date').format();
                let fromTimeEnd = new Date(fromDateEnd).getTime();


                const Parallel = require('async-parallel');

                const final = await Parallel.map(_.uniqBy(stockResult, 'partId'), async(st) => {


                    let openingQuantity = await knex.from('part_ledger')
                        .sum('quantity as quantity')
                        .where('part_ledger.createdAt', '<', fromDate)
                        .where({ partId: st.partId, orgId: req.orgId }).first();

                    let openingBalance;
                    if (openingQuantity.quantity) {
                        openingBalance = openingQuantity.quantity;
                    }


                    let stockPostive = await knex.from('part_ledger').sum('quantity as positveValue')
                        .leftJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                        .leftJoin('buildings_and_phases', 'part_ledger.building', 'buildings_and_phases.id')
                        .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
                        .leftJoin('floor_and_zones', 'part_ledger.floor', 'floor_and_zones.id')
                        .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')

                    // .select([
                    //     'part_ledger.*',
                    //     'part_master.partName',
                    //     'part_master.partCode',
                    //     'part_master.unitOfMeasure',
                    //     'part_category_master.categoryName as partCategory',
                    //     'buildings_and_phases.buildingPhaseCode',
                    //     'buildings_and_phases.description as buildingDescription',
                    //     'projects.project as projectCode',
                    //     'projects.projectName',
                    //     'floor_and_zones.floorZoneCode',
                    //     'floor_and_zones.description as floorDescripton',
                    //     'adjust_type.adjustType as adjustTypeName',
                    //     'part_master.minimumQuantity'

                    // ])
                    .where(qb => {
                            if (payload.partId) {

                                qb.where('part_ledger.partId', payload.partId)
                            }

                            if (payload.partCode) {

                                qb.where('part_master.partCode', 'iLIKE', `%${payload.partCode}%`)
                            }

                            if (payload.partName) {

                                qb.where('part_master.partName', 'iLIKE', `%${payload.partName}%`)
                            }

                            if (payload.partCategory) {

                                qb.where('part_master.partCategory', payload.partCategory)
                            }

                            if (payload.adjustType) {

                                qb.where('part_ledger.adjustType', payload.adjustType)
                            }

                        })
                        .where('part_ledger.quantity', '>', 0)
                        .where({ 'part_ledger.partId': st.partId, 'part_ledger.orgId': req.orgId })
                        .whereBetween('part_ledger.createdAt', [fromDate, toDate])
                        .groupBy('part_ledger.partId')
                        .first();
                    //.orderBy('part_ledger.createdAt', 'asc', 'part_ledger.partId', 'asc')


                    let stockNegative = await knex.from('part_ledger').sum('quantity as negativeValue')
                        .leftJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                        .leftJoin('buildings_and_phases', 'part_ledger.building', 'buildings_and_phases.id')
                        .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
                        .leftJoin('floor_and_zones', 'part_ledger.floor', 'floor_and_zones.id')
                        .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')

                    // .select([
                    //     'part_ledger.*',
                    //     'part_master.partName',
                    //     'part_master.partCode',
                    //     'part_master.unitOfMeasure',
                    //     'part_category_master.categoryName as partCategory',
                    //     'buildings_and_phases.buildingPhaseCode',
                    //     'buildings_and_phases.description as buildingDescription',
                    //     'projects.project as projectCode',
                    //     'projects.projectName',
                    //     'floor_and_zones.floorZoneCode',
                    //     'floor_and_zones.description as floorDescripton',
                    //     'adjust_type.adjustType as adjustTypeName',
                    //     'part_master.minimumQuantity'

                    // ])
                    .where(qb => {
                            if (payload.partId) {

                                qb.where('part_ledger.partId', payload.partId)
                            }

                            if (payload.partCode) {

                                qb.where('part_master.partCode', 'iLIKE', `%${payload.partCode}%`)
                            }

                            if (payload.partName) {

                                qb.where('part_master.partName', 'iLIKE', `%${payload.partName}%`)
                            }

                            if (payload.partCategory) {

                                qb.where('part_master.partCategory', payload.partCategory)
                            }

                            if (payload.adjustType) {

                                qb.where('part_ledger.adjustType', payload.adjustType)
                            }

                        })
                        .where('part_ledger.quantity', '<', 0)
                        .where({ 'part_ledger.partId': st.partId, 'part_ledger.orgId': req.orgId })
                        .whereBetween('part_ledger.createdAt', [fromDate, toDate])
                        .groupBy('part_ledger.partId').first();

                    let avgResult = await knex.from('part_ledger')
                        .leftJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                        .leftJoin('buildings_and_phases', 'part_ledger.building', 'buildings_and_phases.id')
                        .leftJoin('projects', 'buildings_and_phases.projectId', 'projects.id')
                        .leftJoin('floor_and_zones', 'part_ledger.floor', 'floor_and_zones.id')
                        .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                        .select([
                            'part_ledger.*',
                            // 'part_master.partName',
                            // 'part_master.partCode',
                            // 'part_master.unitOfMeasure',
                            // 'part_category_master.categoryName as partCategory',
                            // 'buildings_and_phases.buildingPhaseCode',
                            // 'buildings_and_phases.description as buildingDescription',
                            // 'projects.project as projectCode',
                            // 'projects.projectName',
                            // 'floor_and_zones.floorZoneCode',
                            // 'floor_and_zones.description as floorDescripton',
                            // 'adjust_type.adjustType as adjustTypeName',
                            // 'part_master.minimumQuantity'
                        ])
                        .where(qb => {
                            if (payload.partId) {

                                qb.where('part_ledger.partId', payload.partId)
                            }

                            if (payload.partCode) {

                                qb.where('part_master.partCode', 'iLIKE', `%${payload.partCode}%`)
                            }

                            if (payload.partName) {

                                qb.where('part_master.partName', 'iLIKE', `%${payload.partName}%`)
                            }

                            if (payload.partCategory) {

                                qb.where('part_master.partCategory', payload.partCategory)
                            }

                            if (payload.adjustType) {

                                //qb.where('part_ledger.adjustType', payload.adjustType)
                            }

                            qb.whereIn('part_ledger.adjustType', [4, 6])


                        })
                        .where('part_ledger.quantity', '>', 0)
                        .where({ 'part_ledger.partId': st.partId, 'part_ledger.orgId': req.orgId })
                        .whereBetween('part_ledger.createdAt', [fromDate, toDate]);

                    avgResult = avgResult.filter(v => v.unitCost != 0 || v.unitCost != "");

                    let totalUnitCost = 0;
                    for (let av of avgResult) {

                        totalUnitCost += av.unitCost;
                    }



                    let i = 0;
                    let o = 0;
                    let balance = 0;
                    let openingBalance2 = 0;

                    if (openingBalance) {
                        openingBalance2 = openingBalance;
                    }

                    if (stockPostive != undefined) {
                        i = stockPostive.positveValue;
                    }

                    if (stockNegative != undefined) {
                        o = stockNegative.negativeValue;
                    }

                    balance = (Number(openingBalance2) + Number(i)) + Number(o);

                    if (openingBalance2 == "" || openingBalance2 == 0) {
                        openingBalance2 = "";
                    }

                    let avgCost = 0;

                    avgCost = totalUnitCost / avgResult.length;

                    if (avgCost) {

                    } else {
                        avgCost = 0;
                    }


                    return {
                        ...st,
                        openingBalance: openingBalance2,
                        in: i,
                        out: o,
                        balance: balance,
                        avgCost: (avgCost).toFixed(2)
                    }


                })


                /*Export Data open */
                /*     let updatedStockDataWithInAndOut2 = [];
                let newBal2 = 0;
                let s2 = 0;
                let totalIn2 = 0;
                let totalOut2 = 0;
                let partArr = [];
                let dateArr = [];
                for (let d2 of _.orderBy(stockResult, 'partId')) {


                    let dateForBalance;
                    dateForBalance = moment(+d2.createdAt).format("YYYY-MM-DD");

                    let balance = await knex.from('part_ledger')
                        .sum('quantity as quantity')
                        .where('part_ledger.createdAt', '<', fromTimeEnd)
                        .where({ partId: d2.partId, orgId: req.orgId }).first();

                    let openingBalance;
                    if (balance.quantity) {
                        openingBalance = balance.quantity;
                    } 

                    //newBal2 = balance.quantity;


                    s2++;
                    let i2 = 0;
                    let o2 = 0;
                    let bal2 = 0

                    var lastValue = partArr[partArr.length - 1];

                    if (d2.partCode == lastValue) {
                        // console.log("yesss",lastValue)

                        let lastDate = dateArr[dateArr.length - 1];
                        let dateForBalance2 = moment(+d2.createdAt).format("YYYY-MM-DD");
                        let startOfDate = moment(dateForBalance2).startOf('date').format();
                        let startOfTime = new Date(startOfDate).getTime();

                        // if (dateForBalance2 == lastDate) {

                        //     openingBalance = 0;

                        // } else {

                        //     let balance2 = await knex.from('part_ledger')
                        //         .sum('quantity as quantity')
                        //         .where('part_ledger.createdAt', '<', startOfTime)
                        //         .where({ partId: d2.partId, orgId: req.orgId }).first();

                        //     newBal2 = 0;
                        //     openingBalance = balance2.quantity;

                        // }

                        openingBalance = 0;


                    } else {

                        newBal2 = 0;
                        openingBalance = openingBalance
                        //console.log("NOOOOOOOOOOOOOoo")
                    }

                    partArr.push(d2.partCode);
                    dateArr.push(dateForBalance);



                    if (d2.quantity && Math.sign(d2.quantity) == -1) {
                        o2 = Number(d2.quantity)
                        //    balance.totalQuantity = Number(balance.totalQuantity) + o
                        //if (s > 1) {
                        bal2 = Number(newBal2) + o2;
                        //} else {
                        //   bal = Number(balance.quantity);
                        //}

                    } else {

                        i2 = Number(d2.quantity)
                        //    balance.totalQuantity = Number(balance.totalQuantity) + i
                        //if (s > 1) {
                        bal2 = Number(newBal2) + i2;
                        //} else {
                        //   bal = Number(balance.quantity);
                        //}


                    }

                    let opening;
                    if (openingBalance == undefined) {

                        opening = 0;

                    } else {

                        opening = openingBalance;

                        if (opening) {

                        } else {
                            opening = 0;
                        }

                    }

                    newBal2 = bal2 + opening;
                    totalIn2 += i2;
                    totalOut2 += Math.abs(o2);
                    if (openingBalance == "" || openingBalance == 0) {
                        openingBalance = "-";
                    }

                    updatedStockDataWithInAndOut2.push({ ...d2, in: i2, out: o2, balance: newBal2, totalIn: totalIn2, totalOut: totalOut2, openingBalance: openingBalance })
                } */
                /*Export Data close */


                res.status(200).json({
                    data: {
                        // stockSummary: updatedStockDataWithInAndOut2,
                        stockSummary: _.orderBy(final, "partCode"),
                        fromDate,
                        toDate,
                        fromTime,
                        toTime,
                        //dateArr,
                        fromNewDate,
                        toNewDate,
                        // final

                    },
                    message: "Stock Summary Successfully!"
                })


            }
        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getPmAssignParts: async(req, res) => {
        try {
            let pagination = {};
            let rows;
            let { workOrderId } = req.body;


            [rows] = await Promise.all([
                knex.from('task_assigned_part')
                .leftJoin('part_master', 'task_assigned_part.partId', 'part_master.id')
                .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                .leftJoin('companies', 'part_master.companyId', 'companies.id')
                .leftJoin('pm_task', 'task_assigned_part.taskId', 'pm_task.id')
                .select([
                    'part_master.id as partId',
                    'task_assigned_part.quantity as Quantity',
                    'task_assigned_part.taskId as TaskId',
                    'part_master.partName as PartName',
                    'part_master.partCode as PartCode',
                    'part_category_master.categoryName as Category',
                    'part_master.isActive as status',
                    'part_master.displayId as PNo',
                    "companies.companyName",
                    "companies.companyId",
                    "task_assigned_part.status as Status",
                    'pm_task.id as taskId',
                    'pm_task.taskName as taskName',
                    'task_assigned_part.id as tId'
                ])
                .where({ 'task_assigned_part.orgId': req.orgId, 'task_assigned_part.workOrderId': workOrderId, 'part_category_master.orgId': req.orgId })
                .orderBy('task_assigned_part.createdAt', 'desc')
            ])

            pagination.data = rows;


            return res.status(200).json({
                data: {
                    parts: pagination
                },
                message: 'Parts List!'
            })

        } catch (err) {
            console.log('[controllers][parts][getParts] :  Error', err);
            res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            });
        }
    },
    requestedPartForPm: async(req, res) => {
        try {
            let taskAssignedPartId = req.body.taskAssignedPartId;
            let assignedStatus;
            let partInfo;

            const currentTime = new Date();
            // Get assigned parts to PM - Work Order
            assignedParts = await knex('assigned_parts').select('*').where({ entityId: taskAssignedPartId, entityType: 'task_assigned_part' })

            if (assignedParts && assignedParts.length) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: 'You have already sent part request !!' }
                    ]
                });
            } else {

                partInfo = await knex('task_assigned_part')
                    .leftJoin('part_master', 'task_assigned_part.partId', 'part_master.id')
                    .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
                    .select(
                        'task_assigned_part.partId as pid',
                        'task_assigned_part.quantity as Quantity',
                        'task_assigned_part.taskId as TaskId',
                        'part_ledger.unitCost as unitCost'
                    )
                    .where('task_assigned_part.id', taskAssignedPartId)
                    .first()
                console.log(partInfo, "data information");

                assignedStatus = await knex('assigned_parts').insert({ unitCost: partInfo.unitCost, quantity: partInfo.Quantity, status: 'in progress', orgId: req.orgId, createdAt: currentTime.getTime(), updatedAt: currentTime.getTime(), partId: partInfo.pid, entityId: taskAssignedPartId, entityType: 'task_assigned_part' }).returning(['*']);

                updatedTaskPart = await knex('task_assigned_part').update({ status: 3 }).where({ id: taskAssignedPartId, orgId: req.orgId }).returning(['*'])

                return res.status(200).json({
                    data: {
                        data: assignedStatus
                    },
                    message: "Request has been sent successfully!"
                });
            }

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    requestMultiplePartForPm: async(req, res) => {
        try {
            let taskAssignedPartId = req.body.taskAssignedPartId;
            let assignedStatus;
            let partInfo;
            const currentTime = new Date();


            assignedParts = await knex('assigned_parts').select('*').where({ entityType: 'task_assigned_part' }).whereIn('entityId', taskAssignedPartId)

            if (assignedParts && assignedParts.length) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: 'You have already sent part request !!' }
                    ]
                });
            } else {
                partInfo = await knex('task_assigned_part')
                    .leftJoin('part_master', 'task_assigned_part.partId', 'part_master.id')
                    .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
                    .select(
                        'task_assigned_part.partId as pid',
                        'task_assigned_part.quantity as Quantity',
                        'task_assigned_part.taskId as TaskId',
                        'part_ledger.unitCost as unitCost'
                    )
                    .whereIn('task_assigned_part.id', taskAssignedPartId)
                    .first()

                if (taskAssignedPartId && taskAssignedPartId.length > 0) {
                    for (let id of taskAssignedPartId) {
                        console.log("id of task", id)
                        assignedStatus = await knex('assigned_parts').insert({ unitCost: partInfo.unitCost, quantity: partInfo.Quantity, status: 'in progress', orgId: req.orgId, createdAt: currentTime.getTime(), updatedAt: currentTime.getTime(), partId: partInfo.pid, entityId: id, entityType: 'task_assigned_part' }).returning(['*']);
                        updatedTaskPart = await knex('task_assigned_part').update({ status: 3 }).where({ id: id, orgId: req.orgId }).returning(['*'])
                    }
                }
                // assignedStatus = await knex('assigned_parts').insert({ unitCost: partInfo.unitCost, quantity: partInfo.Quantity, status: 'in progress', orgId: req.orgId, createdAt: currentTime.getTime(), updatedAt: currentTime.getTime(), partId: partInfo.pid, entityId: taskAssignedPartId, entityType: 'task_assigned_part' }).returning(['*']);

                // updatedTaskPart = await knex('task_assigned_part').update({ status: 3 }).where({  orgId: req.orgId }).whereIn('id', taskAssignedPartId).returning(['*'])

                return res.status(200).json({
                    data: {
                        data: assignedStatus
                    },
                    message: "Request has been sent successfully!"
                });
            }

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    partLedgerMigration: async(req, res) => {
        try {

            const currentTime = new Date();
            let insertDataObj;
            let issueByData;
            let issueToData;
            let receiveToData;
            let partResult;
            // Get assigned parts to PM - Work Order
            let assignedLedger = await knex('part_ledger_temp').select('*').where({ isPartAdded: true })
                //  console.log("data ledger", assignedPartLedger);
            for (let assignedPartLedger of assignedLedger) {
                console.log("data ledger", assignedPartLedger);
                issueByData = await knex('adjust_part_users').where({ name: assignedPartLedger.issueBy, orgId: assignedPartLedger.orgId }).returning(['*']);

                if (issueByData && issueByData.length) {
                    requestedByResult = issueByData;
                    issueById = requestedByResult[0].id;
                } else {
                    if (assignedPartLedger.issueBy) {
                        requestedByResult = await knex('adjust_part_users').insert({
                            name: assignedPartLedger.issueBy,
                            createdAt: assignedPartLedger.createdAt,
                            updatedAt: assignedPartLedger.updatedAt,
                            orgId: assignedPartLedger.orgId
                        }).returning(['*'])
                        issueById = requestedByResult[0].id;
                    } else {
                        issueById = null;
                    }
                }


                issueToData = await knex('adjust_part_users').where({ name: assignedPartLedger.issueTo, orgId: assignedPartLedger.orgId }).returning(['*']);

                if (issueToData && issueToData.length) {
                    requestedToResult = issueToData;
                    issueToId = requestedToResult[0].id;
                } else {
                    if (assignedPartLedger.issueTo) {
                        requestedToResult = await knex('adjust_part_users').insert({
                            name: assignedPartLedger.issueTo,
                            createdAt: assignedPartLedger.createdAt,
                            updatedAt: assignedPartLedger.updatedAt,
                            orgId: assignedPartLedger.orgId
                        }).returning(['*'])
                        issueToId = requestedToResult[0].id;
                    } else {
                        issueToId = null;
                    }
                }


                receiveToData = await knex('adjust_part_users').where({ name: assignedPartLedger.receiveBy, orgId: assignedPartLedger.orgId }).returning(['*']);

                if (receiveToData && receiveToData.length) {
                    requestedToResult = receiveToData;
                    receiveId = requestedToResult[0].id;
                } else {
                    if (assignedPartLedger.issueTo) {
                        requestedToResult = await knex('adjust_part_users').insert({
                            name: assignedPartLedger.issueTo,
                            createdAt: assignedPartLedger.createdAt,
                            updatedAt: assignedPartLedger.updatedAt,
                            orgId: assignedPartLedger.orgId
                        }).returning(['*'])
                        receiveId = requestedToResult[0].id;
                    } else {
                        receiveId = null;
                    }
                }

                insertDataObj = {
                    "partId": assignedPartLedger.partId,
                    "unitCost": assignedPartLedger.unitCost,
                    "quantity": assignedPartLedger.quantity,
                    "isPartAdded": assignedPartLedger.isPartAdded,
                    "createdAt": assignedPartLedger.createdAt,
                    "updatedAt": assignedPartLedger.updatedAt,
                    "adjustType": assignedPartLedger.adjustType,
                    "serviceOrderNo": assignedPartLedger.serviceOrderNo,
                    "workOrderId": assignedPartLedger.workOrderId,
                    "description": assignedPartLedger.description,
                    "approved": assignedPartLedger.approved,
                    "approvedBy": assignedPartLedger.approvedBy,
                    "orgId": assignedPartLedger.orgId,
                    "receiveBy": receiveId,
                    "receiveDate": assignedPartLedger.receiveDate,
                    "deductBy": assignedPartLedger.deductBy,
                    "deductDate": assignedPartLedger.deductDate,
                    "building": assignedPartLedger.building,
                    "floor": assignedPartLedger.floor,
                    "taskAssignPartId": assignedPartLedger.taskAssignPartId,
                    "storeAdjustmentBy": assignedPartLedger.storeAdjustmentBy,
                    "companyId": assignedPartLedger.companyId,
                    "receiveFrom": assignedPartLedger.receiveFrom,
                    "issueDate": assignedPartLedger.issueDate,
                    "issueBy": issueById,
                    "issueTo": issueToId,
                    "returnedBy": assignedPartLedger.returnedBy
                }
                console.log("part ledger=========", assignedPartLedger, "=============");
                // let partLedgerExits = await knex('part_ledger').select('*').where({ orgId: req.orgId })
                // if (partLedgerExits) {
                // } else {
                partResult = await knex('part_ledger').insert(insertDataObj).returning(['*']);
                // }
            }

            return res.status(200).json({
                data: {
                    data: partResult
                },
                message: "Data migration has been updated successfully!"
            });

        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }

    ,
    updateAvgPrice: async(req, res) => {

        try {


            let partMasterResult = await knex('part_master');
            let updatePart = [];
            let updateService = [];

            for (let partData of partMasterResult) {

                let updateData = {
                    unitCost: partData.avgUnitPrice,
                    avgUnitPrice: partData.avgUnitPrice
                }

                let updateResult = await knex.update(updateData).where({ partId: partData.id, entityType: 'quotations', orgId: partData.orgId })
                    .into('assigned_parts');

                updatePart.push(updateResult);


                let updateResultService = await knex.update(updateData).where({ partId: partData.id, entityType: 'service_orders', orgId: partData.orgId })
                    .into('assigned_parts');

                updateService.push(updateResultService)

            }

            return res.status(200).json({
                data: { updatePart, updateService },
                message: "Data migration has been updated successfully!"
            });






        } catch (err) {

            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });

        }

    }
}

module.exports = partsController;
const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');
const fs = require("fs")
const QRCode = require('qrcode')
const uuid = require('uuid/v4')


const partsController = {
    getParts: async (req, res) => {
        try {

            let partData = null;
            let reqData = req.query;
            let total, rows
            let pagination = {};


            let { partName,
                partCode,
                partCategory, partId } = req.body;

            if (partName || partCode || partCategory || partId) {

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
                                qb.where({ 'part_master.id': partId })
                            }
                        })
                        .groupBy(['part_master.id'])
                        .distinct('part_master.id'),
                    //.first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_master')
                        .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                        .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
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
                                qb.where({ 'part_master.id': partId })
                            }
                        })
                        .orderBy('part_master.createdAt', 'desc')
                        .groupBy(['part_master.id', 'part_category_master.id'])
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
                        .groupBy(['part_master.id'])
                        .distinct('part_master.id'),
                    //.first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_master')
                        .leftJoin('part_category_master', 'part_master.partCategory', 'part_category_master.id')
                        .leftJoin('part_ledger', 'part_master.id', 'part_ledger.partId')
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
                        ])
                        .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                        .orderBy('part_master.createdAt', 'desc')
                        .groupBy(['part_master.id', 'part_category_master.id'])
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
    addParts: async (req, res) => {
        try {

            let part = null;
            let attribs = []
            let files = [];
            let images = [];
            let quantityObject;

            await knex.transaction(async (trx) => {
                let partPayload = req.body;
                let payload = req.body;
                console.log('[controllers][part][addParts]', partPayload);
                partPayload = _.omit(partPayload, ['minimumQuantity'], ['unitOfMeasure'], ['barcode'], ['image_url'], ['file_url'], 'quantity', 'unitCost', ['additionalAttributes'], ['images'], ['files'], ['additionalDescription'], 'partDescription', ['assignedVendors'], ['additionalPartDetails'], ['partId'])
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

                let insertData = { ...insertDataObj, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId, uuid: uuid() };

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

                trx.commit;
            });

            res.status(200).json({
                data: {
                    part: { ...part, ...quantityObject, attributes: attribs, files, images }
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
    updatePartDetails: async (req, res) => {
        try {

            let partDetails = null;
            let attribs = []

            await knex.transaction(async (trx) => {
                const partDetailsPayload = req.body;
                console.log('[controllers][part][updatePartDetails]', partDetailsPayload);
                partPayload = _.omit(partDetailsPayload, ['images'], ['files'], ['minimumQuantity'], ['unitOfMeasure'], ['barcode'], ['image_url'], ['file_url'], ['additionalPartDetails'], ['assignedVendors'], ['partDescription'], ['id'], ['quantity'], ['unitCost'], ['additionalAttributes'])

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
                    unitOfMeasure: partDetailsPayload.unitOfMeasure, partName: partDetailsPayload.partName, partCode: partDetailsPayload.partCode, partDescription: partDetailsPayload.partDescription, partCategory: partDetailsPayload.partCategory, minimumQuantity: partDetailsPayload.minimumQuantity, barcode: partDetailsPayload.barcode, assignedVendors: partDetailsPayload.assignedVendors, additionalPartDetails: partDetailsPayload.additionalPartDetails, updatedAt: currentTime, isActive: true,
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
                trx.commit;
            });

            res.status(200).json({
                data: {
                    partDetails: { ...partDetails, additionalAttributes: attribs }
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
    getPartDetails: async (req, res) => {
        try {

            let partData = null;
            let additionalAttributes = null;
            let partQuantityData = null
            let files = null;
            let images = null;
            let id = req.body.id;
            let qrcode = ''

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

            let totalQuantity = 0;
            for (let i = 0; i < partQuantityDataResult.length; i++) {
                totalQuantity += parseInt(partQuantityDataResult[i].quantity)
            }
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
                    message: "Part Details"
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
    addPartStock: async (req, res) => {

        try {

            let partStock = null;

            await knex.transaction(async (trx) => {
                let partStockPayload = _.omit(req.body, 'date');
                console.log('[controllers][part][stock]', partStockPayload);
                // validate keys
                let result;
                if (partStockPayload.adjustType == "1" || partStockPayload.adjustType == "3") {
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        serviceOrderNo: Joi.string().required(),
                        isPartAdded: Joi.string().required()
                    });
                    result = Joi.validate(_.omit(partStockPayload, 'description', 'date', 'workOrderId'), schema);

                } else if (partStockPayload.adjustType == "10") {
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        workOrderId: Joi.string().required(),
                        isPartAdded: Joi.string().required()
                    });
                    result = Joi.validate(_.omit(partStockPayload, 'serviceOrderNo', 'description', 'date'), schema);

                } else {
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().allow("").allow(null).optional(),
                        quantity: Joi.number().required(),
                        adjustType: Joi.string().required(),
                        isPartAdded: Joi.string().required()
                    });
                    result = Joi.validate(_.omit(partStockPayload, 'serviceOrderNo', 'description', 'date', 'workOrderId'), schema);

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
                    unitCost = partStockPayload.unitCost
                } else {
                    let ledgerResult = await knex.from('part_ledger').where({ partId: partStockPayload.partId })
                        .select('unitCost')
                        .orderBy('id', 'desc')
                        .first()
                    unitCost = ledgerResult.unitCost;
                }

                let quantity;
                if (partStockPayload.adjustType == 1 || partStockPayload.adjustType == 2 || partStockPayload.adjustType == 5 || partStockPayload.adjustType == 7) {
                    quantity = "-" + partStockPayload.quantity;
                } else {
                    quantity = partStockPayload.quantity;
                }


                // Insert in part_ledger table,
                let currentTime = new Date().getTime();

                let insertData = {
                    ...partStockPayload, createdAt: currentTime, updatedAt: currentTime, orgId: req.orgId, unitCost: unitCost,
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
    searchParts: async (req, res) => {

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
    partList: async (req, res) => {

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
    partCodeExist: async (req, res) => {
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
                    'part_master.additionalPartDetails as additionalPartDetails'])
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
                    partResult: { ...partResult[0], unitCost, quantity, additionalAttributes: additionalAttribute }
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
    getPartDetailById: async (req, res) => {
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
                partDetail: { ...partResult[0], partLedgerResult, additionalAttributes: additionalAttribute, images, files, unitCost, quantity }
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
    importPartDetails: async (req, res) => {

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
    checkOrderWorkId: async (req, res) => {
        try {
            let orgId = req.orgId;
            let workOrderId = req.params.id;
            let result = "";
            result = await knex('task_group_schedule_assign_assets').returning('*')
                .where({ id: workOrderId, orgId: orgId })
            return res.status(200).json({
                data: result,
                message: "Work Order Id Successfully!"
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
    partRequisitionLogList: async (req, res) => {
        try {

            let { partId, partName, serviceOrderNo, workOrderId, adjustType } = req.body
            let reqData = req.query;
            let total, rows
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

            if (partId || partName || serviceOrderNo || workOrderId || adjustType) {

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                        .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                        .where(qb => {
                            qb.where({ 'part_ledger.orgId': req.orgId })
                            if (partId) {
                                qb.where('part_master.id', partId)
                            }
                            if (partName) {
                                qb.where('part_master.partName', 'like', `%${partName}%`)
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

                        })
                        .first(),
                    knex.from('part_ledger')
                        .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .leftJoin('adjust_type', 'part_ledger.adjustType', 'adjust_type.id')
                        .select([
                            'part_ledger.id as Log Id',
                            'part_master.id as Part Id',
                            'part_master.partName as Part Name',
                            'part_master.partCode as Part Code',
                            'part_ledger.quantity as Quantity',
                            'part_ledger.unitCost as Unit Cost',
                            'part_ledger.serviceOrderNo as Service Order No',
                            'part_ledger.workOrderId as Work Order ID',
                            'adjust_type.adjustType as Adjust Type',
                            'part_ledger.adjustType as adjustTypeId',
                            'part_ledger.approved',
                            'part_ledger.description',
                            'part_ledger.approvedBy',
                            'part_ledger.createdAt as Created Date',
                        ])
                        .where(qb => {
                            qb.where({ 'part_ledger.orgId': req.orgId })

                            if (partId) {
                                qb.where('part_master.id', partId)
                            }
                            if (partName) {
                                qb.where('part_master.partName', 'like', `%${partName}%`)
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

                        })
                        .orderBy('part_ledger.createdAt', 'desc')
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
                            'part_master.partName as Part Name',
                            'part_master.partCode as Part Code',
                            'part_ledger.quantity as Quantity',
                            'part_ledger.unitCost as Unit Cost',
                            'part_ledger.serviceOrderNo as Service Order No',
                            'part_ledger.workOrderId as Work Order ID',
                            'adjust_type.adjustType as Adjust Type',
                            'part_ledger.adjustType as adjustTypeId',
                            'part_ledger.approved',
                            'part_ledger.description',
                            'part_ledger.approvedBy',
                            'part_ledger.createdAt as Created Date',
                        ])
                        .orderBy('part_ledger.createdAt', 'desc')
                        .offset(offset).limit(per_page)
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

            return res.status(200).json({
                data: {
                    partsRequisition: pagination
                },
                message: 'Part Requisition Log List!'
            })

        }
        catch (err) {
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }
    },
    // ADJUST TYPE LIST FOR DROP DOWN
    adjustTypeList: async (req, res) => {

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
    deletePart: async (req, res) => {

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
    importPartData: async (req, res) => {
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
                data[0].G == "unit_cost"
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
                            if (checkExist.length < 1) {

                                let insertData = {
                                    orgId: req.orgId,
                                    partCode: partData.A,
                                    partName: partData.B,
                                    unitOfMeasure: partData.C,
                                    partCategory: partCategoryId,
                                    companyId: companyId,
                                    createdAt: currentTime,
                                    updatedAt: currentTime
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
                            } else {
                                fail++;
                                let values = _.values(partData)
                                values.unshift('Part name with corresponding part code already exists.')
                                errors.push(values);
                            }

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
    exportPartData: async (req, res) => {
        try {

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
                        knex.raw('MAX("part_ledger"."unitCost") as UNIT_COST'),

                    ])
                    .where({ 'part_master.orgId': req.orgId, 'part_category_master.orgId': req.orgId })
                    .groupBy(['part_master.id', 'part_category_master.id', 'companies.id'])
                //.distinct('part_master.id as ""')
            ])

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


            var ws;
            if (rows && rows.length) {
                ws = XLSX.utils.json_to_sheet(rows);
            } else {
                ws = XLSX.utils.json_to_sheet([
                    {
                        PART_CODE: "",
                        PART_NAME: "",
                        UNIT_OF_MEASURE: "",
                        PART_CATEGORY_CODE: "",
                        COMPANY_ID: "",
                        quantity: "",
                        unit_cost:"",
                    }
                ]);
            }


            //var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, { bookType: "csv", bookSST: true, type: "base64" });
            let filename = "PartData-" + Date.now() + ".csv";
            let filepath = tempraryDirectory + filename;
            let check = XLSX.writeFile(wb, filepath);
            const AWS = require("aws-sdk");
            fs.readFile(filepath, function (err, file_buffer) {
                var s3 = new AWS.S3();
                var params = {
                    Bucket: bucketName,
                    Key: "Export/Part/" + filename,
                    Body: file_buffer,
                    ACL: "public-read"
                };
                s3.putObject(params, function (err, data) {
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
                            "https://sls-app-resources-bucket.s3.us-east-2.amazonaws.com/Export/Part/" +
                            filename;

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
    getServiceRequestAssignedParts: async (req, res) => {
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
                        "assigned_parts.id as apId"
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
                        "assigned_parts.id as apId"
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
    getServiceOrderAssignedParts: async (req, res) => {
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
                    .select([
                        "part_master.partName as partName",
                        "part_master.id as id",
                        "part_master.partCode as partCode",
                        "assigned_parts.quantity as quantity",
                        "assigned_parts.unitCost as unitCost",
                        "assigned_parts.status as status",
                        "assigned_parts.id as apId"
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
                    .select([
                        "part_master.partName as partName",
                        "part_master.id as id",
                        "part_master.partCode as partCode",
                        "assigned_parts.quantity as quantity",
                        "assigned_parts.unitCost as unitCost",
                        "assigned_parts.status as status",
                        "assigned_parts.id as apId"

                    ])
                    .where({
                        entityId: serviceOrderId,
                        entityType: "service_orders"
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
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getQuotationAssignedParts: async (req, res) => {
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
                    .select([
                        "part_master.partName as partName",
                        "part_master.id as id",
                        "part_master.partCode as partCode",
                        "assigned_parts.quantity as quantity",
                        "assigned_parts.unitCost as unitCost",
                        "assigned_parts.id as apId"
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
                    .select([
                        "part_master.partName as partName",
                        "part_master.id as id",
                        "part_master.partCode as partCode",
                        "assigned_parts.quantity as quantity",
                        "assigned_parts.unitCost as unitCost",
                        "assigned_parts.id as apId"
                    ])
                    .where({
                        entityId: quotationId,
                        entityType: "quotations"
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
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    getPendingApprovalRequestsForParts: async (req, res) => {
        try {

            let reqData = req.query;
            let total, rows;

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;
            let filters = {}
            if (req.body.status) {
                filters['assigned_parts.status'] = req.body.status;
            }
            if (req.body.partId) {
                filters['part_master.id'] = req.body.partId
            }
            if (req.body.serviceOrderId) {
                filters['assigned_parts.entityId'] = req.body.serviceOrderId
            }
            [total, rows] = await Promise.all([
                knex('assigned_parts')
                    .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                    .select([
                        'assigned_parts.id as approvalId',
                        'part_master.id',
                        'part_master.partName',
                        'part_master.minimumQuantity',
                        'assigned_parts.unitCost as requestedPartsUnitCost',
                        'assigned_parts.quantity as requestedParts',
                        'assigned_parts.status as approvalStatus',
                        'assigned_parts.entityId'
                    ])
                    .where({
                        'part_master.orgId': req.orgId,
                        'assigned_parts.entityType': 'service_orders'
                    })
                    .where(qb => {
                        if (!_.isEmpty(filters)) {
                            qb.where(filters)
                        }
                        if (req.body.partName) {
                            qb.where('part_master.partName', 'ilike', `%${req.body.partName}%`)
                        }
                    }),
                knex('assigned_parts')
                    .leftJoin('part_master', 'assigned_parts.partId', 'part_master.id')
                    .select(['assigned_parts.id as approvalId',
                        'part_master.partCategory',
                        'part_master.id',
                        'part_master.partName',
                        'part_master.minimumQuantity',
                        'assigned_parts.unitCost as requestedPartsUnitCost',
                        'assigned_parts.quantity as requestedParts',
                        'assigned_parts.status as approvalStatus',
                        'assigned_parts.entityId'
                    ])
                    .where({ 'part_master.orgId': req.orgId, 'assigned_parts.entityType': 'service_orders' })
                    .where(qb => {
                        if (!_.isEmpty(filters)) {
                            qb.where(filters)
                        }
                        if (req.body.partName) {
                            qb.where('part_master.partName', 'ilike', `%${req.body.partName}%`)
                        }
                    })
                    .offset(offset)
                    .limit(per_page)
            ])
            // .distinct(['part_master.id'])
            const Parallel = require('async-parallel')
            const partsWithTotalQuantity = await Parallel.map(rows, async (part) => {
                let { id } = part;
                let quantity = await knex('part_ledger').where({ partId: id, orgId: req.orgId }).select('quantity')
                let totalParts = 0
                for (let i = 0; i < quantity.length; i++) {
                    const element = quantity[i];
                    totalParts += Number(element.quantity);
                }
                return { ...part, totalParts }
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
    approvePartRequisitionRequest: async (req, res) => {
        try {
            let approvalId = req.body.approvalId;
            let currentTime = new Date().getTime();
            const update = await knex('assigned_parts').update({ status: 'approved' }).where({ orgId: req.orgId, id: approvalId }).returning(['*'])
            let assignedResult = update[0];
            let quantity = "-" + assignedResult.quantity;

            let ledgerObject = {
                partId: assignedResult.partId,
                unitCost: assignedResult.unitCost,
                quantity: quantity,
                isPartAdded: true,
                createdAt: currentTime,
                updatedAt: currentTime,
                adjustType: 1,
                serviceOrderNo: assignedResult.entityId,
                orgId: req.orgId
            }
            let partLedger = await knex.insert(ledgerObject).returning(['*']).into('part_ledger');
            return res.status(200).json({
                data: {
                    updatedStatus: { ...update, partLedger }
                }
            })
        } catch (err) {
            return res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    },
    editPartRequisitionRequest: async (req, res) => {
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
    declinePartRequisitionRequest: async (req, res) => {
        try {
            let { approvalId } = req.body;
            const declined = await knex('assigned_parts').update({ status: 'declined' }).where({ id: approvalId, orgId: req.orgId }).returning(['*'])
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
    getAllPartCategories: async (req, res) => {
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
    getAvailableParts: async (req, res) => {
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
    checkServiceOrderId: async (req, res) => {
        try {
            let orgId = req.orgId;
            let serviceId = req.query.serviceId;
            let result = "";
            result = await knex('service_orders').returning('*')
                .where({ id: serviceId, orgId: orgId })
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

    allAdjustList: async (req, res) => {
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
    deleteQuotationAssignedParts: async (req, res) => {
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

                filtered.parts = partsData.filter(function (partsData) {
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
    deleteQuotationAssignedPartsNew: async (req, res) => {
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
    generateNewPartId: async (req, res) => {
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
    }
}

module.exports = partsController;
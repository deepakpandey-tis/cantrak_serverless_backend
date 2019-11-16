const Joi = require('@hapi/joi');
const _ = require('lodash');

const knex = require('../db/knex');
const XLSX = require('xlsx');

//const trx = knex.transaction();

const partsController = {
    getParts: async (req, res) => {
        try {

            let partData = null;
            let reqData = req.query;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;


            let { partName,
                partCode,
                partCategory } = req.body;


            let filters = {}

            if (partName) {
                filters['part_master.partName'] = partName
            }

            if (partCode) {
                filters['part_master.partCode'] = partCode
            }

            if (partCategory) {
                filters['part_master.partCategory'] = partCategory
            }



            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_ledger').
                    innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .select([
                        'part_master.id as partId',
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        'part_ledger.quantity as Quantity',
                        'part_ledger.unitCost as Price',
                        'part_master.partCategory as Category',
                        'part_master.barcode as Barcode',
                        'part_ledger.createdAt as Date Added'

                    ])
                    .offset(offset).limit(per_page)
                ])
            } else {
                //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                try {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from("part_ledger").innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                        knex.from('part_ledger').innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .select([
                        'part_master.id as partId',
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        'part_ledger.quantity as Quantity',
                        'part_ledger.unitCost as Price',
                        'part_master.partCategory as Category',
                        'part_master.barcode as Barcode',
                        'part_ledger.createdAt as Date Added'

                    ])
                        .where(filters).offset(offset).limit(per_page)
                    ])
                } catch (e) {
                    // Error
                }
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
                    parts: pagination
                },
                message: 'Parts List!'
            })

            //partData = await knex.from('part_ledger').innerJoin('part_master', 'part_ledger.partId', 'part_master.id')

            //console.log('[controllers][parts][getParts]: Parts List', partData);

            //partData = partData.map(d => _.omit(d, ['partId'], ['createdAt'], ['updatedAt'], ['isActive']));

            // res.status(200).json({
            //     data: partData,
            //     message: "Parts List"
            // });


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

            await knex.transaction(async (trx) => {
                let partPayload = req.body;
                console.log('[controllers][part][addParts]', partPayload);
                partPayload = _.omit(partPayload, ['quantity'], ['unitCost'], ['additionalAttributes'], ['images'], ['files'],['additionalDescription'])
                // validate keys
                const schema = Joi.object().keys({
                    partName: Joi.string().required(),
                    partCode: Joi.string().required(),
                    partDescription: Joi.string().required(),
                    partCategory: Joi.string().required(),
                    minimumQuantity: Joi.string().required(),
                    barcode: Joi.string().required(),
                    assignedVendors: Joi.string().required(),
                    additionalPartDetails: Joi.string()
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

                // Insert in part_master table,
                let currentTime = new Date().getTime();

                let insertData = { ...partPayload, createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][part][addParts]: Insert Data', insertData);

                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('part_master');
                part = partResult[0];


                // Insert unitCost and quantity in part_ledger table

                let unitCost = req.body.unitCost;
                let quantity = req.body.quantity
                let quantitySchema = Joi.object().keys({
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                })
                let quantityResult = Joi.validate({ unitCost, quantity }, quantitySchema);
                console.log('[controllers][part][addParts]: JOi Result', result);

                if (quantityResult && quantityResult.hasOwnProperty('error') && quantityResult.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: quantityResult.error.message }
                        ],
                    });
                }
                let quantityData = { partId: part.id, unitCost, quantity, createdAt: currentTime, updatedAt: currentTime };
                let partQuantityResult = await knex.insert(quantityData).returning(['*']).transacting(trx).into('part_ledger');

                quantityObject = _.omit(partQuantityResult[0], ['id'], ['partId']);

                // Insert attributes in part_attributes table

                let additionalAttributes = req.body.additionalAttributes;
                //console.log(additionalAttributes)
                if (additionalAttributes && additionalAttributes.length > 0) {
                    
                   
                    for (attribute of additionalAttributes) {
                       
                        let d = await knex.insert({ partId: part.id, ...attribute, createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('part_attributes');
                        attribs.push(d[0])
                    
                    }

                }


                // Insert images in images table
                let imagesData = req.body.images;
                if (imagesData && imagesData.length > 0) {

                    for (image of imagesData) {
                        let d = await knex.insert({ entityId: part.id, ...image, entityType: 'part_master', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('images');
                        images.push(d[0])
                    }

                }

                // Insert files in files table
                let filesData = req.body.files;
                if (filesData && filesData.length > 0) {

                    for (file of filesData) {
                        let d = await knex.insert({ entityId: part.id, ...file, entityType: 'part_master', createdAt: currentTime, updatedAt: currentTime }).returning(['*']).transacting(trx).into('files');
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
                partPayload = _.omit(partDetailsPayload, ['id'], ['quantity'], ['unitCost'], ['additionalAttributes'])

                // validate keys
                const schema = Joi.object().keys({
                    partName: Joi.string().required(),
                    partCode: Joi.string().required(),
                    partDescription: Joi.string().required(),
                    partCategory: Joi.string().required(),
                    minimumQuantity: Joi.string().required(),
                    barcode: Joi.string().required(),
                    assignedVendors: Joi.string().required(),
                    additionalPartDetails: Joi.string()
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

                const updatePartDetails = await knex.update({ partName: partDetailsPayload.partName, partCode: partDetailsPayload.partCode, partDescription: partDetailsPayload.partDescription, partCategory: partDetailsPayload.partCategory, minimumQuantity: partDetailsPayload.minimumQuantity, barcode: partDetailsPayload.barcode, assignedVendors: partDetailsPayload.assignedVendors, additionalPartDetails: partDetailsPayload.additionalPartDetails, updatedAt: currentTime, isActive: true }).where({ id: partDetailsPayload.id }).returning(['*']).transacting(trx).into('part_master');

                console.log('[controllers][part][updatePartDetails]: Update Part Details', updatePartDetails);

                partDetails = updatePartDetails[0];

                let unitCost = req.body.unitCost;
                let quantity = req.body.quantity
                let quantitySchema = Joi.object().keys({
                    unitCost: Joi.string().required(),
                    quantity: Joi.string().required(),
                })
                let quantityResult = Joi.validate({ unitCost, quantity }, quantitySchema);
                console.log('[controllers][part][updatePartDetails]: JOi Result', result);

                if (quantityResult && quantityResult.hasOwnProperty('error') && quantityResult.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: quantityResult.error.message }
                        ],
                    });
                }
                let quantityData = { unitCost, quantity, updatedAt: currentTime };
                let partQuantityResult = await knex.update(quantityData).where({ partId: partDetailsPayload.id }).returning(['*']).transacting(trx).into('part_ledger');

                quantityObject = _.omit(partQuantityResult[0], ['id'], ['partId']);


                let additionalAttributes = req.body.additionalAttributes;
                console.log(additionalAttributes)
                if (additionalAttributes.length > 0) {

                    for (attribute of additionalAttributes) {
                        console.log('attribute: ', attribute)
                        let d = await knex.update({ ...attribute, updatedAt: currentTime }).where({ id:attribute.id,partId: partDetailsPayload.id }).returning(['*']).transacting(trx).into('part_attributes');
                        attribs.push(d[0])
                    }


                }


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

            partData = await knex('part_master').where({ id }).select()
            let partDataResult = partData[0];
            let omitedPartDataResult = _.omit(partDataResult, ['createdAt'], ['updatedAt'], ['isActive'])
            additionalAttributes = await knex('part_attributes').where({ partId: id }).select()
            partQuantityData = await knex('part_ledger').where({ partId: id }).select('unitCost', 'quantity')
            let partQuantityDataResult = partQuantityData[0]


            files = await knex('files').where({ entityId: id, entityType: 'part_master' }).select()
            images = await knex('images').where({ entityId: id, entityType: 'part_master' }).select()

            console.log('[controllers][parts][getPartDetails]: Part Details', partData);

            res.status(200).json({
                data: { part: { ...omitedPartDataResult, ...partQuantityDataResult, additionalAttributes, images, files } },
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
                let partStockPayload = req.body;
                console.log('[controllers][part][stock]', partStockPayload);
                // validate keys
                const schema = Joi.object().keys({
                    partId: Joi.string().required(),
                    unitCost: Joi.number().required(),
                    quantity: Joi.number().required(),
                    isPartAdded: Joi.string().required()
                });

                let result = Joi.validate(partStockPayload, schema);
                console.log('[controllers][part]: JOi Result', result);

                if (result && result.hasOwnProperty('error') && result.error) {
                    return res.status(400).json({
                        errors: [
                            { code: 'VALIDATION_ERROR', message: result.error.message }
                        ],
                    });
                }

                // Insert in part_ledger table,
                let currentTime = new Date().getTime();

                let insertData = { ...partStockPayload, createdAt: currentTime, updatedAt: currentTime };

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
    },exportPart:async (req,res)=>{
        
        try{ 
            let partData = null;
            let reqData = req.query;
            let total, rows

            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;


            let { partName,
                partCode,
                partCategory } = req.body;


            let filters = {}

            if (partName) {
                filters['part_master.partName'] = partName
            }

            if (partCode) {
                filters['part_master.partCode'] = partCode
            }

            if (partCategory) {
                filters['part_master.partCategory'] = partCategory
            }



            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_ledger').
                    innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .select([
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        'part_ledger.quantity as Quantity',
                        'part_ledger.unitCost as Price',
                        'part_master.partCategory as Category',
                        'part_master.barcode as Barcode',
                        'part_ledger.createdAt as Date Added'

                    ])
                    .offset(offset).limit(per_page)
                ])
            } else {
                //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                try {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from("part_ledger").innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                        knex.from('part_ledger').innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .select([
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        'part_ledger.quantity as Quantity',
                        'part_ledger.unitCost as Price',
                        'part_master.partCategory as Category',
                        'part_master.barcode as Barcode',
                        'part_ledger.createdAt as Date Added'

                    ])
                        .where(filters).offset(offset).limit(per_page)
                    ])
                } catch (e) {
                    // Error
                }
            }

    
            var wb = XLSX.utils.book_new({sheet:"Sheet JS"});
            var ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "pres");
            XLSX.write(wb, {bookType:"csv", bookSST:true, type: 'base64'})
            let filename = "uploads/Parts-"+Date.now()+".csv";
            let  check = XLSX.writeFile(wb,filename);
            
                return res.status(200).json({
                    data:rows,
                    message:"Parts Data Export Successfully!"
                })
                
            
         } catch(err){
             return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
             })
         }   
    },
    // Part List for DropDown
    partList : async (req,res)=>{

        try{
        
             let partList =  await knex.from('part_master').returning('*');

             return res.status(200).json({
                data:partList,
                message:"Part List Successfully!"
            })

            } catch(err){
                return res.status(500).json({
                    errors: [
                        { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                    ],
                })
            }   
    },
    //CHECK PART CODE EXIST OR NOT
    partCodeExist: async (req,res)=>{
        try{

            let payload    = req.query;
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
                             .where({partCode:payload.partCode})
           if(partResult.length>0){

              let partLedgerResult = await knex.from('part_ledger')
                                      .select([
                                         'part_ledger.id as partLedgerId',
                                         'part_ledger.unitCost as unitCost',
                                         'part_ledger.quantity as quantity'
                                        ])
                                       .where({partId:partResult[0].id})
               let unitCost =  partLedgerResult[0].unitCost
               let quantity =  partLedgerResult[0].quantity
  
           let additionalAttribute = await knex.from('part_attributes')
           .select([
              'part_attributes.id as partAttributeId',
              'part_attributes.attributeName as attributeName',
              'part_attributes.attributeDescription as attributeDescription',
             ])
            .where({partId:partResult[0].id})

               return res.status(200).json({
                   message:"This Part Code already Exist!",
                   partResult:{...partResult[0] ,unitCost,quantity,additionalAttributes:additionalAttribute}
               })
           } else{
            return res.status(200).json({
                message:"Part Code Not Found!",
                partResult:""
            })
           }
        
            } catch(err){
                return res.status(500).json({
                    errors: [
                        { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                    ],
                })
            }   
    },
    //GET PART DETAIL BY ID
    getPartDetailById: async (req,res)=>{
        try{

            let payload    = req.query;
            let id         = payload.id;
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
                             .where({id:payload.id})
         
              let partLedgerResult = await knex.from('part_ledger')
                                      .select([
                                         'part_ledger.id as partLedgerId',
                                         'part_ledger.unitCost as unitCost',
                                         'part_ledger.quantity as quantity'
                                        ])
                                       .where({partId:id})

            // This 687 ,688 needs to be removed because its irrelevant but its here because we dont know where this is being used
            let unitCost = partLedgerResult.length ? partLedgerResult[0].unitCost :'0'
            let quantity = partLedgerResult.length ? partLedgerResult[0].quantity :'0'

  
           let additionalAttribute = await knex.from('part_attributes')
           .select([
              'part_attributes.id as partAttributeId',
              'part_attributes.attributeName as attributeName',
              'part_attributes.attributeDescription as attributeDescription',
             ])
            .where({partId:id})

            files = await knex('files').where({ entityId: id, entityType: 'part_master' }).select()
            images = await knex('images').where({ entityId: id, entityType: 'part_master' }).select()

               return res.status(200).json({
                   message:"Part Details Successfully!",
                   partDetail: { ...partResult[0],partLedgerResult,additionalAttributes:additionalAttribute,images,files,unitCost,quantity}
               })
        
            } catch(err){
                return res.status(500).json({
                    errors: [
                        { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                    ],
                })
            }   
    }

 }

module.exports = partsController;
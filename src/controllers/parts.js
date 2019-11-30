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
                filters['part_master.partName'] = partName;
            }

            if (partCode) {
                filters['part_master.partCode'] = partCode
            }

            if (partCategory) {
                filters['part_master.partCategory'] = partCategory
            }


            //res.json(filters)

            if (_.isEmpty(filters)) {
                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_master")
                    .innerJoin('part_category_master','part_master.partCategory','part_category_master.id').first(),
                    //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first(),
                    knex.from('part_master')
                    .innerJoin('part_category_master','part_master.partCategory','part_category_master.id')
                   // innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .select([
                        'part_master.id as partId',
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        //'part_ledger.quantity as Quantity',
                        //'part_ledger.unitCost as Price',
                        'part_master.unitOfMeasure',
                        'part_category_master.categoryName as Category',
                        'part_master.barcode as Barcode',
                        'part_master.createdAt as Date Added',
                        //'part_ledger',
                         //knex.raw('SUM(quantity)')

                    ])
                    .orderBy('part_master.createdAt','desc')
                    //.groupBy(['part_master.id','part_ledger.id'])
                    .offset(offset).limit(per_page)
                ])
            } else {
                //filters = _.omitBy(filters, val => val === '' || _.isNull(val) || _.isUndefined(val) || _.isEmpty(val) ? true : false)
                try {
                    [total, rows] = await Promise.all([
                        knex.count('* as count').from("part_master")
                        .innerJoin('part_category_master','part_master.partCategory','part_category_master.id')
                        .where(qb => {
                            if (partName) {
                                qb.where('part_master.partName', 'like', `%${partName}%`)
                            }
                            if (partCode) {
                                qb.where('part_master.partCode', 'like', `%${partCode}%`)

                            }
                            if (partCategory) {
                                qb.where(filters)

                            }
                        })
                        .first(),
                        //.innerJoin('part_master', 'part_ledger.partId', 'part_master.id').first()
                        //.where(filters),
                        knex.from('part_master')
                        .innerJoin('part_category_master','part_master.partCategory','part_category_master.id')
                        //innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                        .select([
                        'part_master.id as partId',
                        'part_master.partName as Name',
                        'part_master.partCode as ID',
                        //'part_ledger.quantity as Quantity',
                        //'part_ledger.unitCost as Price',
                        'part_master.unitOfMeasure',
                        'part_category_master.categoryName as Category',
                        'part_master.barcode as Barcode',
                        'part_master.createdAt as Date Added',
                        //'part_ledger',
                        // knex.raw('SUM(quantity)')

                    ])
                    .orderBy('part_master.createdAt','desc')
                    //.groupBy(['part_master.id','part_ledger.id'])
                        //.where(filters)
                        .where(qb => {
                            if (partName) {
                                qb.where('part_master.partName', 'like', `%${partName}%`)
                            }
                            if (partCode) {
                                qb.where('part_master.partCode', 'like', `%${partCode}%`)

                            }
                            if (partCategory) {
                                qb.where(filters)
                                //qb.where('part_master.partCategory', 'like', `%${partCategory}%`)

                            }
                        })
                        .offset(offset).limit(per_page)
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
            let quantityObject;

            await knex.transaction(async (trx) => {
                let partPayload = req.body;
                let payload     = req.body;
                console.log('[controllers][part][addParts]', partPayload);
                partPayload = _.omit(partPayload,['minimumQuantity'],['unitOfMeasure'],['barcode'],['image_url'],['file_url'], 'quantity', 'unitCost', ['additionalAttributes'], ['images'], ['files'],['additionalDescription'],'partDescription',['assignedVendors'],['additionalPartDetails'])
                // validate keys
                const schema = Joi.object().keys({
                    partName: Joi.string().required(),
                    partCode: Joi.string().required(),
                    partCategory: Joi.string().required(),
                    companyId: Joi.string().required()
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
            "partName" :payload.partName,
            "partCode":payload.partCode,
            "unitOfMeasure":payload.unitOfMeasure,
            "minimumQuantity":payload.minimumQuantity?payload.minimumQuantity:null,
            "partDescription" : payload.partDescription,
            "partCategory" : payload.partCategory,
            "barcode":payload.barcode,
            "assignedVendors":payload.assignedVendors?payload.assignedVendors:null,
            "additionalPartDetails":payload.additionalPartDetails,
            "companyId":payload.companyId
                        }


                // Insert in part_master table,
                let currentTime = new Date().getTime();

                let insertData = { ...insertDataObj, createdAt: currentTime, updatedAt: currentTime };

                console.log('[controllers][part][addParts]: Insert Data', insertData);

                let partResult = await knex.insert(insertData).returning(['*']).transacting(trx).into('part_master');
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
                
                if(unitCost || quantity){
                    unitCost = unitCost?unitCost:null;
                    quantity = quantity?quantity:null;
                    let insertD = {
                        unitCost : unitCost,
                        quantity : quantity
                    }

                let quantityData = { partId: part.id, unitCost, quantity, createdAt: currentTime, updatedAt: currentTime };
                let partQuantityResult = await knex.insert(quantityData).returning(['*']).transacting(trx).into('part_ledger');

                quantityObject = _.omit(partQuantityResult[0], ['id'], ['partId']);

                }
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
                partPayload = _.omit(partDetailsPayload,['minimumQuantity'],['unitOfMeasure'],['barcode'],['image_url'],['file_url'],['additionalPartDetails'],['assignedVendors'], ['partDescription'],['id'], ['quantity'], ['unitCost'], ['additionalAttributes'])

                // validate keys
                const schema = Joi.object().keys({
                    partName       : Joi.string().required(),
                    partCode       : Joi.string().required(),
                    partCategory   : Joi.string().required(),
                    companyId      : Joi.string().required(),
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

                const updatePartDetails = await knex.update({ unitOfMeasure:partDetailsPayload.unitOfMeasure,partName: partDetailsPayload.partName, partCode: partDetailsPayload.partCode, partDescription: partDetailsPayload.partDescription, partCategory: partDetailsPayload.partCategory, minimumQuantity: partDetailsPayload.minimumQuantity, barcode: partDetailsPayload.barcode, assignedVendors: partDetailsPayload.assignedVendors, additionalPartDetails: partDetailsPayload.additionalPartDetails, updatedAt: currentTime, isActive: true,
                    companyId : partDetailsPayload.companyId
                 }).where({ id: partDetailsPayload.id }).returning(['*']).transacting(trx).into('part_master');

                console.log('[controllers][part][updatePartDetails]: Update Part Details', updatePartDetails);

                partDetails = updatePartDetails[0];

                let unitCost = req.body.unitCost;
                let quantity = req.body.quantity
                // let quantitySchema = Joi.object().keys({
                //     unitCost: Joi.string().required(),
                //     quantity: Joi.string().required(),
                // })
                // let quantityResult = Joi.validate({ unitCost, quantity }, quantitySchema);
                // console.log('[controllers][part][updatePartDetails]: JOi Result', result);

                // if (quantityResult && quantityResult.hasOwnProperty('error') && quantityResult.error) {
                //     return res.status(400).json({
                //         errors: [
                //             { code: 'VALIDATION_ERROR', message: quantityResult.error.message }
                //         ],
                //     });
                // }

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

            partData = await knex('part_master')
            .leftJoin('vendor_master','part_master.assignedVendors','vendor_master.id')
            .where({'part_master.id':id}).select('part_master.*','vendor_master.name')
            let partDataResult = partData[0];
            let omitedPartDataResult = _.omit(partDataResult, ['createdAt'], ['updatedAt'], ['isActive'])
            additionalAttributes = await knex('part_attributes').where({ partId: id }).select()
            partQuantityData = await knex('part_ledger')
            .where({ partId: id }).select(
                'unitCost',
                'quantity'
                )
            let partQuantityDataResult = partQuantityData

            let totalQuantity=0;
           for(let i =0; i<partQuantityDataResult.length; i++){
            totalQuantity += parseInt(partQuantityDataResult[i].quantity)
           }
           let totalUnitCost =0;

           for(let i =0; i<partQuantityDataResult.length; i++){
            totalUnitCost += parseInt(partQuantityDataResult[i].unitCost)
           }

            files = await knex('files').where({ entityId: id, entityType: 'part_master' }).select()
            images = await knex('images').where({ entityId: id, entityType: 'part_master' }).select()

            console.log('[controllers][parts][getPartDetails]: Part Details', partData);

            res.status(200).json({
                data: { part: { quantity:totalQuantity,unitCost:totalUnitCost,...omitedPartDataResult, additionalAttributes, images, files } },
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
                let partStockPayload = _.omit(req.body,'date');
                console.log('[controllers][part][stock]', partStockPayload);
                // validate keys
                let result;
                if(partStockPayload.adjustType=="1" || partStockPayload.adjustType=="3"){
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().required(),
                        quantity: Joi.number().required(),
                        adjustType:Joi.string().required(),
                        serviceOrderNo:Joi.string().required(),
                        isPartAdded: Joi.string().required()
                    });
                     result = Joi.validate(_.omit(partStockPayload,'description','date','workOrderId'), schema);

                } else if(partStockPayload.adjustType=="10"){
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().required(),
                        quantity: Joi.number().required(),
                        adjustType:Joi.string().required(),
                        workOrderId:Joi.string().required(),
                        isPartAdded: Joi.string().required()
                    });
                     result = Joi.validate(_.omit(partStockPayload,'serviceOrderNo','description','date'), schema);

                } else {
                    const schema = Joi.object().keys({
                        partId: Joi.string().required(),
                        unitCost: Joi.number().required(),
                        quantity: Joi.number().required(),
                        adjustType:Joi.string().required(),
                        isPartAdded: Joi.string().required()
                    });
                     result = Joi.validate(_.omit(partStockPayload,'serviceOrderNo','description','date','workOrderId'), schema);

                }
                
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
                                       .innerJoin("part_category_master",'part_master.partCategory','part_category_master.id')
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
                             .where({'part_master.id':payload.id})
         
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
    },
    // IMPORT PART DETAILS
    importPartDetails: async(req,res)=>{
     
        try{

            if(req.file){
                return res.json(req.file)
                console.log("======",req.file,"=====");
            } else{
                return res.status(400).json({

                    message:"Select File!"
                });   
            }

        } catch(err){
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }   
    },
    //  CHECK WORK ORDER ID 
    checkOrderWorkId : async (req,res)=>{
  
        try{
            let workOrderId = req.params.id;
            let result = "";
            result = await knex('task_group_schedule_assign_assets').returning('*')
                               .where({id:workOrderId})
                    return res.status(200).json({
                                data   :result,
                                message:"Work Order Id Successfully!"
                            });
        } catch(err){
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }   
    },
    // PART REQUISITION LOG LIST
    partRequisitionLogList : async (req,res)=>{
        try{
            
            let {partId ,partName,serviceOrderNo,workOrderId,adjustType} = req.body
            let reqData = req.query;
            let total, rows
            let pagination = {};
            let per_page = reqData.per_page || 10;
            let page = reqData.current_page || 1;
            if (page < 1) page = 1;
            let offset = (page - 1) * per_page;

             if(partId || partName || serviceOrderNo || workOrderId || adjustType){

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type','part_ledger.adjustType','adjust_type.id')
                    .where(qb=>{
                        if(partId){
                        qb.where('part_master.id',partId)
                        }
                        if(partName){
                        qb.where('part_master.partName', 'like', `%${partName}%`)
                        }
                        if(serviceOrderNo){
                            qb.where('part_ledger.serviceOrderNo','like',`%${serviceOrderNo}%`)
                        }
                        if(workOrderId){

                             qb.where('part_ledger.workOrderId','like',`%${workOrderId}%`)
                         }
                        if(adjustType){
                            qb.where('part_ledger.adjustType',adjustType)
                        }

                    })
                    .first(),
                    knex.from('part_ledger')
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type','part_ledger.adjustType','adjust_type.id')
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
                    .where(qb=>{
                        if(partId){
                        qb.where('part_master.id',partId)
                        }
                        if(partName){
                        qb.where('part_master.partName', 'like', `%${partName}%`)
                        }
                        if(serviceOrderNo){
                          qb.where('part_ledger.serviceOrderNo','like',`%${serviceOrderNo}%`)
                        }
                        if(workOrderId){

                            qb.where('part_ledger.workOrderId','like',`%${workOrderId}%`)
                         }
                        if(adjustType){
                            qb.where('part_ledger.adjustType',adjustType)
                        }

                    })
                    .orderBy('part_ledger.createdAt','desc')
                    .offset(offset).limit(per_page)
                ])

             } else {

                [total, rows] = await Promise.all([
                    knex.count('* as count').from("part_ledger")
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type','part_ledger.adjustType','adjust_type.id')
                    .first(),
                    knex.from('part_ledger')
                    .innerJoin('part_master', 'part_ledger.partId', 'part_master.id')
                    .leftJoin('adjust_type','part_ledger.adjustType','adjust_type.id')
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
                    .orderBy('part_ledger.createdAt','desc')
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
        catch(err){
            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }   
    },
    // ADJUST TYPE LIST FOR DROP DOWN
    adjustTypeList : async (req,res)=>{

        try{

            let result = await knex('adjust_type').returning('*')

            return res.status(200).json({
                data: {
                    adjustTypeList: result
                },
                message: 'Adjust type List!'
            })
            
        }catch(err){

            return res.status(500).json({
                errors: [
                    { code: 'UNKNOWN_SERVER_ERROR', message: err.message }
                ],
            })
        }

    }
 }

module.exports = partsController;
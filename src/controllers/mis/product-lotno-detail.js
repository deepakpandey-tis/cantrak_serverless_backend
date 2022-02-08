const knexReader = require('../../db/knex-reader');

const getProductLotNoDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let reqData = req.query;

        let { companyId, lotNo } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        let validProductionLotNo, validHarvestLotNo, validPlantLotNo, validRawMaterialLotNo, lotNoDetail, result;
        let validProductionHarvestLotNo, validHarvestPlantLotNo;


        //  if lotNo is a production_lot number
        //  1a. Production Output Items of product lotNo; child is Production 'Output Items'
        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."processId", pl."productionOn", pl."lotNo" "productionLotNo"
        , pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , p."name" "processName", c."companyName", 'Products' "treeLabel"
        , (SELECT json_agg(row_to_json(o.*)) "child" 
        FROM (
        SELECT it.*, i.name "itemName", i.name "cardHeading", i.gtin "itemGtin", ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        FROM item_txns it, items i, item_categories ic, ums, storage_locations sl
        WHERE it."productionLotId" = pl.id AND it.quantity > 0 AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id
        ORDER BY "itemName" ASC
        ) o
        )`;

        sqlFrom = ` FROM production_lots pl, processes p, companies c
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."lotNo" = '${lotNo}'`;
        sqlWhere += ` AND pl."processId" = p.id AND pl."companyId" = c.id`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }

        sqlOrderBy = ` ORDER BY "productionOn" DESC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        //console.log('getProductLotNoDetail: ', sqlStr);
        
        var productionOutputDetail = await knexReader.raw(sqlStr);
        // console.log('productionOutputDetail: ', productionOutputDetail);


        //  1b. Production Input Items of product lotNo; child is Production 'Input Items'
        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."processId", pl."productionOn", pl."lotNo" "productionLotNo"
        , pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , p."name" "processName", c."companyName", CONCAT('Production', ' - ', p.name) "treeLabel"
        , (SELECT json_agg(row_to_json(o.*)) "child" 
        FROM (
        SELECT it.*, i.name "itemName", i.name "cardHeading", i.gtin "itemGtin", ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        FROM item_txns it, items i, item_categories ic, ums, storage_locations sl
        WHERE it."productionLotId" = pl.id AND it.quantity < 0 AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id
        ORDER BY "itemName" ASC
        ) o
        )`;

        sqlFrom = ` FROM production_lots pl, processes p, companies c
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."lotNo" = '${lotNo}'`;
        sqlWhere += ` AND pl."processId" = p.id AND pl."companyId" = c.id`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }

        sqlOrderBy = ` ORDER BY "productionOn" DESC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        //console.log('getProductLotNoDetail: ', sqlStr);
        
        var productionInputDetail = await knexReader.raw(sqlStr);
        // console.log('productionInputDetail: ', productionInputDetail);

        //  Whether lotNo is of Production
        validProductionLotNo = productionInputDetail.rows.length > 0;

        //  2. Harvest detail of item used in production
        sqlSelect = `SELECT hpl.*, it.*, i."name" "itemName", i.gtin "itemGtin", ic.name "itemCategoryName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        , i."name" "cardHeading"
        `;

        sqlFrom = ` FROM harvest_plant_lots hpl, item_txns it, items i, item_categories ic, ums u, storage_locations sl
        `;

        /* */
        var selectedHarvestRecs = { rows: [] };

        validHarvestLotNo = false;
        validProductionHarvestLotNo = false;

        sqlWhere = ` WHERE hpl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND hpl."companyId" = ${companyId}`;
        }

        if(validProductionLotNo){
            //  lotNo is of Production, get production input item harvest details
            var harvestRecs;
            var sqlWhereAddon;
            for (const rec of productionInputDetail.rows[0].child) {
                sqlWhereAddon = ` AND hpl."lotNo" = '${rec.lotNo}'`;
                sqlWhereAddon += ` AND it."itemCategoryId" = ${rec.itemCategoryId} AND it."itemId" = ${rec.itemId}`;
                sqlWhereAddon += ` AND it."harvestPlantLotId" = hpl.id`;
                sqlWhereAddon += ` AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id;
                `;

                sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;
                
                harvestRecs = await knexReader.raw(sqlStr);

                //  input item lotNo is of Harvest?
                validProductionHarvestLotNo = harvestRecs.rows.length > 0;

                if(validProductionHarvestLotNo){
                    //  input item has Harvest detail
                    rec.child = harvestRecs.rows;
                    rec.treeLabel = 'Harvest';

                    selectedHarvestRecs = harvestRecs;          //  To be commented
                }
                else {
                    //  input item does not have Harvest detail
                }

            }
        }
        else {
            //  lotNo is NOT of Production, check if it is of Harvest
            sqlWhere += ` AND hpl."lotNo" = '${lotNo}'`;
            sqlWhere += ` AND it."harvestPlantLotId" = hpl.id`;
            sqlWhere += ` AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            selectedHarvestRecs = await knexReader.raw(sqlStr);

            validHarvestLotNo = selectedHarvestRecs.rows.length > 0;
        }
        /* */


        //  3. Plant detail of harvested item used in production
        sqlSelect = `SELECT pl.*, CONCAT('Planted: ', pl."plantsCount", ' Plants') "cardHeading", l."number" "licenseNumber", l2."name" "plantLocation"
        , i2."name" "rawItemName", i2.gtin "rawItemGtin", ic."name" "rawItemCategoryName", u2."name" "rawItemUM", s."name" "rawItemSupplierName", it2.quantity "rawItemQuantity", it2."date" "rawItemDate", it2."lotNo" "rawItemLotNo", it2.imported "rawItemImported", sl2."name" "rawItemStorageLocation"
        , (SELECT json_agg(row_to_json(p.*)) "plants" 
        FROM (
        SELECT p.*
        FROM plants p 
        WHERE p."plantLotId" = pl.id AND p."isActive" AND NOT p."isWaste" AND NOT p."isDestroy"
        ORDER BY p."plantSerial"
        ) p
        )`;

        sqlFrom = ` FROM plant_lots pl, licenses l, locations l2
        , items i2, item_categories ic , ums u2, item_txns it2, storage_locations sl2, suppliers s 
        `;

        /* */
        var selectedPlantLotRecs = { rows: [] };

        validPlantLotNo = false;
        validHarvestPlantLotNo = false;

        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }

        //  lotNo is a valid Production lot number and Production has valid Harvest
        if(validProductionLotNo && validProductionHarvestLotNo){
            var plantLotRecs;
            var sqlWhereAddon;
            for (const inputItem of productionInputDetail.rows[0].child) {          //  input item harvest loop
                for (const rec of inputItem.child) {                                //  harvested item plant loop
                    sqlWhereAddon = ` AND pl.id = '${rec.plantLotId}'`;
                    sqlWhereAddon += ` AND  pl."licenseId" = l.id and pl."locationId" = l2.id 
                    AND pl."itemId" = i2.id AND pl."itemCategoryId" = ic.id AND i2."umId" = u2.id AND pl."supplierId" = s.id 
                    AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id;
                    `;
        
                    sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;
                    
                    plantLotRecs = await knexReader.raw(sqlStr);
                    selectedPlantLotRecs = plantLotRecs;

                    //  harvest has plant detail?
                    validHarvestPlantLotNo = plantLotRecs.rows.length > 0;

                    if(validHarvestPlantLotNo){
                        //  harvest has plant detail
                        rec.plantLotDetail = plantLotRecs.rows;
                        rec.treeLabel = 'Plants';

                        selectedPlantLotRecs = plantLotRecs;                //  To be commented
                    }
                    else {
                        //  harvest does not have Plant detail
                    }

                }
            }
        }
        else if(validHarvestLotNo) {
            //  lotNo not of Production, is it of Harvest?
            var plantLotRecs;

            //  Since all harvested items has same plantLotId, getting plant details using Ist harvested item
            sqlWhere += ` AND pl."id" = '${selectedHarvestRecs.rows[0].plantLotId}'`;
            sqlWhere += ` AND  pl."licenseId" = l.id and pl."locationId" = l2.id 
            AND pl."itemId" = i2.id AND pl."itemCategoryId" = ic.id AND i2."umId" = u2.id AND pl."supplierId" = s.id 
            AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            plantLotRecs = await knexReader.raw(sqlStr);
            selectedPlantLotRecs = plantLotRecs;

            //  harvest has plant detail?
            validPlantLotNo = plantLotRecs.rows.length > 0;

            if(validPlantLotNo){
                //  harvest has plant detail
                selectedHarvestRecs.rows[0].plantLotDetail = plantLotRecs.rows;
                selectedHarvestRecs.rows[0].treeLabel = 'Plants';
            }
            else {
                //  harvest does not have Plant detail
            }
        }
        else if(!validProductionLotNo && !validHarvestLotNo){
            //  lotNo neither of Production nor of Harvest, is it of Plant Lot?
            var plantLotRecs;

            //  Since all harvested items has same plantLotId, getting plant details using Ist harvested item
            sqlWhere += ` AND pl."lotNo" = '${lotNo}'`;
            sqlWhere += ` AND  pl."licenseId" = l.id and pl."locationId" = l2.id 
            AND pl."itemId" = i2.id AND pl."itemCategoryId" = ic.id AND i2."umId" = u2.id AND pl."supplierId" = s.id 
            AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            plantLotRecs = await knexReader.raw(sqlStr);
            selectedPlantLotRecs = plantLotRecs;

            //  is plant lotNo?
            validPlantLotNo = plantLotRecs.rows.length > 0;
        }
        /* */

        //  4. lotNo neither of Production nor of Harvest nor of Plant Lot, is if of Raw Material?
        var selectedRawMaterialLotRecs = { rows: [] };

        validRawMaterialLotNo = false;

        if(!validHarvestPlantLotNo && !validPlantLotNo){
            sqlSelect = `SELECT it.quantity "rawItemQuantity", it."date" "rawItemDate", it."lotNo" "rawItemLotNo", it.imported "rawItemImported"
            , i."name" "rawItemName", i.gtin "rawItemGtin", ic."name" "rawItemCategoryName", u."name" "rawItemUM", sl."name" "rawItemStorageLocation", l."number" "licenseNumber", s."name" "rawItemSupplierName"
            , i."name" "cardHeading"
            `;

            sqlFrom = ` FROM items i, item_categories ic, ums u, storage_locations sl, item_txns it
            LEFT JOIN licenses l ON l.id = it."licenseId"
            LEFT JOIN item_txn_suppliers its ON its."itemTxnId" = it.id
            LEFT JOIN suppliers s ON s.id = its."supplierId"
            `;

            sqlWhere = ` WHERE it."orgId" = ${orgId} AND it."lotNo" = '${lotNo}' AND it."txnType" = 11`;
            if(companyId){
                sqlWhere += ` AND it."companyId" = ${companyId}`;
            }
            sqlWhere += ` AND it."itemCategoryId" = ic.id and it."itemId" = i.id and it."umId" = u.id and it."storageLocationId" = sl.id ;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
        
            selectedRawMaterialLotRecs = await knexReader.raw(sqlStr);

            //  is plant lotNo?
            validRawMaterialLotNo = selectedRawMaterialLotRecs.rows.length > 0;
        }

            lotNoDetail = {};

            /* */
            let productionOutput = [{...productionOutputDetail.rows[0]}];
            let data = [{}];
            
            if(validProductionLotNo){
                data = productionInputDetail.rows;
            }
            else if(validHarvestLotNo){
                data[0].child = selectedHarvestRecs.rows;
                data[0].treeLabel = 'Harvest'
            }
            else if(validPlantLotNo){
                data[0].child = selectedPlantLotRecs.rows;
                data[0].treeLabel = 'Plants'
            }
            else if(validRawMaterialLotNo){
                data[0].child = selectedRawMaterialLotRecs.rows;
                data[0].treeLabel = 'Raw Material'
            }
            /* */

            lotNoDetail = {
                productionOutput: productionOutput,
                data: data,

                productionInputDetail: productionInputDetail.rows,
                productionOutputDetail: productionOutputDetail.rows,
                harvestDetail: selectedHarvestRecs.rows,
                plantLotDetail: selectedPlantLotRecs.rows,
                rawMaterialLotDetail: selectedRawMaterialLotRecs.rows,
            };
            console.log('lotNoDetail: ', lotNoDetail);

            result = {
                data: {
                    records: lotNoDetail,
                    message: "Product Lot No. Detail!"
                }
            }            

        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][mis][getProductLotNoDetail] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getProductLotNoDetail;

/**
 */

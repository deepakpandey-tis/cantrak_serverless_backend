const { boolean } = require('@hapi/joi');
const knexReader = require('../../db/knex-reader');
const { ItemCategory, BatchTypes, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const getProductLotNoDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let reqData = req.query;

        let { companyId, batchTypeId, lotNo } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlWhereAddon, sqlOrderBy;
        let validProductionLotNo, validHarvestLotNo, validPlantLotNo, validRawMaterialLotNo, lotNoDetail, result;
        let validProductionHarvestLotNo, validHarvestPlantLotNo;

        var productionOutputDetail = { rows: [] };
        var productionInputDetail = { rows: [] };
        var selectedHarvestRecs = { rows: [] };
        var selectedPlantLotRecs = { rows: [] };
        var selectedRawMaterialLotRecs = { rows: [] };

        validProductionLotNo = false;
        validHarvestLotNo = false;
        validProductionHarvestLotNo = false;
        validPlantLotNo = false;
        validHarvestPlantLotNo = false;
        validRawMaterialLotNo = false;

    if(batchTypeId == BatchTypes.Production){

        //  if lotNo is a production_lot number
        //  1a. Production Output Items of product lotNo; child is Production 'Output Items'
        sqlSelect = `SELECT pl.id, pl."orgId", pl."companyId", pl."processId", pl."productionOn", pl."lotNo" "productionLotNo"
        , pl."isActive", pl."createdBy", pl."createdAt", pl."updatedBy", pl."updatedAt"
        , p."name" "processName", c."companyName", 'Products' "treeLabel"
        , (SELECT json_agg(row_to_json(o.*)) "child" 
        FROM (
        SELECT it.*, i.name "itemName", i.name "cardHeading", i.gtin "itemGtin", ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        FROM item_txns it, items i, item_categories ic, ums, storage_locations sl
        WHERE it."productionLotId" = pl.id AND it."txnType" = ${TxnTypes.ReceiveFromProduction} AND it.quantity > 0 AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id
        ORDER BY "itemName" ASC
        ) o
        )`;

        sqlFrom = ` FROM production_lots pl, processes p, companies c
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND pl."lotNo" = '${lotNo}'`;
        sqlWhere += ` AND pl."processId" = p.id AND pl."companyId" = c.id`;

        sqlOrderBy = ` ORDER BY "productionOn" DESC`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        //console.log('getProductLotNoDetail: ', sqlStr);
        
        productionOutputDetail = await knexReader.raw(sqlStr);
        // console.log('productionOutputDetail: ', productionOutputDetail);


        //  1b. Production Input Items of product lotNo; child is Production 'Input Items'
        sqlStr = `SELECT jsonb_agg(fnl.*) "data" FROM (`;
        sqlStr += `SELECT jsonb_agg(o.*) "data", (select distinct "productionOn" from production_lots pl2 where pl2.id = o."producitonLotId") "date", 'Production' "treeLabel" FROM (`;

        sqlStr += `select pl.id "producitonLotId", pl."orgId" , pl."companyId", pl."processId" , pl."productionOn" , pl."lotNo" "productoinLotNo"`;
        sqlStr += `, it.id "itemTxnId", it."txnType" , it."subId" , it."txnId" , it."date" "itemTxnDate", it."itemCategoryId" , it."itemId" , it."specieId" , it."strainId" , it.quantity , it."umId" , it."storageLocationId" , it."licenseId"`;
        sqlStr += `, it."licenseNarId" , it."licenseNarItemId" , it."lotNo" "itemTxnLotNo", it."plantLotId" , it."plantWasteTxnId" , it."plantsCount" , (-1 * it.quantity) "quantity"`;
        sqlStr += `, it."harvestPlantLotId" , it."productionLotId" "itemTxnProductionLotId" , it."expiryDate" , it."invoiceId"`;
        sqlStr += `, i.name "itemName", p.name "cardHeading", i.gtin "itemGtin", ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"`;
        sqlStr += `, c."companyName" , p."name" "processName"`;
        sqlStr += ` from production_lots pl, item_txns it , processes p , companies c , items i, item_categories ic, ums, storage_locations sl`;
        sqlStr += ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND pl."lotNo" = '${lotNo}' AND pl."processId" = p.id AND pl."companyId" = c.id`;
        sqlStr += ` AND it."productionLotId" = pl.id AND it."txnType" = ${TxnTypes.IssueForProduction} AND it.quantity < 0 AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id`;

        sqlStr += `) o`;
        sqlStr += ` group by o."producitonLotId"`;
        sqlStr += `) fnl`;


        console.log('Production Input Items sql: ', sqlStr);
        
        productionInputDetail = await knexReader.raw(sqlStr);
        console.log('Production Input Items: ', productionInputDetail.rows[0]?.data[0]);

        //  Whether lotNo is of Production
        validProductionLotNo = productionInputDetail.rows.length > 0;

    }

    if(validProductionLotNo || batchTypeId == BatchTypes.Harvest){

        //  2. Harvest detail of item used in production
        sqlStr = `SELECT json_agg(row_to_json(fnl.*)) "data" FROM (`;
        sqlStr += `SELECT json_agg(row_to_json(d.*)) "data", 'Harvest' "treeLabel", d."harvestedOn" "date" FROM (`;

        sqlSelect = `SELECT hpl.*, it.*, i."name" "itemName", i.gtin "itemGtin", ic.name "itemCategoryName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        , i."name" "cardHeading"
        `;

        sqlFrom = ` FROM harvest_plant_lots hpl, item_txns it, items i, item_categories ic, ums u, storage_locations sl
        `;

        /* */

        validHarvestLotNo = false;
        validProductionHarvestLotNo = false;

        sqlWhere = ` WHERE hpl."orgId" = ${orgId} AND hpl."companyId" = ${companyId}`;

        var harvestRecs;
        let sqlFinal;
        if(validProductionLotNo){
            //  lotNo is of Production, get production input item harvest details
            for (const rec of productionInputDetail.rows[0]?.data[0].data) {

                console.log('rec: ', rec);
                sqlWhereAddon = ` AND hpl."lotNo" = '${rec.itemTxnLotNo}'`;
                sqlWhereAddon += ` AND it."txnType" = ${TxnTypes.ReceiveProductFromHarvest} AND it."itemCategoryId" = ${rec.itemCategoryId} AND it."itemId" = ${rec.itemId}`;
                sqlWhereAddon += ` AND it."harvestPlantLotId" = hpl.id`;
                sqlWhereAddon += ` AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id`;

                sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;

                sqlFinal += `) d GROUP BY d."harvestedOn"`;
                sqlFinal += `) fnl`;
        
                console.log('Harvest sql: ', sqlFinal);
                
                harvestRecs = await knexReader.raw(sqlFinal);
                console.log('Harvest Lot and harvested Items: ', harvestRecs.rows[0]?.data);

                //  input item lotNo is of Harvest?
                validProductionHarvestLotNo = harvestRecs.rows.length > 0;

                if(validProductionHarvestLotNo){
                    //  input item has Harvest detail
                    rec.child = harvestRecs.rows[0].data;
                    // rec.treeLabel = 'Harvest';

                    selectedHarvestRecs = harvestRecs;          //  To be commented
                }
                else {
                    //  input item does not have Harvest detail
                }
            }
        }
        else {
            //  lotNo is NOT of Production, check if it is of Harvest
            sqlWhereAddon = ` AND hpl."lotNo" = '${lotNo}'`;
            sqlWhereAddon += ` AND it."harvestPlantLotId" = hpl.id`;
            sqlWhereAddon += ` AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id`;

            sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;

            sqlFinal += `) d GROUP BY d."harvestedOn"`;
            sqlFinal += `) fnl`;

            console.log('Harvest sql: ', sqlFinal);
                
            harvestRecs = await knexReader.raw(sqlFinal);
            console.log('Harvest Lot and harvested Items: ', harvestRecs.rows[0]?.data[0]);

            validHarvestLotNo = harvestRecs.rows.length > 0;

            if(validHarvestLotNo){
                //  has Harvest detail
                productionInputDetail = harvestRecs;
                // rec.child = harvestRecs.rows[0].data;
                // rec.treeLabel = 'Harvest';

                selectedHarvestRecs = harvestRecs;          //  To be commented
            }
            else {
                //  does not have Harvest detail
            }
        }
        /* */

    }


    if(validProductionLotNo || validProductionHarvestLotNo || validHarvestLotNo || batchTypeId == BatchTypes.Plants){

        //  3. Plant detail of harvested item used in production
        sqlStr = `SELECT json_agg(row_to_json(fnl.*)) "data" FROM (`;
        sqlStr += `SELECT json_agg(row_to_json(d.*)) "data", 'Plants' "treeLabel", d."plantedOn" "date" FROM (`;

        sqlSelect = `SELECT pl.*, CONCAT('Planted: ', pl."plantsCount", ' Plants') "cardHeading", l."number" "licenseNumber", l2."name" "plantLocation", sl."name" "plantSubLocation"
        , (SELECT json_agg(row_to_json(p.*)) "plants" 
        FROM (
        SELECT p.*
        FROM plants p 
        WHERE p."plantLotId" = pl.id AND p."isActive" AND NOT p."isWaste" AND NOT p."isDestroy"
        ORDER BY p."plantSerial"
        ) p
        )
        , (SELECT json_agg(row_to_json(p.*)) "wastePlants" 
        FROM (
        SELECT p.*
        FROM plants p 
        WHERE p."plantLotId" = pl.id AND p."isActive" AND p."isWaste"
        ORDER BY p."plantSerial"
        ) p
        )
        `;

        sqlFrom = ` FROM plant_lots pl, licenses l, locations l2, sub_locations sl
        `;

        /* */
        validPlantLotNo = false;
        validHarvestPlantLotNo = false;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId}`;

        let sqlFinal;
        //  lotNo is a valid Production lot number and Production has valid Harvest
        if(validProductionLotNo && validProductionHarvestLotNo){
            var plantLotRecs;
            for (const inputItem of productionInputDetail.rows[0]?.data[0].data) {          //  input item harvest loop
                if(inputItem.child == null){
                    continue;
                }
        
                console.log('inputItem: ', inputItem);
                for (const chld of inputItem.child) { 
                    for (const rec of chld.data) {                                //  harvested item plant loop
                        sqlWhereAddon = ` AND pl.id = '${rec.plantLotId}'`;
                        sqlWhereAddon += ` AND  pl."licenseId" = l.id and l2.id ='${rec.locationId}' and sl.id ='${rec.subLocationId}' and sl."locationId" ='${rec.locationId}'
                        `;
            
                        sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;

                        sqlFinal += `) d GROUP BY d."plantedOn"`;
                        sqlFinal += `) fnl`;
        
                        console.log('Harvested Item Plants sql: ', sqlFinal);
                        
                        plantLotRecs = await knexReader.raw(sqlFinal);
                        selectedPlantLotRecs = plantLotRecs;

                        //  harvest has plant detail?
                        validHarvestPlantLotNo = plantLotRecs.rows.length > 0;

                        if(validHarvestPlantLotNo){
                            //  harvest has plant detail
                            rec.child = plantLotRecs.rows[0].data;
                            // rec.treeLabel = 'Plants';

                            //  get plant's raw material
                            var plantLotRawMaterialRecs;
                            let sqlStr, sqlSelect, sqlFrom, sqlWhere;
                            for (const rec1 of rec.child[0].data){
                                sqlStr = `SELECT json_agg(row_to_json(fnl.*)) "data" FROM (`;
                                sqlStr += `SELECT json_agg(row_to_json(d.*)) "data", 'Raw Material' "treeLabel", d."receivedOn" "date" FROM (`;

                                sqlSelect = `select i."name" "itemName", i.gtin "itemGtin", ic."name" "itemCategoryName", u2."name" "itemUM", s."name" "itemSupplierName"
                                , it2.quantity "quantity", it2.quality "quality", it2."date" "receivedOn", it2."lotNo" "lotNo", it2.imported "itemImported", it2."expiryDate"
                                , sl2."name" "itemStorageLocation"
                                `;
                        
                                sqlFrom = ` FROM plant_lots pl, items i, item_categories ic , ums u2, item_txns it2, storage_locations sl2, suppliers s
                                `;

                                sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND pl.id = ${rec1.id}`;
                                sqlWhere += ` AND pl."itemId" = i.id AND pl."itemCategoryId" = ic.id AND i."umId" = u2.id AND pl."supplierId" = s.id`;
                                sqlWhere += ` AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id`;

                                sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere;

                                sqlFinal += `) d GROUP BY d."receivedOn"`;
                                sqlFinal += `) fnl`;
                
                                console.log('Plant Raw Material sql: ', sqlFinal);
                                
                                plantLotRawMaterialRecs = await knexReader.raw(sqlFinal);
                                if(plantLotRawMaterialRecs.rows.length > 0){
                                    rec1.child = plantLotRawMaterialRecs.rows[0].data;
                                }
                            }

                            selectedPlantLotRecs = plantLotRecs;                //  To be commented
                        }
                        else {
                            //  harvest does not have Plant detail
                        }

                    }
                }
            }

        }
        else if(validHarvestLotNo) {
            //  lotNo is a valid Harvest lot number
            var plantLotRecs;

            //  Since all harvested items has same plantLotId, getting plant details using Ist harvested item
            // sqlWhereAddon = ` AND pl."id" = '${selectedHarvestRecs.rows[0].plantLotId}'`;
            sqlWhereAddon = ` AND pl."id" = '${productionInputDetail.rows[0].data[0].data[0].plantLotId}'`;
            sqlWhereAddon += ` AND  pl."licenseId" = l.id and pl."locationId" = l2.id`;

            sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;

            sqlFinal += `) d GROUP BY d."plantedOn"`;
            sqlFinal += `) fnl`;
        
            console.log('Harvested Plants sql: ', sqlFinal);

            plantLotRecs = await knexReader.raw(sqlFinal);
            selectedPlantLotRecs = plantLotRecs;

            //  harvest has plant detail?
            validPlantLotNo = plantLotRecs.rows.length > 0;

            if(validPlantLotNo){
                //  harvest has plant detail
                productionInputDetail.rows[0].data[0].data[0].child = plantLotRecs.rows[0].data;

                //  get plant's raw material
                var plantLotRawMaterialRecs;
                const rec = productionInputDetail.rows[0].data[0].data[0];
                for (const rec1 of rec.child[0].data){
                    sqlStr = `SELECT json_agg(row_to_json(fnl.*)) "data" FROM (`;
                    sqlStr += `SELECT json_agg(row_to_json(d.*)) "data", 'Raw Material' "treeLabel", d."receivedOn" "date" FROM (`;

                    sqlSelect = `select i."name" "itemName", i.gtin "itemGtin", ic."name" "itemCategoryName", u2."name" "itemUM", s."name" "itemSupplierName"
                    , it2.quantity "quantity", it2.quality "quality", it2."date" "receivedOn", it2."lotNo" "lotNo", it2.imported "itemImported", it2."expiryDate"
                    , sl2."name" "itemStorageLocation"
                    `;

                    sqlFrom = ` FROM plant_lots pl, items i, item_categories ic , ums u2, item_txns it2, storage_locations sl2, suppliers s
                    `;

                    sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND pl.id = ${rec1.id}`;
                    sqlWhere += ` AND pl."itemId" = i.id AND pl."itemCategoryId" = ic.id AND i."umId" = u2.id AND pl."supplierId" = s.id`;
                    sqlWhere += ` AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id`;

                    sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere;

                    sqlFinal += `) d GROUP BY d."receivedOn"`;
                    sqlFinal += `) fnl`;
    
                    console.log('Plant Raw Material sql: ', sqlFinal);
                    
                    plantLotRawMaterialRecs = await knexReader.raw(sqlFinal);
                    if(plantLotRawMaterialRecs.rows.length > 0){
                        rec1.child = plantLotRawMaterialRecs.rows[0].data;
                    }
                }

            }
            else {
                //  harvest does not have Plant detail
            }
        }
        else if(!validProductionLotNo && !validHarvestLotNo){
            //  lotNo neither of Production nor of Harvest, is it of Plant Lot?
            var plantLotRecs;

            //  Since all harvested items has same plantLotId, getting plant details using Ist harvested item
            sqlWhereAddon = ` AND pl."lotNo" = '${lotNo}'`;
            sqlWhereAddon += ` AND  pl."licenseId" = l.id and pl."locationId" = l2.id`;

            sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere + sqlWhereAddon;

            sqlFinal += `) d GROUP BY d."plantedOn"`;
            sqlFinal += `) fnl`;
        
            console.log('Plants sql: ', sqlFinal);
            
            plantLotRecs = await knexReader.raw(sqlFinal);
            console.log('Plant Lot: ', plantLotRecs.rows[0]?.data[0]);

            selectedPlantLotRecs = plantLotRecs;

            //  is plant lotNo?
            validPlantLotNo = plantLotRecs.rows.length > 0;

            if(validPlantLotNo){
                //  has Plant Lot detail
                productionInputDetail = plantLotRecs;

                //  get plant's raw material
                var plantLotRawMaterialRecs;
                const rec = productionInputDetail.rows[0].data[0];
                for (const rec1 of rec.data){
                    sqlStr = `SELECT json_agg(row_to_json(fnl.*)) "data" FROM (`;
                    sqlStr += `SELECT json_agg(row_to_json(d.*)) "data", 'Raw Material' "treeLabel", d."receivedOn" "date" FROM (`;

                    sqlSelect = `select i."name" "itemName", i.gtin "itemGtin", ic."name" "itemCategoryName", u2."name" "itemUM", s."name" "itemSupplierName"
                    , it2.quantity "quantity", it2.quality "quality", it2."date" "receivedOn", it2."lotNo" "lotNo", it2.imported "itemImported", it2."expiryDate"
                    , sl2."name" "itemStorageLocation"
                    `;

                    sqlFrom = ` FROM plant_lots pl, items i, item_categories ic , ums u2, item_txns it2, storage_locations sl2, suppliers s
                    `;

                    sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${companyId} AND pl.id = ${rec1.id}`;
                    sqlWhere += ` AND pl."itemId" = i.id AND pl."itemCategoryId" = ic.id AND i."umId" = u2.id AND pl."supplierId" = s.id`;
                    sqlWhere += ` AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id`;

                    sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere;

                    sqlFinal += `) d GROUP BY d."receivedOn"`;
                    sqlFinal += `) fnl`;
    
                    console.log('Plant Raw Material sql: ', sqlFinal);
                    
                    plantLotRawMaterialRecs = await knexReader.raw(sqlFinal);
                    if(plantLotRawMaterialRecs.rows.length > 0){
                        rec1.child = plantLotRawMaterialRecs.rows[0].data;
                    }
                }

            }
            else {
                //  does not have Plant Lot detail
            }
        }
        /* */
    }

    if(batchTypeId == BatchTypes.RawMaterial){

        //  4. lotNo neither of Production nor of Harvest nor of Plant Lot, is if of Raw Material?
        // var selectedRawMaterialLotRecs = { rows: [] };
        var ramMaterialLotRecs;
        let sqlFinal;

        validRawMaterialLotNo = false;

        if(!validHarvestPlantLotNo && !validPlantLotNo){
            sqlStr = `SELECT json_agg(row_to_json(fnl.*)) "data" FROM (`;
            sqlStr += `SELECT json_agg(row_to_json(d.*)) "data", 'Raw Material' "treeLabel", d."receivedOn" "date" FROM (`;

            sqlSelect = `select i."name" "cardHeading", i."name" "itemName", i.gtin "itemGtin", ic."name" "itemCategoryName", u."name" "itemUM", s."name" "itemSupplierName"
            , it.quantity "quantity", it.quality "quality", it."date" "receivedOn", it."lotNo" "lotNo", it.imported "itemImported", it."expiryDate"
            , sl."name" "itemStorageLocation", l."number" "licenseNumber"
            `;

            sqlFrom = ` FROM items i, item_categories ic, ums u, storage_locations sl, item_txns it
            LEFT JOIN licenses l ON l.id = it."licenseId"
            LEFT JOIN item_txn_suppliers its ON its."itemTxnId" = it.id
            LEFT JOIN suppliers s ON s.id = its."supplierId"
            `;

            sqlWhere = ` WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId} AND it."lotNo" = '${lotNo}' AND it."txnType" = 11`;
            sqlWhere += ` AND it."itemCategoryId" = ic.id and it."itemId" = i.id and it."umId" = u.id and it."storageLocationId" = sl.id`;

            sqlFinal = sqlStr + sqlSelect + sqlFrom + sqlWhere;

            sqlFinal += `) d GROUP BY d."receivedOn"`;
            sqlFinal += `) fnl`;
    
            console.log('Raw Material sql: ', sqlFinal);

            ramMaterialLotRecs = await knexReader.raw(sqlFinal);

            validRawMaterialLotNo = ramMaterialLotRecs.rows.length > 0;
            if(validRawMaterialLotNo){
                productionInputDetail = ramMaterialLotRecs;
            }
        }

    }
    
        lotNoDetail = {};

        /* */
        let productionOutput = [{...productionOutputDetail.rows[0]}];
        let data = [{}];
        
        data = productionInputDetail.rows[0]?.data;

        lotNoDetail = {
            productionOutput: productionOutput,
            data: data,
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

const knexReader = require('../../db/knex-reader');

const getRawMaterialLotNoDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let reqData = req.query;

        let { companyId, lotNo } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        let validRawMaterialLotNo, validProductionLot, validHarvestLotNo, validPlantLotNo, lotNoDetail, result;
        let validRawMaterialPlantLotNo, validPlantHarvestLotNo;

        validRawMaterialLotNo = false;
        validProductionLot = false;
        validHarvestLotNo = false;
        validPlantHarvestLotNo = false;
        validPlantLotNo = false;
        validRawMaterialPlantLotNo = false;

        //  if lotNo is of Raw Material
        var selectedRawMaterialLotRecs = { rows: [] };

        //  1. Raw Material detail of lotNo
        sqlSelect = `SELECT it.id, it.quantity "rawItemQuantity", it."date" "rawItemDate", it."lotNo" "rawItemLotNo", it.imported "rawItemImported"
        , i."name" "rawItemName", i.gtin "rawItemGtin", ic."name" "rawItemCategoryName", u."name" "rawItemUM", sl."name" "rawItemStorageLocation", l."number" "licenseNumber", s."name" "rawItemSupplierName"
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
        sqlWhere += ` AND it."itemCategoryId" = ic.id AND it."itemId" = i.id AND it."umId" = u.id AND it."storageLocationId" = sl.id;
        `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;
    
        selectedRawMaterialLotRecs = await knexReader.raw(sqlStr);

        //  Whether lotNo is of Raw Material
        validRawMaterialLotNo = selectedRawMaterialLotRecs?.rows.length > 0;

        /* */
        //  2. Plant Lots (Plantation) of Raw Material lotNo
        sqlSelect = `SELECT pl.*, l."number" "licenseNumber", l2."name" "plantLocation"
        , (SELECT json_agg(row_to_json(p.*)) "plants"
        FROM (
        SELECT p.*
        FROM plants p 
        WHERE p."plantLotId" = pl.id AND p."isActive" AND NOT p."isWaste" AND NOT p."isDestroy"
        ) p
        )`;

        sqlFrom = ` FROM plant_lots pl, licenses l, locations l2
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }

        sqlWhere += ` AND  pl."licenseId" = l.id AND pl."locationId" = l2.id
        `;

        var selectedPlantLotRecs = { rows: [] };

        validPlantLotNo = false;
        validRawMaterialPlantLotNo = false;

        if(validRawMaterialLotNo){
            //  lotNo is of Raw Material, get Plant
            sqlWhere += ` AND pl."itemLotNo" = '${selectedRawMaterialLotRecs.rows[0].rawItemLotNo}'
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            selectedPlantLotRecs = await knexReader.raw(sqlStr);

            //  Raw Material has Plant?
            validRawMaterialPlantLotNo = selectedPlantLotRecs?.rows.length > 0;
        }
        else {
            //  lotNo is NOT of Raw Material, check if it is of Plant
            sqlWhere += ` AND pl."lotNo" = '${lotNo}'
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            selectedPlantLotRecs = await knexReader.raw(sqlStr);

            //  is plant lotNo?
            validPlantLotNo = selectedPlantLotRecs?.rows.length > 0;
        }
        
        //  3. Harvest detail
        sqlSelect = `SELECT hpl.*, it.*, i."name" "itemName", i.gtin "itemGtin", ic.name "itemCategoryName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        `;

        sqlFrom = ` FROM harvest_plant_lots hpl, item_txns it, items i, item_categories ic, ums u, storage_locations sl
        `;

        sqlWhere = ` WHERE hpl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND hpl."companyId" = ${companyId}`;
        }
        sqlWhere += ` AND it."harvestPlantLotId" = hpl.id AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id
        `;

        var selectedHarvestRecs = { rows: [] };

        validHarvestLotNo = false;
        validPlantHarvestLotNo = false;
        
        if(validRawMaterialPlantLotNo){
            //  Raw Material has plant, get plant harvest
            const harvestedPlantIds = selectedPlantLotRecs.rows.map(r => r.id);

            sqlWhere += ` AND hpl."plantLotId" in (${harvestedPlantIds})
            `;

            sqlOrderBy = ` ORDER BY hpl."plantLotId";`;

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
            
            selectedHarvestRecs = await knexReader.raw(sqlStr);

            //  is plant's harvest lotNo?
            validPlantHarvestLotNo = selectedHarvestRecs.rows.length > 0;
        }
        else if(validPlantLotNo){
            //  lotNo is of plant, get plant harvest
            const harvestedPlantIds = selectedPlantLotRecs.rows.map(r => r.id);
            
            sqlWhere += ` AND hpl."plantLotId" in (${harvestedPlantIds})
            `;

            sqlOrderBy = ` ORDER BY hpl."plantLotId";`;

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
            
            selectedHarvestRecs = await knexReader.raw(sqlStr);

            //  is plant's harvest lotNo?
            validPlantHarvestLotNo = selectedHarvestRecs.rows.length > 0;
        }
        else {
            //  lotNo neither of Raw Material nor of Plant, check if it is of Harvest

            sqlWhere += ` AND hpl."lotNo" = '${lotNo}'
            `;

            sqlOrderBy = ` ORDER BY hpl."plantLotId";`;

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
            
            selectedHarvestRecs = await knexReader.raw(sqlStr);

            //  is harvest lotNo?
            validHarvestLotNo = selectedHarvestRecs.rows.length > 0;
        }

        //  4. Production detail
        sqlSelect = `SELECT pl.*, i.name  "itemName", ic.name "itemCategoryName", i.gtin "itemGtin", p."name" "processName", c."companyName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        , (SELECT json_agg(row_to_json(o.*)) "outItems"
        FROM (
        SELECT it.*, i.name "itemName", i.name "cardHeading", i.gtin "itemGtin", ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
        FROM item_txns it, items i, item_categories ic, ums, storage_locations sl
        WHERE it."productionLotId" = pl.id AND it.quantity > 0 AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id
        ) o
        )`;

        sqlFrom = ` FROM production_lots pl, items i, item_categories ic, processes p, companies c, ums u, storage_locations sl
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }
        sqlWhere += ` AND pl."itemId" = i.id AND pl."itemCategoryId" = ic.id AND pl."umId" = u.id AND pl."storageLocationId" = sl.id AND pl."processId" = p.id AND pl."companyId" = c.id`;

        var selectedRecs = { rows: [] };

        if(validPlantHarvestLotNo || validHarvestLotNo){
            //  get harvest production

            //  using Set constructor and spread to remove duplicate lot nos
            const harvestLotNos = [... new Set(selectedHarvestRecs?.rows.map(r => "'" + r.lotNo + "'"))];
            console.log('harvest lot nos: ', harvestLotNos);

            sqlWhere += ` AND pl."itemLotNo" in (${harvestLotNos})`;

            sqlOrderBy = ` ORDER BY "productionOn" DESC, "itemName" ASC`;
            //console.log('getRawMaterialLotNoDetail sql: ', sqlSelect + sqlFrom + sqlWhere);

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

            //console.log('getRawMaterialLotNoDetail: ', sqlStr);
            
            selectedRecs = await knexReader.raw(sqlStr);

            validProductionLot = selectedRecs?.rows.length > 0;
        }
        else {
            //  lotNo neither of Raw Material nor of Plant nor of Harvest, check if it is of Production

            sqlWhere += ` AND pl."lotNo" = '${lotNo}'`;

            sqlOrderBy = ` ORDER BY "productionOn" DESC, "itemName" ASC`;
            //console.log('getRawMaterialLotNoDetail sql: ', sqlSelect + sqlFrom + sqlWhere);

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

            //console.log('getRawMaterialLotNoDetail: ', sqlStr);
            
            selectedRecs = await knexReader.raw(sqlStr);

            validProductionLot = selectedRecs?.rows.length > 0;
        }
        /* */



/* 
        //  2. Plant Lots (Plantation) of Raw Material lotNo
        if(!validRawMaterialLotNo){
            //  lotNo is NOT of Raw Material
            selectedRawMaterialLotRecs = { rows: [] };
            validPlantLotNo = false;
        }
        else{
            //  lotNo is of Raw Material, get Plant Lots (Plantation) of raw material lotNo
            sqlSelect = `SELECT pl.*, l."number" "licenseNumber", l2."name" "plantLocation"
            , (SELECT json_agg(row_to_json(p.*)) "plants"
            FROM (
            SELECT p.*
            FROM plants p 
            WHERE p."plantLotId" = pl.id AND p."isActive" AND NOT p."isWaste" AND NOT p."isDestroy"
            ) p
            )`;

            sqlFrom = ` FROM plant_lots pl, licenses l, locations l2
            `;

            sqlWhere = ` WHERE pl."orgId" = ${orgId} AND  pl."itemLotNo" = '${lotNo}'
            `;
            if(companyId){
                sqlWhere += ` AND pl."companyId" = ${companyId}`;
            }
            sqlWhere += ` AND  pl."licenseId" = l.id AND pl."locationId" = l2.id;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            var selectedPlantLotRecs = await knexReader.raw(sqlStr);

            validPlantLotNo = selectedPlantLotRecs?.rows.length > 0;
        }

        //  3. Harvest Plant Lots
        if(!validPlantLotNo){
            selectedPlantLotRecs = { rows: [] };
            validHarvestLotNo = false;
        }
        else{
            const harvestedPlantIds = selectedPlantLotRecs?.rows.map(r => r.id);
            // console.log('harvest plant ids: ', harvestedPlantIds);

            sqlSelect = `SELECT hpl.*, it.*, i."name" "itemName", i.gtin "itemGtin", ic.name "itemCategoryName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
            `;

            sqlFrom = ` FROM harvest_plant_lots hpl, item_txns it, items i, item_categories ic, ums u, storage_locations sl
            `;

            sqlWhere = ` WHERE hpl."orgId" = ${orgId} AND hpl."plantLotId" in (${harvestedPlantIds})
            `;
            if(companyId){
                sqlWhere += ` AND hpl."companyId" = ${companyId}`;
            }
            sqlWhere += ` AND it."harvestPlantLotId" = hpl.id AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id
            `;

            sqlOrderBy = ` ORDER BY hpl."plantLotId";`;

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
            
            var selectedHarvestRecs = await knexReader.raw(sqlStr);

            validHarvestLotNo = selectedHarvestRecs?.rows.length > 0;
        }

        //  4. Production
        if(!validHarvestLotNo){
            selectedHarvestRecs = { rows: [] };
            validProductionLot = false;
        }
        else{
            //  using Set constructor and spread to remove duplicate lot nos
            const harvestLotNos = [... new Set(selectedHarvestRecs?.rows.map(r => "'" + r.lotNo + "'"))];
            console.log('harvest lot nos: ', harvestLotNos);

            sqlSelect = `SELECT pl.*, i.name  "itemName", ic.name "itemCategoryName", i.gtin "itemGtin", p."name" "processName", c."companyName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
            , (SELECT json_agg(row_to_json(o.*)) "outItems"
            FROM (
            SELECT it.*, i.name "itemName", i.gtin "itemGtin", ic.name "itemCategoryName", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
            FROM item_txns it, items i, item_categories ic, ums, storage_locations sl
            WHERE it."productionLotId" = pl.id AND it.quantity > 0 AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."storageLocationId" = sl.id
            ) o
            )`;

            sqlFrom = ` FROM production_lots pl, items i, item_categories ic, processes p, companies c, ums u, storage_locations sl
            `;

            sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."itemLotNo" in (${harvestLotNos})`;
            if(companyId){
                sqlWhere += ` AND pl."companyId" = ${companyId}`;
            }
            sqlWhere += ` AND pl."itemId" = i.id AND pl."itemCategoryId" = ic.id AND pl."umId" = u.id AND pl."storageLocationId" = sl.id AND pl."processId" = p.id AND pl."companyId" = c.id`;

            sqlOrderBy = ` ORDER BY "productionOn" DESC, "itemName" ASC`;
            //console.log('getRawMaterialLotNoDetail sql: ', sqlSelect + sqlFrom + sqlWhere);

            sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

            //console.log('getRawMaterialLotNoDetail: ', sqlStr);
            
            var selectedRecs = await knexReader.raw(sqlStr);

            validProductionLot = selectedRecs?.rows.length > 0;
        }
 */

        lotNoDetail = {};

        /* */
        let productionOutput = [{...selectedRecs?.rows[0]}];
        productionOutput[0].treeLabel = 'Products'
        /* */

        lotNoDetail = {
            productionOutput: productionOutput,

            rawMaterialLotDetail: selectedRawMaterialLotRecs?.rows,
            plantLotDetail: selectedPlantLotRecs?.rows,
            harvestDetail: selectedHarvestRecs?.rows,
            productionDetail: selectedRecs?.rows,
        };
        console.log('lotNoDetail: ', lotNoDetail);

        result = {
            data: {
                records: lotNoDetail,
                message: "Raw Material Lot No. Detail!"
            }
        }            
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][mis][getRawMaterialLotNoDetail] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getRawMaterialLotNoDetail;

/**
 */

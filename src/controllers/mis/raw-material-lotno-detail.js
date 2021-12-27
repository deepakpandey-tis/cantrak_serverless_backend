const knexReader = require('../../db/knex-reader');

const getRawMaterialLotNoDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let reqData = req.query;

        let { companyId, lotNo } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        let validRawMaterialLotNo, validProductionLot, validHarvestLot, validPlantLot, lotNoDetail, result;

        validRawMaterialLotNo = false;
        validProductionLot = false;
        validHarvestLot = false;
        validPlantLot = false;

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

        validRawMaterialLotNo = selectedRawMaterialLotRecs?.rows.length > 0;

        //  2. Plant Lots (Plantation) of Raw Material lotNo
        if(!validRawMaterialLotNo){
            selectedRawMaterialLotRecs = { rows: [] };
            validPlantLot = false;
        }
        else{
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

            validPlantLot = selectedPlantLotRecs?.rows.length > 0;
        }

        //  3. Harvest Plant Lots
        if(!validPlantLot){
            selectedPlantLotRecs = { rows: [] };
            validHarvestLot = false;
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

            validHarvestLot = selectedHarvestRecs?.rows.length > 0;
        }

        //  4. Production
        if(!validHarvestLot){
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

        lotNoDetail = {};
        lotNoDetail = {
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

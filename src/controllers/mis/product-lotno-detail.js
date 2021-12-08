const knexReader = require('../../db/knex-reader');

const getProductLotNoDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let reqData = req.query;

        let { companyId, lotNo } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        let validProductionLotNo, harvestLotNo, validHarvestLotNo, validPlantLotNo, lotNoDetail, result;

        //  1. Production detail of product lotNo
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

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."lotNo" = '${lotNo}'`;
        sqlWhere += ` AND pl."itemId" = i.id AND pl."itemCategoryId" = ic.id AND pl."umId" = u.id AND pl."storageLocationId" = sl.id AND pl."processId" = p.id AND pl."companyId" = c.id`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }

        sqlOrderBy = ` ORDER BY "productionOn" DESC, "itemName" ASC`;
        //console.log('getProductLotNoDetail sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        //console.log('getProductLotNoDetail: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        console.log('selectedRecs: ', selectedRecs);

        validProductionLotNo = selectedRecs.rows.length > 0;

        if(validProductionLotNo){
            harvestLotNo = selectedRecs.rows[0].itemLotNo;
        }
        else {
            harvestLotNo = lotNo;
        }

/*         if(validProductionLotNo){ */
            //  2. Harvest detail of item used in production
            sqlSelect = `SELECT hpl.*, it.*, i."name" "itemName", i.gtin "itemGtin", ic.name "itemCategoryName", u."name"  "itemUM", u.abbreviation "itemUMAbbreviation", sl.name "itemStorageLocation"
            `;

            sqlFrom = ` FROM harvest_plant_lots hpl, item_txns it, items i, item_categories ic, ums u, storage_locations sl
            `;

            sqlWhere = ` WHERE hpl."orgId" = ${orgId} AND hpl."lotNo" = '${harvestLotNo}' AND it."harvestPlantLotId" = hpl.id
            `;
            if(validProductionLotNo){
                sqlWhere += ` AND it."itemCategoryId" = ${selectedRecs.rows[0].itemCategoryId} AND it."itemId" = ${selectedRecs.rows[0].itemId}
                `;
            }
            else{
                if(companyId){
                    sqlWhere += ` AND hpl."companyId" = ${companyId}`;
                }
            }
            sqlWhere += `
            AND it."itemId" = i.id AND it."itemCategoryId" = ic.id AND it."umId" = u.id AND it."storageLocationId" = sl.id;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            var selectedHarvestRecs = await knexReader.raw(sqlStr);

            validHarvestLotNo = selectedHarvestRecs.rows.length > 0;

            //  3. Plant detail of harvested item used in production
            sqlSelect = `SELECT pl.*, l."number" "licenseNumber", l2."name" "plantLocation"
            , i2."name" "rawItemName", i2.gtin "rawItemGtin", ic."name" "rawItemCategoryName", u2."name" "rawItemUM", s."name" "rawItemSupplierName", it2.quantity "rawItemQuantity", it2."date" "rawItemDate", it2."lotNo" "rawItemLotNo", it2.imported "rawItemImported", sl2."name" "rawItemStorageLocation"
            , (SELECT json_agg(row_to_json(p.*)) "plants" 
            FROM (
            SELECT p.*
            FROM plants p 
            WHERE p."plantLotId" = pl.id AND p."isActive" AND NOT p."isWaste" AND NOT p."isDestroy"
            ) p
            )`;

            sqlFrom = ` FROM plant_lots pl, licenses l, locations l2
            , items i2, item_categories ic , ums u2, item_txns it2, storage_locations sl2, suppliers s 
            `;

            sqlWhere = ` WHERE`;
            if(validHarvestLotNo){
                sqlWhere += ` pl.id = '${selectedHarvestRecs.rows[0].plantLotId}'`;
            }
            else {
                sqlWhere += ` pl."orgId" = ${orgId} AND pl."lotNo" = '${lotNo}'`;
                if(companyId){
                    sqlWhere += ` AND pl."companyId" = ${companyId}`;
                }
            }
            sqlWhere += ` AND  pl."licenseId" = l.id and pl."locationId" = l2.id 
            AND pl."itemId" = i2.id AND pl."itemCategoryId" = ic.id AND i2."umId" = u2.id AND pl."supplierId" = s.id 
            AND pl."itemTxnId" = it2.id AND it2."storageLocationId" = sl2.id;
            `;

            sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
            var selectedPlantLotRecs = await knexReader.raw(sqlStr);

            validPlantLotNo = selectedPlantLotRecs.rows.length > 0;

            //  4. Raw Material
            var selectedRawMaterialLotRecs = { rows: [] };
            if(!validPlantLotNo){
                // Checking if a Raw Material Lot No
                sqlSelect = `SELECT it.quantity "rawItemQuantity", it."date" "rawItemDate", it."lotNo" "rawItemLotNo", it.imported "rawItemImported"
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
                sqlWhere += ` AND it."itemCategoryId" = ic.id and it."itemId" = i.id and it."umId" = u.id and it."storageLocationId" = sl.id ;
                `;

                sqlStr = sqlSelect + sqlFrom + sqlWhere;
            
                selectedRawMaterialLotRecs = await knexReader.raw(sqlStr);
            }

            lotNoDetail = {};
/*             if(validProductionLotNo){
                lotNoDetail = {
                    productionDetail: selectedRecs.rows,
                    harvestDetail: selectedHarvestRecs.rows,
                    plantLotDetail: selectedPlantLotRecs.rows,
                };
            }
            else{ */
                lotNoDetail = {
                    productionDetail: selectedRecs.rows,
                    harvestDetail: selectedHarvestRecs.rows,
                    plantLotDetail: selectedPlantLotRecs.rows,
                    rawMaterialLotDetail: selectedRawMaterialLotRecs.rows,
                };
            // }
            console.log('lotNoDetail: ', lotNoDetail);

            result = {
                data: {
                    records: lotNoDetail,
                    message: "Product Lot No. Detail!"
                }
            }            

/*             selectedRecs.rows[0].harvestDetail = selectedHarvestRecs.rows;
            selectedRecs.rows[0].plantLotDetail = selectedPlantLotRecs.rows;
            console.log('selectedRecs: ', selectedRecs.rows);
            result = {
                data: {
                    records: selectedRecs.rows,
                    message: "Product Lot No. Detail!"
                }
            }
 */

/*         }
        else{
            result = {
                data: {
                    records: [],
                    message: "Product Lot No. Detail!"
                }
            }
        } */
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

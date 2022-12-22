const knexReader = require('../../db/knex-reader');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

/* const ItemCategory = {
    AllInventoryItems: 0,
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveProductFromHarvest: 21,
    ReceiveWasteFromPlantWaste: 22,
    ReceiveWaste: 23,                          // Inventory option
    ReceiveFromProduction: 24,
    AdjustmentAdd: 41,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueForProduction: 54,
    IssueForSale: 55,
    AdjustmentMinus: 81,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};
 */

const getRawMaterialForPlantList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { itemCategoryId, lotNo, companyId, itemId, strainId, storageLocationId, supplierId, includeZeroBalance } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, balanceCondition;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"lotNo"`;
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'desc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        // 2022/12/22: issue for plantation is added to get planted quantity
        sqlSelect = `SELECT it.*, its.id "itemTxnSupplierId", its."supplierId", its."lotNo" "supplierLotNo"
        , its."licenseNo" "supplierLicenseNo", its."internalCode" "supplierInternalCode", its."quality" "supplierQuality", splr.name "supplierName"
        , s.name "strainName", s2.name "specieName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        , (SELECT coalesce(sum(quantity), 0) FROM item_txns txn WHERE txn."orgId" = it."orgId" AND txn."companyId" = it."companyId"
           AND txn."lotNo" = it."lotNo" AND txn."itemCategoryId" = it."itemCategoryId" AND txn."itemId" = it."itemId" 
           AND txn."txnType" >= ${TxnTypes.IssueFromTxnType} AND txn."txnType" <= ${TxnTypes.IssueUptoTxnType}) "issuedQuantity"
        , (SELECT coalesce(sum(quantity), 0) FROM item_txns txn WHERE txn."orgId" = it."orgId" AND txn."companyId" = it."companyId"
           AND txn."lotNo" = it."lotNo" AND txn."itemCategoryId" = it."itemCategoryId" AND txn."itemId" = it."itemId" 
           AND txn."txnType" = ${TxnTypes.IssueForPlantation}) "plantedQuantity"
        `;

        // raw material (seeds) can be from harvest, in this case supplier is not available therefore left join used
        // , item_txn_suppliers its, suppliers splr
        sqlFrom = ` FROM item_txns it
        LEFT JOIN item_txn_suppliers its on it.id = its."itemTxnId"
        LEFT JOIN suppliers splr on its."supplierId" = splr.id
        , companies c, strains s, species s2, items i2, ums
        , storage_locations sl, item_categories ic, users u2
        `;

        // raw material (seeds) can be from harvest, in this case supplier is not available therefore left join used
        // AND it.id = its."itemTxnId" AND its."supplierId" = splr.id 
        sqlWhere = ` WHERE it."orgId" = ${orgId}`;
        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(companyId){
            sqlWhere += ` AND it."companyId" = ${companyId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(strainId){
            sqlWhere += ` AND it."strainId" = ${strainId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }
        if(supplierId){
            sqlWhere += ` AND its."supplierId" = ${supplierId}`;
        }
        if(lotNo){
            sqlWhere += ` AND it."lotNo" iLIKE '%${lotNo}%'`;
        }

        sqlWhere += ` AND it."itemCategoryId" = ${ItemCategory.RawMaterial} AND it."txnType" >= ${TxnTypes.ReceiveFromTxnType} AND it."txnType" <= ${TxnTypes.ReceiveUptoTxnType} 
          AND it."itemId" = i2.id AND it."strainId" = s.id AND it."specieId" = s2.id AND it."companyId" = c.id AND it."umId" = ums.id
          AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getRawMaterialForPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

        if(includeZeroBalance){
            balanceCondition = ``;
        }
        else
        {
            balanceCondition = ` WHERE (Main_CTE."quantity" + Main_CTE."issuedQuantity") > 0`;
        }

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE ${balanceCondition})`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE ${balanceCondition}`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getRawMaterialForPlantList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Raw Material For Plant list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][inventories][getRawMaterialForPlantList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getRawMaterialForPlantList;

/**
 */

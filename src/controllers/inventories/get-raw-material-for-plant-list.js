const knexReader = require('../../db/knex-reader');

const ItemCategory = {
    AllInventoryItems: 0,
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

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

        let { itemCategoryId, lotNo, companyId, licenseId, licenseNarId, itemId, strainId, storageLocationId, supplierId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

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
        sqlSelect = `SELECT it.*, its.id "itemTxnSupplierId", its."supplierId", its."lotNo" "supplierLotNo"
        , its."licenseNo" "supplierLicenseNo", its."internalCode" "supplierInternalCode", its."quality" "supplierQuality", splr.name "supplierName"
        , s.name "strainName", s2.name "specieName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        , (SELECT coalesce(sum(quantity), 0) FROM item_txns txn WHERE txn."orgId" = it."orgId" AND txn."companyId" = it."companyId"
           AND txn."lotNo" = it."lotNo"
           AND txn."txnType" >= ${TxnTypes.IssueFromTxnType} AND txn."txnType" <= ${TxnTypes.IssueUptoTxnType}) "issuedQuantity"
        `;

        sqlFrom = ` FROM item_txns it, item_txn_suppliers its, companies c, strains s, species s2, items i2, ums, suppliers splr
        , storage_locations sl, item_categories ic, users u2
        `;

        sqlWhere = ` WHERE it."orgId" = ${orgId} AND it.id = its."itemTxnId"`;
        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(companyId){
            sqlWhere += ` AND it."companyId" = ${companyId}`;
        }
        if(licenseId){
            sqlWhere += ` AND it."licenseId" = ${licenseId}`;
        }
        if(licenseNarId){
            sqlWhere += ` AND it."licenseNarId" = ${licenseNarId}`;
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
          AND its."supplierId" = splr.id AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getRawMaterialForPlantList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
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

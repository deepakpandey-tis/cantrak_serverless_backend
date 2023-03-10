const knexReader = require('../../db/knex-reader');
const { ItemCategory, BatchTypes, TxnTypes, SystemStores } = require('../../helpers/txn-types');
/* 
const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50
};
 */
const getItemTxnList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let {isExport, itemCategoryId, lotNo, companyId, itemId, strainId, storageLocationId, supplierId, txnType, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"companyName" asc, "date" desc, "txnType" asc, "lotNo" desc`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = '';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT it.*, to_char(to_timestamp(it.date/1000)::date, 'dd/mm/yyyy') "dateStr"
        , CASE WHEN it.quantity < 0 THEN TRUNC((-1 * it.quantity::numeric), 4) ELSE TRUNC(it.quantity::numeric, 4) END "quantityStr"
        , CASE WHEN it."imported" THEN 'Yes' ELSE 'No' END "importedStr", its.id "itemTxnSupplierId", its."supplierId", its."lotNo" "supplierLotNo"
        , its."licenseNo" "supplierLicenseNo", its."internalCode" "supplierInternalCode", its."quality" "supplierQuality", splr.name "supplierName"
        , s.name "strainName", s2.name "specieName", CONCAT(s.name, ' (', s2.name, ')') "strainSpecieName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        , l.number "licenseNumber", ln."permitNumber" "narPermitNumber", tt."name" "txnTypeName"
        , (SELECT coalesce(sum(quantity), 0) FROM item_txns txn WHERE txn."orgId" = it."orgId" AND txn."companyId" = it."companyId"
           AND txn."lotNo" = it."lotNo"
           AND txn."txnType" >= ${TxnTypes.IssueFromTxnType} AND txn."txnType" <= ${TxnTypes.IssueUptoTxnType}) "issuedQuantity"
        `;

        sqlFrom = ` FROM item_txns it LEFT OUTER JOIN licenses l on l.id = it."licenseId"
        LEFT OUTER JOIN license_nars ln on ln.id = it."licenseNarId"
        LEFT OUTER JOIN item_txn_suppliers its on its."itemTxnId" = it.id
        LEFT OUTER JOIN suppliers splr on splr.id = its."supplierId"
        LEFT OUTER JOIN txn_types tt on tt.id = it."txnType" AND tt."subId" = it."subId"
        , companies c, strains s, species s2, items i2, ums
        , storage_locations sl, item_categories ic, users u2
        `;

        sqlWhere = ` WHERE s."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND it."companyId" = ${companyId}`;
        }
        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
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
        if(txnType){
            sqlWhere += ` AND tt."id" = ${txnType}`;
        }
        if(fromDate){
            sqlWhere += ` AND it."date" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND it."date" <= ${new Date(toDate).getTime()}`;
        }

        sqlWhere += ` AND it."itemId" = i2.id AND it."strainId" = s.id AND it."specieId" = s2.id AND it."companyId" = c.id AND it."umId" = ums.id
          AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        console.log('getItemTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        if(!isExport){
            sqlStr  = `WITH Main_CTE AS (`;
        }
        else {
            sqlStr  = ``;
        }

        sqlStr += sqlSelect + sqlFrom + sqlWhere;

        if(!isExport){
            sqlStr += `), Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
            sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        }

        sqlStr += sqlOrderBy;

        if(!isExport){
            sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
            sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;
        }

        //console.log('getItemTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Item Transaction list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][inventories][getItemTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getItemTxnList;

/**
 */

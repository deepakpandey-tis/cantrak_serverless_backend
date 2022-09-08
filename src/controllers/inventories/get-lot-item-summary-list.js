const knexReader = require('../../db/knex-reader');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const getLotItemSummaryList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let {companyId, lotNo, itemCategoryId, itemId, strainId, storageLocationId, includeZeroBalance } = req.body;

        let sqlStr, sqlTxns, sqlTxnSum, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"companyName", "lotNo", "itemName", "strainName", "storageLocation"`;
            sortOrder = '';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions)
        sqlTxns = `WITH txns AS (
        SELECT it."companyId", it."itemCategoryId", it."itemId", it."lotNo", it."storageLocationId", it."specieId", it."strainId"
        , CASE WHEN it."txnType" >= ${TxnTypes.ReceiveFromTxnType} AND it."txnType" <= ${TxnTypes.ReceiveUptoTxnType} THEN quantity ELSE 0 END AS credit
        , CASE WHEN it."txnType" >= ${TxnTypes.IssueFromTxnType} AND it."txnType" <= ${TxnTypes.IssueUptoTxnType} THEN (quantity * -1) ELSE 0 END AS debit
        FROM item_txns it
        WHERE it."orgId" = ${orgId} AND it."itemCategoryId" = ${itemCategoryId}
        `;
        if(companyId){
            sqlTxns += ` AND it."companyId" = ${companyId}`;
        }
        if(itemId){
            sqlTxns += ` AND it."itemId" = ${itemId}`;
        }
        if(strainId){
            sqlTxns += ` AND it."strainId" = ${strainId}`;
        }
        if(storageLocationId){
            sqlTxns += ` AND it."storageLocationId" = ${storageLocationId}`;
        }
        if(lotNo){
            sqlTxns += ` AND it."lotNo" iLIKE '%${lotNo}%'`;
        }
        sqlTxns += `)`;

        sqlTxnSum = ` SELECT t."companyId", t."lotNo", t."itemCategoryId", t."itemId", t."specieId", t."strainId", t."storageLocationId", SUM(t.credit) credit, SUM(t.debit) debit
        FROM txns t
        GROUP BY "companyId", "lotNo", "itemCategoryId", "itemId", "specieId", "strainId", "storageLocationId"
        `;

        sqlStr = `WITH Main_CTE AS (`;
        sqlStr += `SELECT recs.*, (recs.credit - recs.debit) balance
        , ic.name "itemCategoryName", i.name "itemName", st.name "strainName", s.name "specieName", ums."name" "itemUM"
        , sl.name "storageLocation", c."companyName"
        FROM (${sqlTxns} ${sqlTxnSum}) recs, item_categories ic, items i, storage_locations sl, ums, species s, strains st, companies c
        WHERE recs."itemCategoryId" = ic.id AND recs."itemId" = i.id AND recs."storageLocationId" = sl.id
        AND recs."strainId" = st.id AND recs."specieId" = s.id AND i."umId" = ums.id AND recs."companyId" = c.id
        `;
        if(!includeZeroBalance){
            sqlStr += ` AND (recs.credit - recs.debit) > 0`
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        // sqlOrderBy = ` ORDER BY "companyName", "lotNo", "itemCategoryId", "itemName", "strainName", "storageLocation"`;

        sqlStr += `), Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLotItemSummaryList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Lot Item Storage Location Summary list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][inventories][getLotItemSummaryList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLotItemSummaryList;

/**
 */

const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getStorageLocationIssueRegister = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let IssueFromTxnType = 51;
        let IssueUptoTxnType = 90;

        let {companyId, itemCategoryId, itemId, storageLocationId, fromDate, toDate} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;

        sqlSelect = `SELECT ic."name" "itemCategory", sl."name" "storageLocation", i."name" "itemName", u.name "UoM"
        , tt."name" "txnTypeName"
        , it."storageLocationId", it.date, it."txnId", it."lotNo", (it.quantity * -1) "quantity"
        `;
        // , it.*

        sqlFrom = ` FROM item_txns it, item_categories ic, items i, storage_locations sl, txn_types tt, ums u`;

        sqlWhere = ` WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        AND it."txnType" >= ${IssueFromTxnType} AND it."txnType" <= ${IssueUptoTxnType}
        `;
        // AND it."date" >= ${new Date(fromDate).getTime()} AND it."date" <= ${new Date(toDate).getTime()}

        if(fromDate){
            sqlWhere += ` AND it."date" >= ${new Date(fromDate).getTime()}`;
        }

        if(toDate){
            sqlWhere += ` AND it."date" <= ${new Date(toDate).getTime()}`;
        }

        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }

        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }

        sqlWhere += ` AND it."itemCategoryId" = ic.id AND it."itemId" = i.id AND it."storageLocationId" = sl.id AND it."txnType" = tt.id AND tt."subId" = it."subId" AND it."umId" = u.id`;

        // sqlOrderBy = ` ORDER BY sl."name", ic."name", i."name", it."date", it."txnType" , it."txnId"`;
        sqlOrderBy = ` ORDER BY sl."name", it."date", it."txnId"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Storage Location Receipt register!"
        });

    } catch (err) {
        console.log("[controllers][reports][inventories][getStorageLocationIssueRegister] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStorageLocationIssueRegister;

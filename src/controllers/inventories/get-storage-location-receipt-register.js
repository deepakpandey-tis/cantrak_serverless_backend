const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getStorageLocationReceiptRegister = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let ReceiveFromTxnType = 11;
        let ReceiveUptoTxnType = 50;

        let {companyId, itemCategoryId, itemId, storageLocationId, fromDate, toDate} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;

        sqlSelect = `SELECT ic."name" "itemCategory", sl."name" "storageLocation", i."name" "itemName", u.name "UoM"
        , tt."nameEn" "txnTypeEn", tt."nameTh" "txnTypeTh", it.*
        `;

        sqlFrom = ` FROM item_txns it, item_categories ic, items i, storage_locations sl, txn_types tt, ums u`;

        sqlWhere = ` WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        AND it."txnType" >= ${ReceiveFromTxnType} AND it."txnType" <= ${ReceiveUptoTxnType}
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

        sqlWhere += ` AND it."itemCategoryId" = ic.id AND it."itemId" = i.id AND it."storageLocationId" = sl.id AND it."txnType" = tt.id AND it."umId" = u.id`;

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
        console.log("[controllers][inventories][getStorageLocationReceiptRegister] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStorageLocationReceiptRegister;

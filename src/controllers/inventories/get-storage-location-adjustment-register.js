const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

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

const getStorageLocationAdjustmentRegister = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let {companyId, itemCategoryId, itemId, storageLocationId, fromDate, toDate} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT it."orgId", it."companyId", it."itemCategoryId", it."itemId", it."umId", it."storageLocationId", it."date"
        , it."txnType", it."subId", it."txnId", it."lotNo", it."expiryDate"
        , case when "txnType" = 41 then it.quantity else 0 end as credit
        , case when "txnType" = 81 then (it.quantity * -1) else 0 end as debit
        , rm.description "txnRemark"
        , c."companyName", ic."name" "itemCategoryName", i."name" "itemName", u."name" "UoM", u.abbreviation "itemUMAbbreviation", tt."name" "txnTypeName", sl.name "storageLocation"
        `;

        sqlFrom = ` FROM item_txns it`;
        sqlFrom += ` LEFT OUTER JOIN remarks_master rm on it."orgId" = rm."orgId" AND it.id = rm."entityId" AND rm."entityType" = 'adjustment_txn_entry'`;
        sqlFrom += `, companies c , item_categories ic , items i ,ums u , txn_types tt, storage_locations sl`;

        sqlWhere = ` WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId} AND (it."txnType" = ${TxnTypes.AdjustmentAdd} OR it."txnType" = ${TxnTypes.AdjustmentMinus})`
        sqlWhere += ` AND it."companyId" = c.id AND it."itemCategoryId" = ic.id AND it."itemId" = i.id AND it."umId" = u.id AND it."txnType" = tt.id AND it."subId" = tt."subId" AND it."storageLocationId" = sl.id`;
        if(itemCategoryId){
            sqlWhere += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlWhere += ` AND it."itemId" = ${itemId}`;
        }
        if(storageLocationId){
            sqlWhere += ` AND it."storageLocationId" = ${storageLocationId}`;
        }

        sqlWhere += ` AND it."date" >= ${new Date(fromDate).getTime()} AND it."date" <= ${new Date(toDate).getTime()}`;

        sqlOrderBy = ` ORDER BY sl.name, it."date", it."txnType", it."txnId", it.id`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Adjustment Register!"
        });

    } catch (err) {
        console.log("[controllers][inventories][getStorageLocationAdjustmentRegister] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStorageLocationAdjustmentRegister;

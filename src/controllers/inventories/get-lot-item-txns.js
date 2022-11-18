const knexReader = require('../../db/knex-reader');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const getLotItemTxns = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let {companyId, lotNo, itemCategoryId, itemId, specieId, strainId, storageLocationId } = req.body;

        let sqlStr;

        sqlStr = `SELECT it."date", it."lotNo"
        , CASE WHEN it."txnType" >= ${TxnTypes.ReceiveFromTxnType} AND it."txnType" <= ${TxnTypes.ReceiveUptoTxnType} THEN quantity ELSE 0 END as credit
        , CASE WHEN it."txnType" >= ${TxnTypes.IssueFromTxnType} AND it."txnType" <= ${TxnTypes.IssueUptoTxnType} THEN (quantity * -1) ELSE 0 END as debit
        , i.name "itemName", st.name "strainName", sp.name "specieName", ums."name" "UoM", sl.name "storageLocationName"
        , co."companyName", u."name" "createdByName", s.name "supplierName", c.name "customerName", tt."name" "txnTypeName", rm.description "txnRemark"
        FROM items i, storage_locations sl, ums, species sp, strains st, companies co, users u, txn_types tt, item_txns it
        LEFT OUTER JOIN item_txn_suppliers its ON it."orgId" = its."orgId" AND it.id = its."itemTxnId"
        LEFT OUTER JOIN suppliers s ON its."supplierId" = s.id
        LEFT OUTER JOIN invoices inv ON it."orgId" = inv."orgId" AND it."invoiceId" = inv."id"
        LEFT OUTER JOIN customers c ON inv."customerId" = c.id
        LEFT OUTER JOIN remarks_master rm ON rm."orgId" = it."orgId" AND (rm."entityType" = 'invoice_cancelled' OR rm."entityType" = 'invoice_item_cancelled') AND rm."entityId" = it.id
        WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId} AND it."itemCategoryId" = ${itemCategoryId} AND it."itemId" = ${itemId} AND it."lotNo" = '${lotNo}'
        AND it."strainId" = ${strainId} AND it."storageLocationId" = ${storageLocationId}
        AND it."itemId" = i.id AND it."storageLocationId" = sl.id AND tt.id = it."txnType"
        AND it."strainId" = st.id AND it."specieId" = sp.id AND i."umId" = ums.id AND it."companyId" = co.id AND it."createdBy" = u.id
        ORDER BY it."date", it."createdAt"
        `;

        //console.log('getLotItemTxns: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Lot Item transactions list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][inventories][getLotItemTxns] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLotItemTxns;

/**
 */

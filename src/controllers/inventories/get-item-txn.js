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

const getItemTxn = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT it.*, its.id "itemTxnSupplierId", its."supplierId", its."lotNo" "supplierLotNo"
        , its."licenseNo" "supplierLicenseNo", its."internalCode" "supplierInternalCode", its."quality" "supplierQuality", splr.name "supplierName"
        , s.name "strainName", s2.name "specieName", i2.name "itemName", i2.description "itemDescription", c."companyName"
        , sl.name "storageLocation", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", u2."name" "createdByName"
        , l.number "licenseNumber", ln."permitNumber" "narPermitNumber", ln."issuedOn", ln."expiredOn"
        , inv."invoiceNo", inv."customerId", cust.name "customerName", tt."name" "txnTypeName"
        , (SELECT coalesce(sum(quantity), 0) FROM item_txns txn WHERE txn."orgId" = it."orgId" AND txn."companyId" = it."companyId"
           AND txn."lotNo" = it."lotNo"
           AND txn."txnType" >= ${TxnTypes.IssueFromTxnType} AND txn."txnType" <= ${TxnTypes.IssueUptoTxnType}) "issuedQuantity"
        `;
        sqlFrom = ` FROM item_txns it LEFT OUTER JOIN licenses l on l.id = it."licenseId"
        LEFT OUTER JOIN license_nars ln on ln.id = it."licenseNarId"
        LEFT OUTER JOIN item_txn_suppliers its on its."itemTxnId" = it.id
        LEFT OUTER JOIN suppliers splr on splr.id = its."supplierId"
        LEFT OUTER JOIN invoices inv on inv.id = it."invoiceId"
        LEFT OUTER JOIN customers cust on cust.id = inv."customerId"
        , companies c, strains s, species s2, items i2, ums, txn_types tt
        , storage_locations sl, item_categories ic, users u2
        `;
        sqlWhere = ` WHERE it.id = ${payload.id} AND it."orgId" = ${orgId}`;
        sqlWhere += ` AND it."itemId" = i2.id AND it."strainId" = s.id AND it."specieId" = s2.id AND it."companyId" = c.id
          AND it."umId" = ums.id AND tt.id = it."txnType" AND tt."subId" = it."subId"
          AND it."storageLocationId" = sl.id AND it."itemCategoryId" = ic.id AND it."umId" = ums.id AND it."createdBy" = u2.id
        `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Raw material from supplier detail!"
        });

    } catch (err) {
        console.log("[controllers][administration-features][inventories][getItemTxn] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getItemTxn;

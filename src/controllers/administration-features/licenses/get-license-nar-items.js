const knexReader = require('../../../db/knex-reader');

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

const getLicenseNarItems = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let result;
        let payload = req.body;

        let {licenseNarId,  itemCategoryId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        //  "quantityReceived": license NAR item quantity already received in store
        sqlSelect = `SELECT lni.*
        , (select coalesce(sum(it.quantity), 0) from item_txns it where lni."licenseNarId" = it."licenseNarId"
        and lni."itemCategoryId" = it."itemCategoryId" and lni."itemId" = it."itemId" and lni."specieId" = it."specieId" and lni."strainId" = it."strainId" 
        and it."txnType" = ${TxnTypes.ReceiveFromSupplier}) "quantityReceived"
        , i2.name, sp.name "specieName", st.name "strainName", ic.name "itemCategoryName", ums.name "itemUM"`;

        sqlFrom = ` FROM license_nar_items lni, items i2, species sp, strains st, item_categories ic, ums`;

        sqlWhere = ` WHERE lni."orgId" = ${orgId} AND lni."licenseNarId" = ${licenseNarId} AND lni."isActive"
        AND lni."itemCategoryId" = ic.id AND lni."itemId" = i2.id AND lni."specieId" = sp."id" AND lni."strainId" = st."id" AND lni."umId" = ums.id`;
        if(itemCategoryId){
            sqlWhere += ` AND lni."itemCategoryId" = ${itemCategoryId}`;
        }

        sqlOrderBy = ` ORDER BY i2.name, sp.name, st.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "License NAR Items!"
        });

    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getLicenseNarItems] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseNarItems;

/**
 */

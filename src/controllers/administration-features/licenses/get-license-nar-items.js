const knexReader = require('../../../db/knex-reader');

const getLicenseNarItems = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let result;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        //  "quantityReceived": license NAR item quantity already received in store
        sqlSelect = `SELECT lni.*
        , (select coalesce(sum(it.quantity), 0) from item_txns it where lni."licenseNarId" = it."licenseNarId" and lni."itemCategoryId" = it."itemCategoryId" and lni."itemId" = it."itemId" and it."txnType" = 11) "quantityReceived"
        , i2.name, ic.name "itemCategoryName", ums.name "itemUM"`;

        sqlFrom = ` FROM license_nar_items lni, items i2, item_categories ic, ums`;

        sqlWhere = ` WHERE lni."orgId" = ${orgId} AND lni."licenseNarId" = ${payload.licenseNarId} AND lni."isActive"
        AND lni."itemCategoryId" = ic.id AND lni."itemId" = i2.id AND lni."umId" = ums.id`;

        sqlOrderBy = ` ORDER BY i2.name asc`;

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

const knexReader = require('../../../db/knex-reader');

const getStrains = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT s.*, i2."name" "itemName", i2."description" "itemDessciption", ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"
        `;

        sqlFrom = ` FROM strains s, items i2, item_categories ic, ums`;

        sqlWhere = ` WHERE s.id = ${payload.itemId} AND s."orgId" = ${orgId} AND s."isActive" AND s."itemId" = i2.id`;
        sqlWhere += ` AND i2."itemCategoryId" = ic.id AND i2."umId" = ums.id`;

        sqlOrderBy = ` ORDER BY s.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Strains!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][strains][getStrains] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getStrains;

/**
 */

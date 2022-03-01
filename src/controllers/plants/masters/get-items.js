const knexReader = require('../../../db/knex-reader');

const getItems = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT i2.*, ic.name "itemCategory", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"
        `;

        sqlFrom = ` FROM items i2, item_categories ic, ums`;

        sqlWhere = ` WHERE i2."orgId" = ${orgId} AND i2."isActive"`;
        if(payload.itemCategoryId){
            sqlWhere += ` AND i2."itemCategoryId" = ${payload.itemCategoryId}`;
        }
        sqlWhere += ` AND i2."itemCategoryId" = ic.id AND i2."umId" = ums.id`;

        sqlOrderBy = ` ORDER BY i2.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Items!"
        });
    } catch (err) {
        console.log("[controllers][plants][masters][getItems] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getItems;

/**
 */

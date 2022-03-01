const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getStockStatus = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let {companyId, itemCategoryId, itemId, storageLocationId, asOnDate, lotNo} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;

        //  To get items' storage location balances
        sqlSelect = `SELECT "itemCategoryId", "itemId", "umId", "storageLocationId", "lotNo", "expiryDate", sum(quantity) "closing"
        FROM item_txns it
        WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        `;

        if(itemCategoryId){
            sqlSelect += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlSelect += ` AND it."itemId" = ${itemId}`;
        }

        if(storageLocationId){
            sqlSelect += ` AND it."storageLocationId" = ${storageLocationId}`;
        }

        if(lotNo){
            sqlSelect += ` AND it."lotNo" LIKE '${lotNo}%'`;
        }

        sqlSelect += ` AND it."date" < ${new Date(asOnDate).getTime()}`;
        sqlSelect += ` GROUP BY "itemCategoryId", "itemId", "storageLocationId", "lotNo", "expiryDate", "umId"`;

        sqlStr = `SELECT i."itemCategoryId", ic.name "itemCategoryName", i.id "itemId", i.name "itemName"
            , recs."storageLocationId", sl.name "storageLocationName", i."umId", ums.name "UoM"
            , recs."lotNo", recs."expiryDate", coalesce(recs.closing, 0) closing 
            FROM items i LEFT JOIN (
            ${sqlSelect}
            ) recs
            ON i.id = recs."itemId" AND recs.closing > 0
            LEFT JOIN item_categories ic ON i."itemCategoryId" = ic.id
            LEFT JOIN ums ON i."umId" = ums.id
            , storage_locations sl
            WHERE recs."storageLocationId" = sl.id
        `;

        if(itemCategoryId){
            sqlStr += ` AND i."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlStr += ` AND i."id" = ${itemId}`;
        }
        if(storageLocationId){
            sqlStr += ` AND sl."id" = ${storageLocationId}`;
        }

        sqlStr += ` ORDER BY ic.name, i.name, sl.name;`;

        selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Stock Status by Storage Location!"
        });

    } catch (err) {
        console.log("[controllers][reports][inventories][getStockStatus] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStockStatus;

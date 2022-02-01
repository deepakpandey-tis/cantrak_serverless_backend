const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getStockSummary = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let {companyId, itemCategoryId, itemId, storageLocationId, fromDate, toDate, lotNo} = req.body;

        let sqlStr, sqlSelectWith, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;
        let sqlStrItemsOpening, sqlSelectItemsOpening;

        sqlSelectWith = `WITH ledger AS (
            SELECT id, "itemCategoryId", "itemId", "storageLocationId", "umId", "lotNo", "expiryDate"
            , case when "txnType" >= 1 and "txnType" <= 50 then quantity else 0 end as credit
            , case when "txnType" >= 51 and "txnType" <= 90 then (quantity * -1) else 0 end as debit
            FROM item_txns it
            WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        `;

        if(itemCategoryId){
            sqlSelectWith += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlSelectWith += ` AND it."itemId" = ${itemId}`;
        }

        if(storageLocationId){
            sqlSelectWith += ` AND it."storageLocationId" = ${storageLocationId}`;
        }

        if(lotNo){
            sqlSelectWith += ` AND it."lotNo" LIKE '${lotNo}%'`;
        }

        sqlSelectWith += ` AND it."date" >= ${new Date(fromDate).getTime()} AND it."date" <= ${new Date(toDate).getTime()}`;

        sqlSelectWith += `)`;

        sqlSelect = ` SELECT "itemCategoryId", "itemId", "umId", "storageLocationId", "lotNo", "expiryDate", sum(credit) credit, sum(debit) debit
        FROM ledger l
        GROUP BY "itemCategoryId", "itemId", "storageLocationId", "umId", "lotNo", "expiryDate"
        `;

        //  Adding outer select to set order by 'Item Category', 'Item Name'
        sqlStr = `SELECT ic.name "itemCategoryName", i.name "itemName", ums.name "UoM", sl.name "storageLocationName", recs.*
            FROM (
            ${sqlSelectWith}  ${sqlSelect}
            ) recs, item_categories ic, items i, ums, storage_locations sl
            WHERE recs."itemCategoryId" = ic.id and recs."itemId" = i.id and recs."umId" = ums.id and recs."storageLocationId" = sl.id
            ORDER BY ic.name, i.name, sl.name;
        `;

        //  To get items' storage location, lotNo opening balances
        sqlSelectItemsOpening = `SELECT "itemCategoryId", "itemId", "umId", "storageLocationId", "lotNo", "expiryDate", sum(quantity) "opening"
        , 0 receipt, 0 issue, 0 closing
        FROM item_txns it
        WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        `;

        if(itemCategoryId){
            sqlSelectItemsOpening += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlSelectItemsOpening += ` AND it."itemId" = ${itemId}`;
        }

        if(storageLocationId){
            sqlSelectItemsOpening += ` AND it."storageLocationId" = ${storageLocationId}`;
        }

        if(lotNo){
            sqlSelectItemsOpening += ` AND it."lotNo" LIKE '${lotNo}%'`;
        }

        sqlSelectItemsOpening += ` AND it."date" < ${new Date(fromDate).getTime()}`;
        sqlSelectItemsOpening += ` GROUP BY "itemCategoryId", "itemId", "storageLocationId", "umId", "lotNo", "expiryDate"`;

        sqlStrItemsOpening = `SELECT i."itemCategoryId", ic.name "itemCategoryName", i.id "itemId", i.name "itemName"
            , recs."storageLocationId", sl.name "storageLocationName", i."umId", ums.name "UoM", recs."lotNo", recs."expiryDate"
            , coalesce(recs.opening, 0) opening, 0 receipt, 0 issue, coalesce(recs.opening, 0) closing FROM items i LEFT JOIN (
            ${sqlSelectItemsOpening}
            ) recs
            ON i.id = recs."itemId"
            LEFT JOIN item_categories ic ON i."itemCategoryId" = ic.id
            LEFT JOIN ums ON i."umId" = ums.id
            , storage_locations sl
            WHERE recs."storageLocationId" = sl.id
        `;

        if(itemCategoryId){
            sqlStrItemsOpening += ` AND i."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlStrItemsOpening += ` AND i."id" = ${itemId}`;
        }
        if(storageLocationId){
            sqlStrItemsOpening += ` AND sl."id" = ${storageLocationId}`;
        }

        sqlStrItemsOpening += ` ORDER BY ic.name, i.name, sl.name;`;

        [selectedRecs, itemsOpening] = await Promise.all([
            knexReader.raw(sqlStr),
            knexReader.raw(sqlStrItemsOpening)
        ]);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
                openingBalances: itemsOpening.rows,
            },
            message: "Stock Summary!"
        });

    } catch (err) {
        console.log("[controllers][inventories][getStockSummary] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStockSummary;

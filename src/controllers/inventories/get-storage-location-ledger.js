const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getStorageLocationLedger = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let {companyId, storageLocationId, itemCategoryId, itemId, fromDate, toDate} = req.body;

        let sqlStr, sqlSelectWith, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;
        let sqlStrItemsOpening, sqlSelectItemsOpening, andItemId;

        sqlSelectWith = `WITH ledger AS (
            SELECT id, "itemCategoryId", "itemId", "umId", "date", "txnType"
            , case when "txnType" >= 1 and "txnType" <= 50 then quantity else 0 end as credit
            , case when "txnType" >= 51 and "txnType" <= 90 then (quantity * -1) else 0 end as debit
            , row_number() over (order by "itemCategoryId", "itemId", date, "txnType") as row
            FROM item_txns it
            WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        `;

        sqlSelectWith += ` AND it."storageLocationId" = ${storageLocationId}`;
        if(itemCategoryId){
            sqlSelectWith += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlSelectWith += ` AND it."itemId" = ${itemId}`;
        }

        sqlSelectWith += ` AND it."date" >= ${new Date(fromDate).getTime()} AND it."date" <= ${new Date(toDate).getTime()}`;

        sqlSelectWith += `)`;

        sqlSelect = ` SELECT l1."itemCategoryId", l1."itemId", l1."umId", l1."date", l1."txnType", l1.row, l1.id
        , (coalesce(SUM(L2.credit), 0) - coalesce(SUM(L2.debit), 0))  AS opening
        , l1.credit as credit, l1.debit as debit
        , (coalesce( L1.credit, 0) + coalesce(SUM(L2.credit), 0) - coalesce(SUM(L2.debit), 0)- coalesce((L1.debit), 0)) As closing
        FROM ledger l1
        LEFT JOIN ledger l2
        ON l1."itemCategoryId" = l2."itemCategoryId" and l1."itemId" = l2."itemId" and l1.row > l2.row
        GROUP BY l1."itemCategoryId", l1."itemId", l1."umId", l1."date", l1."txnType", l1.row, l1.id, l1.credit, l1.debit
        ORDER BY l1."itemCategoryId", l1."itemId", l1."umId", l1."date", l1."txnType", l1.row
        `;

        //  Adding outer select to set order by 'Item Category', 'Item Name'
        sqlStr = `SELECT ic.name "itemCategoryName", i.name "itemName", ums.name "UoM", recs.*, it."lotNo", s.name "supplierName", c.name "customerName"
            FROM (
            ${sqlSelectWith}  ${sqlSelect}
            ) recs, item_categories ic, items i, ums, item_txns it
            LEFT OUTER JOIN item_txn_suppliers its ON it."orgId" = its."orgId" AND it.id = its."itemTxnId"
            LEFT OUTER JOIN suppliers s ON its."supplierId" = s.id
            LEFT OUTER JOIN invoices inv ON it."orgId" = inv."orgId" AND it."invoiceId" = inv."id"
            LEFT OUTER JOIN customers c ON inv."customerId" = c.id
            WHERE recs."itemCategoryId" = ic.id and recs."itemId" = i.id and recs."umId" = ums.id and recs.id = it.id
            ORDER BY ic.name, i.name, recs.row;
        `;

/*         sqlStr  = sqlSelectWith + sqlSelect;
        var selectedRecs = await knexReader.raw(sqlStr);
 */

        //  To get items opening balances
        sqlSelectItemsOpening = `SELECT "itemCategoryId", "itemId", "umId", sum(quantity) "opening"
        , 0 receipt, 0 issue, 0 closing
        FROM item_txns it
        WHERE it."orgId" = ${orgId} AND it."companyId" = ${companyId}
        `;

        sqlSelectItemsOpening += ` AND it."storageLocationId" = ${storageLocationId}`;
        if(itemCategoryId){
            sqlSelectItemsOpening += ` AND it."itemCategoryId" = ${itemCategoryId}`;
        }
        if(itemId){
            sqlSelectItemsOpening += ` AND it."itemId" = ${itemId}`;
        }

        sqlSelectItemsOpening += ` AND it."date" < ${new Date(fromDate).getTime()}`;
        sqlSelectItemsOpening += ` GROUP BY "itemCategoryId", "itemId", "umId"`;

        if(itemId){
            //  selected item
            andItemId = ` AND i."id" = ${itemId}`;
        }
        else{
            andItemId = '';
        }
        sqlStrItemsOpening = `SELECT i."itemCategoryId", ic.name "itemCategoryName", i.id "itemId", i.name "itemName"
            , i."umId", ums.name "UoM"
            , coalesce(recs.opening, 0) opening, 0 receipt, 0 issue, coalesce(recs.opening, 0) closing FROM items i LEFT JOIN (
            ${sqlSelectItemsOpening}
            ) recs
            ON i.id = recs."itemId"
            LEFT JOIN item_categories ic ON i."itemCategoryId" = ic.id
            LEFT JOIN ums ON i."umId" = ums.id
        `;
        if(itemCategoryId){
            sqlStrItemsOpening += ` WHERE i."itemCategoryId" = ${itemCategoryId} ${andItemId}`;
        }
        sqlStrItemsOpening += ` ORDER BY ic.name, i.name;`;

        [selectedRecs, itemsOpening] = await Promise.all([
            knexReader.raw(sqlStr),
            knexReader.raw(sqlStrItemsOpening)
        ]);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
                openingBalances: itemsOpening.rows,
            },
            message: "Storage Location Ledger!"
        });

    } catch (err) {
        console.log("[controllers][inventories][getStorageLocationLedger] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStorageLocationLedger;

const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getStockLedger = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let {companyId, itemCategoryId, itemId, storageLocationId, fromDate, toDate} = req.body;

        let sqlStr, sqlSelectWith, sqlSelect, sqlFrom, sqlWhere, sqlGroupBy, sqlOrderBy;
        let sqlStrItemsOpening, sqlSelectItemsOpening;

        sqlSelectWith = `WITH ledger AS (
            SELECT id, "itemCategoryId", "itemId", "storageLocationId", "umId", "date", "txnType"
            , case when "txnType" >= 1 and "txnType" <= 50 then quantity else 0 end as credit
            , case when "txnType" >= 51 and "txnType" <= 90 then (quantity * -1) else 0 end as debit
            , row_number() over (order by "itemCategoryId", "itemId", "storageLocationId", date, "txnType") as row
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

        sqlSelectWith += ` AND it."date" >= ${new Date(fromDate).getTime()} AND it."date" <= ${new Date(toDate).getTime()}`;

        sqlSelectWith += `)`;

        sqlSelect = ` SELECT l1."itemCategoryId", l1."itemId", l1."umId", l1."storageLocationId", l1."date", l1."txnType", l1.row, l1.id
        , (coalesce(SUM(L2.credit), 0) - coalesce(SUM(L2.debit), 0))  AS opening
        , l1.credit as credit, l1.debit as debit
        , (coalesce( L1.credit, 0) + coalesce(SUM(L2.credit), 0) - coalesce(SUM(L2.debit), 0)- coalesce((L1.debit), 0)) As closing
        FROM ledger l1
        LEFT JOIN ledger l2
        ON l1."itemCategoryId" = l2."itemCategoryId" and l1."itemId" = l2."itemId" and l1."storageLocationId" = l2."storageLocationId" and l1.row > l2.row
        GROUP BY l1."itemCategoryId", l1."itemId", l1."storageLocationId", l1."umId", l1."date", l1."txnType", l1.row, l1.id, l1.credit, l1.debit
        ORDER BY l1."itemCategoryId", l1."itemId", l1."storageLocationId", l1."umId", l1."date", l1."txnType", l1.row
        `;

        //  Adding outer select to set order by 'Item Category', 'Item Name'
        sqlStr = `SELECT ic.name "itemCategoryName", i.name "itemName", ums.name "UoM", sl.name "storageLocationName", recs.*
            , it."lotNo", s.name "supplierName", c.name "customerName", tt."nameEn" "txnTypeEn", tt."nameTh" "txnTypeTh"
            FROM (
            ${sqlSelectWith}  ${sqlSelect}
            ) recs, item_categories ic, items i, ums, storage_locations sl, txn_types tt, item_txns it
            LEFT OUTER JOIN item_txn_suppliers its ON it."orgId" = its."orgId" AND it.id = its."itemTxnId"
            LEFT OUTER JOIN suppliers s ON its."supplierId" = s.id
            LEFT OUTER JOIN invoices inv ON it."orgId" = inv."orgId" AND it."invoiceId" = inv."id"
            LEFT OUTER JOIN customers c ON inv."customerId" = c.id
            WHERE recs."itemCategoryId" = ic.id AND recs."itemId" = i.id AND recs."umId" = ums.id
            AND recs."storageLocationId" = sl.id AND recs.id = it.id AND tt.id = it."txnType"
            ORDER BY ic.name, i.name, sl.name, recs.row;
        `;

        //  To get items' storage location opening balances
        sqlSelectItemsOpening = `SELECT "itemCategoryId", "itemId", "umId", "storageLocationId", sum(quantity) "opening"
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

        sqlSelectItemsOpening += ` AND it."date" < ${new Date(fromDate).getTime()}`;
        sqlSelectItemsOpening += ` GROUP BY "itemCategoryId", "itemId", "storageLocationId", "umId"`;

        sqlStrItemsOpening = `SELECT i."itemCategoryId", ic.name "itemCategoryName", i.id "itemId", i.name "itemName"
            , recs."storageLocationId", sl.name "storageLocationName", i."umId", ums.name "UoM"
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
            message: "Stock Ledger!"
        });

    } catch (err) {
        console.log("[controllers][inventories][getStockLedger] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getStockLedger;

const knexReader = require('../../db/knex-reader');

const getInvoicedItems = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let { companyId, fromDate, toDate, itemCategoryIds, itemIds, customerIds } = req.body;

        let sqlStr;
        
        sqlStr = `SELECT ii.*, i."invoiceNo", i."invoiceOn", i."customerId", ic."name" "itemCategoryName", i2."name" "itemName", t.percentage "taxPercentage"
        , ums.name "itemUM", ums.abbreviation "itemUMAbbreviation", c."name" "customerName", u2."name" "createdByName"
        FROM invoice_items ii, invoices i, customers c, taxes t, items i2, item_categories ic, ums, users u2
        WHERE i."orgId" = ${orgId}
        `;

        if(companyId){
            sqlStr += ` AND i."companyId" = ${companyId}`;
        }
        if(fromDate){
            sqlStr += ` AND i."invoiceOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlStr += ` AND i."invoiceOn" <= ${new Date(toDate).getTime()}`;
        }

        if(customerIds?.length && customerIds[0] != 0){
            sqlStr += ` AND i."customerId" in (${customerIds})`
        }

        sqlStr += ` AND NOT i."isCancelled" AND i."orgId" = ii."orgId" AND i.id = ii."invoiceId"
        `;

        if(itemCategoryIds?.length && itemCategoryIds[0] != 0){
            sqlStr += ` AND ii."itemCategoryId" in (${itemCategoryIds})`
        }

        if(itemIds?.length && itemIds[0] != 0){
            sqlStr += ` AND ii."itemId" in (${itemIds})`
        }

        sqlStr += ` AND ii."itemCategoryId" = ic.id AND ii."itemId" = i2.id AND ii."umId" = ums.id
        AND i."customerId" = c.id AND i."taxId" = t.id AND i."createdBy" = u2.id
        `;

        sqlStr += ` ORDER BY ic."name", i2."name", i."invoiceOn", c."name"`;

        //console.log('getInvoicedItems: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Invoiced Items!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][invoice][getInvoicedItems] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getInvoicedItems;

/**
 */

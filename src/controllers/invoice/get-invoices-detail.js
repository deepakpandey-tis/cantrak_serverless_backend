const knexReader = require('../../db/knex-reader');

const getInvoicesDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;

        let { companyId, fromDate, toDate } = req.body;

        let sqlStr;
        
        sqlStr = `SELECT i.*, t.percentage "taxPercentage"
        , c."companyName", lic.number "licenseNo", c2.name "customerName", u2."name" "createdByName"
        , (SELECT json_agg(row_to_json(itm.*)) FROM
        (SELECT ii.id, ii.quantity, ii."unitPrice", ii."cost", ii."amount", ii."lotNos"
        , ic.name "itemCategory", i2.name "item", i2."description" "itemDescription", ums.name "itemUM", ums.abbreviation "itemUMAbbreviation"
        FROM invoice_items ii, items i2, item_categories ic, ums
        WHERE i."orgId" = ii."orgId" AND i.id = ii."invoiceId" AND ii."itemCategoryId" = ic.id AND ii."orgId" = i2."orgId" AND ii."itemId" = i2.id
        AND ii."umId" = ums.id) itm
        ) items
        , (SELECT json_agg(row_to_json(chrg.*)) FROM
        (SELECT ic2."rate", ic2."totalHours", ic2."amount", case when ic2."calculationUnit" = 1 then 'By Rate' else 'By Hour' end "calculationUnitName", c3.code "code", c3.description "description"
        FROM invoice_charges ic2, charges c3
        WHERE i."orgId" = ic2."orgId" AND i.id = ic2."invoiceId" AND i."orgId" = c3."orgId" AND ic2."chargeId" = c3.id) chrg
        ) charges
        FROM invoices i, companies c, licenses lic, customers c2, users u2, taxes t
        WHERE i."orgId" = ${orgId} AND NOT i."isCancelled" AND i."taxId" = t.id
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

        sqlStr += ` AND i."companyId" = c.id AND i."licenseId" = lic.id
          AND i."customerId" = c2.id AND i."createdBy" = u2.id
        `;

        sqlStr += ` ORDER BY i."invoiceOn", i."invoiceNo"`;

        //console.log('getInvoicesDetail: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Invoices details!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][invoice][getInvoicesDetail] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getInvoicesDetail;

/**
 */

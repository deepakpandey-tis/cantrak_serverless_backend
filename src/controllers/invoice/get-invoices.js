const knexReader = require('../../db/knex-reader');

const getInvoices = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;

        let { companyId, fromDate, toDate, invoiceType } = req.body;

        let sqlStr;
        
        sqlStr = `SELECT inv.*
        , c."companyName", lic.number "licenseNo", c2.name "customerName", u2."name" "createdByName"
        FROM invoices inv LEFT JOIN licenses lic ON inv."licenseId" = lic.id
        , companies c, customers c2, users u2
        WHERE inv."orgId" = ${orgId}
        `;

        if(companyId){
            sqlStr += ` AND inv."companyId" = ${companyId}`;
        }
        
        // if(invoiceType == 0){
        //     //  All Invoices (both: Not Cancelled and Cancelled)
        // }
        if(invoiceType == 1){
            sqlStr += ` AND NOT inv."isCancelled"`
        }
        else if(invoiceType == 2){
            sqlStr += ` AND inv."isCancelled"`
        }

        if(fromDate){
            sqlStr += ` AND inv."invoiceOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlStr += ` AND inv."invoiceOn" <= ${new Date(toDate).getTime()}`;
        }

        sqlStr += ` AND inv."companyId" = c.id AND inv."customerId" = c2.id AND inv."createdBy" = u2.id
        `;

        sqlStr += ` ORDER BY inv."invoiceOn", inv."invoiceNo"`;

        //console.log('getInvoices: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Invoices!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][invoice][getInvoices] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getInvoices;

/**
 */

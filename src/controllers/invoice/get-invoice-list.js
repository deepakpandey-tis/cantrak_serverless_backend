const knexReader = require('../../db/knex-reader');

const getInvoiceList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, customerId, invoiceNo, fromDate, toDate, dueFromDate, dueToDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `invoiceNo`;
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'desc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT inv.*
        , c."companyName", lic.number "licenseNo", c2.name "customerName"
        , u2."name" "createdByName"
        `;

        sqlFrom = ` FROM invoices inv, companies c, licenses lic, customers c2
        , users u2
        `;

        sqlWhere = ` WHERE inv."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND inv."companyId" = ${companyId}`;
        }
        if(customerId){
            sqlWhere += ` AND inv."customerId" = ${customerId}`;
        }
        if(invoiceNo){
            sqlWhere += ` AND inv."invoiceNo" iLIKE '%${invoiceNo}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND inv."invoiceOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND inv."invoiceOn" <= ${new Date(toDate).getTime()}`;
        }
        if(dueFromDate){
            sqlWhere += ` AND inv."dueDate" >= ${new Date(dueFromDate).getTime()}`;
        }
        if(dueToDate){
            sqlWhere += ` AND inv."dueDate" <= ${new Date(dueToDate).getTime()}`;
        }

        sqlWhere += ` AND inv."companyId" = c.id AND inv."licenseId" = lic.id
          AND inv."customerId" = c2.id AND inv."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY "${sortCol}" ${sortOrder}`;
        //console.log('getInvoiceList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getInvoiceList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Invoice list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][invoice][getInvoiceList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getInvoiceList;

/**
 */

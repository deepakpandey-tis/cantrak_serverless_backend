const knexReader = require('../../../db/knex-reader');

const getLicenseNarList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { licenseId, permitNumber, fromIssuedOn, toIssuedOn, fromExpiredOn, toExpiredOn, supplierId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = '"issuedOn" asc';
            sortOrder = '';
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = '';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT ln.*, s."name" "supplierName", u2."name" "createdByName"
        `;

        sqlFrom = ` FROM license_nars ln, suppliers s, users u2`;

        sqlWhere = ` WHERE ln."licenseId" = ${licenseId} AND ln."supplierId" = s.id AND ln."createdBy" = u2.id`;
        if(permitNumber){
            sqlWhere += ` AND ln."permitNumber" iLIKE '%${permitNumber}%'`;
        }
        if(fromIssuedOn){
            sqlWhere += ` AND ln."issuedOn" >= ${new Date(fromIssuedOn).getTime()}`;
        }
        if(toIssuedOn){
            sqlWhere += ` AND ln."issuedOn" <= ${new Date(toIssuedOn).getTime()}`;
        }
        if(fromExpiredOn){
            sqlWhere += ` AND ln."expiredOn" >= ${new Date(fromExpiredOn).getTime()}`;
        }
        if(toExpiredOn){
            sqlWhere += ` AND ln."expiredOn" <= ${new Date(toExpiredOn).getTime()}`;
        }
        if(supplierId){
            sqlWhere += ` AND ln."supplierId" = ${supplierId}`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getLicenseNarList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLicenseNarList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "License Nars list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][licenses][getLicenseNarList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLicenseNarList;

/**
 */

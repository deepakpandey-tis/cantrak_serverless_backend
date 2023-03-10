const knexReader = require('../../db/knex-reader');

const getLicenseList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, number, assignedPerson, licenseTypeId, fromIssuedOn, toIssuedOn, fromExpiredOn, toExpiredOn, statusId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // console.log('sort: ', payload);
        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = '"createdAt" desc';
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'asc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT l2.*, lt.name "licenseType", c2."companyName", u2."name" "createdByName"
        , (select max("revisionNumber") from licenses l where l."number" = l2."number") "lastRevisionNumber"
        `;

        sqlFrom = ` FROM licenses l2, license_types lt, companies c2, users u2`;

        sqlWhere = ` WHERE l2."orgId" = ${orgId}`;
        sqlWhere += ` AND l2."licenseTypeId" = lt.id AND l2."companyId" = c2.id AND l2."createdBy" = u2.id`;
        if(companyId){
            sqlWhere += ` AND l2."companyId" = ${companyId}`;
        }
        if(licenseTypeId){
            sqlWhere += ` AND l2."licenseTypeId" = ${licenseTypeId}`;
        }
        if(number){
            sqlWhere += ` AND l2."number" iLIKE '%${number}%'`;
        }
        if(assignedPerson){
            sqlWhere += ` AND l2."assignedPerson" iLIKE '%${assignedPerson}%'`;
        }
        if(fromIssuedOn){
            sqlWhere += ` AND l2."issuedOn" >= ${new Date(fromIssuedOn).getTime()}`;
        }
        if(toIssuedOn){
            sqlWhere += ` AND l2."issuedOn" <= ${new Date(toIssuedOn).getTime()}`;
        }
        if(fromExpiredOn){
            sqlWhere += ` AND l2."expiredOn" >= ${new Date(fromExpiredOn).getTime()}`;
        }
        if(toExpiredOn){
            sqlWhere += ` AND l2."expiredOn" <= ${new Date(toExpiredOn).getTime()}`;
        }
        if(statusId){
            if(statusId == 1){
                sqlWhere += ` AND l2."isActive"`;
            }
            else {
                sqlWhere += ` AND NOT l2."isActive"`;
            }
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getLicenseList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLicenseList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Licenses list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][controllers][licenses][getLicenseList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLicenseList;

/**
 */

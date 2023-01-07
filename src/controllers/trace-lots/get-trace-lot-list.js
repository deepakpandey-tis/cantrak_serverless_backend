const knexReader = require('../../db/knex-reader');

const getTraceLotList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, cultivatedBy, strainId, specieId, origin, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"createdAt" DESC, "lotNo" DESC`;
            sortOrder = '';
        }

        // if(!sortOrder || sortOrder === ''){
        //     sortOrder = 'desc';
        // }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT tl.*, s.name "specieName", s2.name "strainName", s2.flavor, s2."topEffect"
        , u."name" "createdByName", ums.name "umName", ums.abbreviation "umAbbreviation"
        `;

        sqlFrom = ` FROM trace_lots tl LEFT JOIN ums ON tl."orgId" = ums."orgId" AND tl."umId" = ums.id, species s, strains s2, users u
        `;

        sqlWhere = ` WHERE tl."orgId" = ${orgId}`;
        sqlWhere += ` AND tl."createdBy" = u.id 
        AND tl."orgId" = s."orgId" AND tl."specieId" = s.id AND tl."orgId" = s2."orgId" AND tl."specieId" = s2."specieId" AND tl."strainId" = s2.id
        `;
        
        if(companyId){
            sqlWhere += ` AND tl."companyId" = ${companyId}`;
        }
        if(lotNo){
            sqlWhere += ` AND tl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(cultivatedBy){
            sqlWhere += ` AND tl."cultivatedBy" iLIKE '%${cultivatedBy}%'`;
        }
        if(strainId){
            sqlWhere += ` AND tl."strainId" = ${strainId}`;
        }
        if(specieId){
            sqlWhere += ` AND tl."specieId" = ${specieId}`;
        }
        if(origin){
            sqlWhere += ` AND tl."origin" iLIKE '%${origin}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND tl."expiryDate" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND tl."expiryDate" <= ${new Date(toDate).getTime()}`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getTraceLotList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getTraceLotList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Packing list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][trace-lots][getTraceLotList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getTraceLotList;

/**
 */

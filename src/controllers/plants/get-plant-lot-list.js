const knexReader = require('../../db/knex-reader');

const getPlantLotList = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, locationId, subLocationId, strainId, fromDate, toDate } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = `"lotNo" desc`;
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
        sqlSelect = `SELECT pl.*
        , s.name "strainName", s2.name "specieName", c."companyName", lic.number "licenseNo"
        , l.name "locationName", sl.name "subLocationName", u2."name" "createdByName"
        `;

        sqlFrom = ` FROM plant_lots pl, companies c, strains s, species s2, licenses lic
        , locations l, sub_locations sl, users u2
        `;

        sqlWhere = ` WHERE pl."orgId" = ${orgId}`;
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }
        if(strainId){
            sqlWhere += ` AND pl."strainId" = ${strainId}`;
        }
        if(locationId){
            sqlWhere += ` AND pl."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlWhere += ` AND pl."subLocationId" = ${subLocationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND pl."plantedOn" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND pl."plantedOn" <= ${new Date(toDate).getTime()}`;
        }

        sqlWhere += ` AND pl."strainId" = s.id AND pl."specieId" = s2.id AND pl."companyId" = c.id AND pl."licenseId" = lic.id
          AND pl."locationId" = l.id  AND pl."subLocationId" = sl.id AND pl."createdBy" = u2.id
        `;

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getPlantLotList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getPlantLotList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Plant lot list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotList] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPlantLotList;

/**
 */

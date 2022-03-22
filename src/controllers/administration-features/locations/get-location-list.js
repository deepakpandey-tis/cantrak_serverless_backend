const knexReader = require('../../../db/knex-reader');

const getLocationList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { name, companyId } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = 'name';
        }

        if(!sortOrder || sortOrder === ''){
            sortOrder = 'asc';
        }

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }
        
        // Using CTE (Common Table Expressions 'SELECT in WITH' for pageSize retrieval)
        sqlSelect = `SELECT l.*, c."companyName"
        , u2."name" "createdByName"
        , false "expanded", (SELECT json_agg(row_to_json(sl.*)) "subLocations"
        FROM (
        SELECT * FROM sub_locations sl WHERE sl."locationId" = l.id ORDER BY sl.name ) sl
        )
        `;

        sqlFrom = ` FROM locations l, companies c, users u2`;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = c.id`;
        sqlWhere += ` AND l."createdBy" = u2.id`;
        if(companyId){
            sqlWhere += ` AND l."companyId" = ${companyId}`;
        }

        if(name){
            sqlWhere += ` AND (l."name" iLIKE '%${name}%' OR l."description" iLIKE '%${name}%')`;
        }

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;
        //console.log('getLocationList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLocationList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Locations list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][locations][getLocationList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLocationList;

/**
 */

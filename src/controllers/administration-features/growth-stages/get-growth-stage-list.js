const knexReader = require('../../../db/knex-reader');

const getGrowthStageList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { specieId, name } = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        // Setting default values, if not passed
        if(!sortCol || sortCol === ''){
            sortCol = 'listOrder';
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
        sqlSelect = `SELECT gs.*, s.name "specieName", u2."name" "Created By"
        `;

        sqlFrom = ` FROM growth_stages gs, users u2, species s`;

        sqlWhere = ` WHERE gs."orgId" = ${orgId}`;
        sqlWhere += ` AND gs."createdBy" = u2.id AND gs."specieId" = s.id`;
        if(specieId){
            sqlWhere += ` AND s.id = ${specieId}`;
        }
        if(name){
            sqlWhere += ` AND (gs."name_en" iLIKE '%${name}%' OR gs."name_th" iLIKE '%${name}%')`;
        }

        sqlOrderBy = ` ORDER BY "specieName" asc, "listOrder" asc`;
        //sqlOrderBy = ` ORDER BY "${sortCol}" ${sortOrder}`;
        //console.log('getGrowthStageList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getGrowthStageList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Growth Stages list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][administration-features][growth-stages][getGrowthStageList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getGrowthStageList;

/**
 */

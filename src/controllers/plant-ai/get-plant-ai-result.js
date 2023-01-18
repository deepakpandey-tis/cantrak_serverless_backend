const knexReader = require('../../db/knex-reader');

const getPlantAiResult = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, plantLotId } = req.body;

        let sqlStr, sqlOrderBy;

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

        sqlOrderBy = ` ORDER BY ${sortCol} ${sortOrder}`;

        sqlStr  = `WITH Main_CTE AS (
        SELECT gt.*, pl."lotNo", pl.name "plantLotName", p."plantSerial" FROM growdoc_txns gt, plant_lots pl, plants p
        WHERE gt."orgId" = ${orgId} AND gt."companyId" = ${companyId} AND gt."plantLotId" = pl.id AND gt."plantId" = p.id`;
        sqlStr += `), Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        console.log('getPlantAiResult: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Plant AI list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plant-ai][getPlantAiResult] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPlantAiResult;

/**
 */

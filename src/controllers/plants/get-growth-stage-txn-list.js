const knexReader = require('../../db/knex-reader');

const getGrowthStageTxnList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let sortCol = payload.sortBy;
        let sortOrder = payload.orderBy;

        let reqData = req.query;
        let pageSize = reqData.per_page || 10;
        let pageNumber = reqData.current_page || 1;

        let { companyId, lotNo, locationId, strainId, fromDate, toDate, trackingNumber, fromGrowthStageId, toGrowthStageId} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }

        sqlSelect = `SELECT pgst.*, pl."lotNo", l.name "locationName", gs.name "fromGrowthStageName"
        , gs2.name "toGrowthStageName", s."name" "strainName", s2."name" "specieName", c."companyName" 
        `;

        sqlFrom = ` FROM plant_growth_stage_txns pgst, plant_lots pl, growth_stages gs, growth_stages gs2, locations l, strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE pgst."orgId" = ${orgId}`;
        sqlWhere += ` AND pgst."plantLotId" = pl.id AND pgst."fromGrowthStageId" = gs.id AND pgst."toGrowthStageId" = gs2.id`;
        sqlWhere += ` AND pgst."locationId" = l.id AND pl."strainId" = s.id AND pl."specieId" = s2.id and pl."companyId" = c.id `;
        if(trackingNumber){
            sqlWhere += ` AND pgst."id" = ${trackingNumber}`;
        }
        if(companyId){
            sqlWhere += ` AND pl."companyId" = ${companyId}`;
        }
        if(strainId){
            sqlWhere += ` AND pl."strainId" = ${strainId}`;
        }
        if(locationId){
            sqlWhere += ` AND pgst."locationId" = ${locationId}`;
        }
        if(lotNo){
            sqlWhere += ` AND pl."lotNo" iLIKE '%${lotNo}%'`;
        }
        if(fromDate){
            sqlWhere += ` AND pgst."date" >= ${new Date(fromDate).getTime()}`;
        }
        if(toDate){
            sqlWhere += ` AND pgst."date" <= ${new Date(toDate).getTime()}`;
        }
        if(fromGrowthStageId){
            sqlWhere += ` AND pgst."fromGrowthStageId" = ${fromGrowthStageId}`;
        }
        if(toGrowthStageId){
            sqlWhere += ` AND pgst."toGrowthStageId" = ${toGrowthStageId}`;
        }

        sqlOrderBy = ` ORDER BY id desc`;
        //console.log('getGrowthStageTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getGrowthStageTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Growth Stage Txn list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getGrowthStageTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getGrowthStageTxnList;

/**
 */
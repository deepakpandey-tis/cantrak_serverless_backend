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

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        if(pageNumber < 1){
            pageNumber = 1;
        }

        if(pageSize < 0){
            pageSize = 10;
        }

        sqlSelect = `SELECT pt.*, pl."name", pl.description, pg.description "plantaionGroup", gs.name_en "fromGrowthStage_en", gs.name_th "fromGrowthStage_th"
        , gs2.name_en "toGrowthStage_en", gs2.name_th "toGrowthStage_th", s."name" "strainName", s2."name" "specieName", c."companyName" 
        `;

        sqlFrom = ` FROM plant_txns pt, plant_lots pl, growth_stages gs, growth_stages gs2, plantation_groups pg, strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE pt."fromGrowthStageId" = gs.id AND pt."toGrowthStageId" = gs2.id`;
        sqlWhere += ` AND pt."plantationGroupId" = pg.id AND pl.id = pt."plantLotId" AND s.id = pl."strainId" AND s2.id = pl."specieId" and c.id = pl."companyId" `;

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

const knexReader = require('../../db/knex-reader');

const getLocationTxnList = async (req, res) => {
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

        sqlSelect = `SELECT pt.*, pl."name", pl.description, p.name "fromPlantation", p2.name "toPlantation", pp.description "fromPlantationPhase", pp2.description "toPlantationPhase"
        , pg.description "fromPlantationGroup", pg2.description "toPlantationGroup"
        , s."name" "strainName", s2."name" "specieName", c."companyName", gs."name_en" "growthStage_en", gs."name_th" "growthStage_th"
        `;

        sqlFrom = ` FROM plant_location_txns pt, plant_lots pl, plantations p, plantations p2, plantation_phases pp, plantation_phases pp2
        , plantation_groups pg, plantation_groups pg2, growth_stages gs
        , strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE pt."fromPlantationId" = p.id AND pt."toPlantationId" = p2.id AND pt."fromPlantationPhaseId" = pp.id AND pt."toPlantationPhaseId" = pp2.id 
        AND pt."fromPlantationGroupId" = pg.id AND pt."toPlantationGroupId" = pg2.id`;
        sqlWhere += ` AND pl.id = pt."plantLotId" AND s.id = pl."strainId" AND s2.id = pl."specieId" and c.id = pl."companyId" `;
        sqlWhere += ` AND pt."growthStageId" = gs.id`;

        sqlOrderBy = ` ORDER BY id desc`;
        //console.log('getLocationTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getLocationTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Location Txn list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getLocationTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getLocationTxnList;

/**
 */

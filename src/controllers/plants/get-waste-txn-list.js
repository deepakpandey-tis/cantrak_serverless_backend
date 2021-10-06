const knexReader = require('../../db/knex-reader');

const getWasteTxnList = async (req, res) => {
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

        sqlSelect = `SELECT pwt.*, pl."name", pl.description, p.name "plantation", pp.description "plantationPhase", pg.description "plantationGroup"
        , s."name" "strainName", s2."name" "specieName", c."companyName", gs."name_en" "growthStage_en", gs."name_th" "growthStage_th"
        `;

        sqlFrom = ` FROM plant_waste_txns pwt, plant_lots pl, plantations p, plantation_phases pp, plantation_groups pg
        , strains s, species s2, companies c, growth_stages gs
        `;

        sqlWhere = ` WHERE pwt."plantationId" = p.id AND pwt."plantationPhaseId" = pp.id AND pwt."plantationGroupId" = pg.id`;
        sqlWhere += ` AND pl.id = pwt."plantLotId" AND s.id = pl."strainId" AND s2.id = pl."specieId" and c.id = pl."companyId" `;
        sqlWhere += ` AND pwt."growthStageId" = gs.id`;

        sqlOrderBy = ` ORDER BY id desc`;
        //console.log('getWasteTxnList sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr  = `WITH Main_CTE AS (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + `)`;
        sqlStr += `, Count_CTE AS (SELECT COUNT(*) AS "total" FROM Main_CTE)`;     // To get the total number of records
        sqlStr += ` SELECT * FROM Main_CTE, Count_CTE`;
        sqlStr += sqlOrderBy;
        sqlStr += ` OFFSET ((${pageNumber} - 1) * ${pageSize}) ROWS`
        sqlStr += ` FETCH NEXT ${pageSize} ROWS ONLY;`;

        //console.log('getWasteTxnList: ', sqlStr);
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                list: selectedRecs.rows,
                message: "Waste Txn list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getWasteTxnList] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getWasteTxnList;

/**
 */

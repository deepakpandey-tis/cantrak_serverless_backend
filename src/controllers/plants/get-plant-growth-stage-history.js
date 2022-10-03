const knexReader = require('../../db/knex-reader');

const getPlantGrowthStageHistory = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        
        sqlStr = `SELECT pgh.* 
        , lead(pgh."startDate") over (partition by pgh."plantSerial" order by pgh."startDate", pgh."plantLocationId") "endDate"
        FROM
        (
            SELECT pl.id "plantLotId", pl."lotNo", p.id "plantId", p."plantSerial"
            , gs."name" "growthStage", pl2.id "plantLocationId" , pl2."locationId" , pl2."subLocationId", l.name "locationName" , sl."name" "subLocationName"
            , pgs."startDate" "startDate" --, to_timestamp(pgs."startDate"/1000)::date "startDate"
            FROM plant_lots pl, plants p, locations l, sub_locations sl, growth_stages gs, plant_locations pl2, plant_growth_stages pgs
            left join plant_growth_stage_txns pgst on pgst.id = pgs."plantGrowthStageTxnId"
            WHERE p.id = ${payload.id} AND p."orgId" = ${orgId} AND pl.id = p."plantLotId"
            AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id and pgs2."growthStageId" = pgs."growthStageId" order by id desc)
            and pgs."growthStageId" = gs.id
            and p."orgId" = pl2."orgId" and p.id = pl2."plantId"
            and ((pgs."plantGrowthStageTxnId" is not null and pgst."locationId" = l.id and pgst."locationId" = sl."locationId" and pgst."subLocationId" = sl.id) or (pl2."locationId" = l.id and pl2."locationId" = sl."locationId" and pl2."subLocationId" = sl.id))
        ) pgh
        `;

        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant growth stage history!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantGrowthStageHistory] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantGrowthStageHistory;

/**
 */

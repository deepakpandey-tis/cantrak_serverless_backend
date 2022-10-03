const knexReader = require('../../db/knex-reader');

const getPlantLocationHistory = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        
        sqlStr = `SELECT pls.*
        , lead(pls."startDate") over (partition by pls."plantSerial" order by pls."startDate", pls."plantGrowthStageId") "endDate"
        FROM
        (
            SELECT pl.id "plantLotId", pl."lotNo", p.id "plantId", p."plantSerial"
            , pl2."locationId" , pl2."subLocationId", l.name "locationName" , sl."name" "subLocationName", gs."name" "growthStage"
            , pgs.id "plantGrowthStageId", pl2."startDate" "startDate" --, to_timestamp(pl2."startDate"/1000)::date "startDate"
            FROM plant_lots pl, plants p, locations l, sub_locations sl, plant_growth_stages pgs, growth_stages gs, plant_locations pl2
            left join plant_location_txns plt on plt.id = pl2."plantLocationTxnId"
            WHERE p.id = ${payload.id} AND p."orgId" = ${orgId} AND pl.id = p."plantLotId"
            AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc)
            AND pl2."locationId" = l.id AND pl2."subLocationId" = sl.id AND pl2."locationId" = sl."locationId"
            and p."orgId" = pgs."orgId" and p.id = pgs."plantId"
            and ((pl2."plantLocationTxnId" is not null and plt."growthStageId" = gs.id) or pgs."growthStageId" = gs.id)
        ) pls
        `;

        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant location history!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLocationHistory] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantLocationHistory;

/**
 */

const knexReader = require('../../db/knex-reader');

const getPlantLotCurrentGrowthStages = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let { companyId, id, locationId, subLocationId} = req.body;

        let sqlStr, sqlSelectPlantCurrentLocations, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelectPlantCurrentLocations = `with plant_current_locations as
        (
        select pl.id, p.id "plantId", pl2."locationId", pl2."subLocationId" from plant_lots pl, plants p, plant_locations pl2
        where pl.id = ${id} and pl."orgId" = ${orgId} and pl."companyId" = ${companyId}
        and pl2."locationId" = ${locationId} and pl2."subLocationId" = ${subLocationId}
        and pl.id = p."plantLotId" and p."isActive" and not p."isWaste" and p.id = pl2."plantId"
        and pl2.id in (select id from plant_locations pl3 where pl3."plantId" = p.id order by pl3.id desc limit 1)
        order by p."plantSerial"
        )
        `;

        sqlSelect = ` select distinct gs.id "growthStageId", gs."name"`;
        sqlFrom = ` from plant_current_locations pcl, plant_growth_stages pgs, growth_stages gs`;
        sqlWhere = ` where pgs."plantId" = pcl."plantId" and pgs."growthStageId" = gs.id
        AND pgs.id in (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = pcl."plantId" ORDER BY pgs2.id desc limit 1)
        `;
        sqlOrderBy = `ORDER BY gs."name"`;

        sqlStr = sqlSelectPlantCurrentLocations + sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
/*         sqlSelect = `SELECT DISTINCT pgs."growthStageId", gs."name"`;
        sqlFrom = ` FROM plant_lots pl , plants p , plant_locations pl2, plant_growth_stages pgs, growth_stages gs`;
        sqlWhere = ` WHERE pl.id = ${id} AND pl."orgId" = ${orgId} AND pl."companyId" = ${companyId}
        AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."plantId" = p.id ORDER BY pl3.id desc limit 1)
        AND pgs.id in (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id ORDER BY pgs2.id desc limit 1)
        AND pl2."locationId" = ${locationId} AND pl2."subLocationId" = ${subLocationId}
        AND pgs."growthStageId" = gs.id
        `;
        sqlOrderBy = `ORDER BY gs."name"`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
 */

        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant Lot Current Growth Stages!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotCurrentGrowthStages] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantLotCurrentGrowthStages;

/**
 */

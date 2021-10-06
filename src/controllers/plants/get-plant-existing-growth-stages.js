const knexReader = require('../../db/knex-reader');

const getPlantExistingGrowthStages = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let { companyId, specieId, plantLotId, plantationId, plantationPhaseId, plantationGroupId} = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, sqlPlantLocation;
        
        sqlSelect = `SELECT DISTINCT gs."listOrder", gs.id, gs.name_en "growthStage_en", gs.name_th "growthStage_th"`;
        sqlFrom = ` FROM plants p2, plant_lots plt, plant_locations pl, plant_growth_stages pgs, growth_stages gs`;
        sqlWhere = ` WHERE p2."orgId" = ${orgId} and p2."plantLotId" = plt.id`;
        if(specieId && specieId != ''){
            sqlWhere += ` AND p2."specieId" = ${specieId}`;
        }
        if(plantLotId && plantLotId != ''){
            sqlWhere += ` AND p2."plantLotId" = ${plantLotId}`;
        }

        sqlPlantLocation = `(SELECT id FROM plant_locations pl2 WHERE pl2."plantId" = p2.id`;
        if(companyId && companyId != ''){
            sqlPlantLocation += ` AND pl2."companyId" = ${companyId}`;
        }

        if(plantationId && plantationId != ''){
            sqlPlantLocation += ` AND pl2."plantationId" = ${plantationId}`;
        }

        if(plantationPhaseId && plantationPhaseId != ''){
            sqlPlantLocation += ` AND pl2."plantationPhaseId" = ${plantationPhaseId}`;
        }

        if(plantationGroupId && plantationGroupId != ''){
            sqlPlantLocation += ` AND pl2."plantationGroupId" = ${plantationGroupId}`;
        }
        sqlPlantLocation += `  ORDER BY id DESC limit 1)`;

        sqlWhere += ` AND p2.id = pl."plantId" AND pl.id = ${sqlPlantLocation}`;
        sqlWhere += ` AND p2.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."plantId" = p2.id order by id desc limit 1)`;
        sqlWhere += ` AND pgs."growthStageId" = gs.id`;

        sqlOrderBy = ` ORDER BY gs."listOrder" ASC`;
        //console.log('getPlantExistingGrowthStages sql: ', sqlSelect + sqlFrom + sqlWhere + sqlOrderBy);

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;

        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant Existing Growth Stages!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantExistingGrowthStages] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantExistingGrowthStages;

/**
 */

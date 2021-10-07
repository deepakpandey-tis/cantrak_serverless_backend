const knexReader = require('../../db/knex-reader');

const getPlantLotGroups = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;
        
        sqlSelect = `SELECT DISTINCT plt.name, plt.description, pg.id "plantationGroupId", pg.description "plantationGroup", pp.id "plantationPhaseId", pp.description "plantationPhase", p2.id "plantationId", p2."name" "plantation"
        `;

        sqlFrom = ` FROM plant_lots plt, plants p, plant_locations pl, plantations p2, plantation_phases pp, plantation_groups pg
        `;

        sqlWhere = ` WHERE plt."orgId" = ${orgId} AND plt."companyId" = ${payload.companyId} AND plt.id = ${payload.id}`;
        sqlWhere += ` AND plt.id = p."plantLotId" AND p.id = pl."plantId"`;
        sqlWhere += ` AND pl.id = (SELECT id FROM plant_locations pl2 WHERE pl2."plantId" = p.id ORDER BY id DESC limit 1)`;
        sqlWhere += ` AND pl."plantationId" = p2.id AND pl."plantationPhaseId" = pp.id AND pl."plantationGroupId" = pg.id`;

        sqlOrderBy = ` ORDER BY pg.description asc`;
        //console.log('getPlantLotGroups sql: ', sqlSelect + sqlFrom + sqlWhere);

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);
        //console.log('selectedRecs: ', selectedRecs);

          const result = {
            data: {
                records: selectedRecs.rows,
                message: "Plant Lot Groups list!"
            }
        }
        //console.log(result.data)

        return res.status(200).json({
            data: result.data
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLotGroups] :  Error", err);
        return res.status(500).json({
          errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
    });
    
    }

}

module.exports = getPlantLotGroups;

/**
 */

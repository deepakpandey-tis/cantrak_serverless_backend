const knexReader = require('../../../db/knex-reader');

const getSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlStr = `SELECT DISTINCT sl."locationId", sl.id, sl.name
        FROM plant_lots pl, plants p, plant_locations pl2, sub_locations sl
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId" 
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND pl2."locationId" = ${payload.locationId} AND pl2."subLocationId" = sl.id AND pl2."locationId" = sl."locationId"
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        ORDER BY sl.name asc
        `;

/* showing location's sub locations that have active (!isFinalHarvest) plant lots
        sqlSelect = `SELECT sl.*`;

        sqlFrom = ` FROM sub_locations sl`;

        sqlWhere = ` WHERE sl."orgId" = ${orgId} AND sl."companyId" = ${payload.companyId} AND sl."locationId" = ${payload.locationId} AND sl."isActive"`;

        sqlOrderBy = ` ORDER BY sl.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
 */
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Sub Locations!"
        });
    } catch (err) {
        console.log("[controllers][harvest][masters][getSubLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSubLocations;

/**
 */

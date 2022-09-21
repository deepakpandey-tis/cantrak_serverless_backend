const knexReader = require('../../../db/knex-reader');

const getLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlStr = `SELECT DISTINCT l.id, l.name
        FROM plant_lots pl, plants p, plant_locations pl2, locations l
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND NOT pl."isFinalHarvest"
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId" 
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        AND pl2."locationId" = l.id
        ORDER BY l.name asc
        `;

/* showing locations that have active (!isFinalHarvest) plant lots
        sqlSelect = `SELECT l.*`;

        sqlFrom = ` FROM locations l`;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."isActive"`;
        sqlWhere += ` AND l."companyId" = ${payload.companyId}`;
        sqlWhere += ` AND l."id" IN (${req.GROWINGLOCATION})`;

        sqlOrderBy = ` ORDER BY l.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
 */        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Locations!"
        });
    } catch (err) {
        console.log("[controllers][harvest][masters][getLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLocations;

/**
 */

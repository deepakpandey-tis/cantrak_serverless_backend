const knexReader = require('../../../db/knex-reader');

const getLocationsSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT l.*,
        (
            SELECT json_agg(row_to_json(sl.*)) "subLocations" FROM
            (SELECT * FROM sub_locations sl WHERE sl."isActive" AND sl."locationId" = l.id ORDER BY sl."name") sl 
        )
        `;

        sqlFrom = ` FROM locations l`;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = ${payload.companyId} AND l."isActive" AND l."id" IN (${req.GROWINGLOCATION})`;

        sqlOrderBy = ` ORDER BY l.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Locations Sub Locations!"
        });
    } catch (err) {
        console.log("[controllers][work-plans][masters][getLocationsSubLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLocationsSubLocations;

/**
 */

const knexReader = require('../../../db/knex-reader');

const getSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT sl.*`;

        sqlFrom = ` FROM sub_locations sl`;

        sqlWhere = ` WHERE sl."orgId" = ${orgId} AND sl."locationId" = ${payload.locationId} AND sl."isActive"`;

        sqlOrderBy = ` ORDER BY sl.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Sub Locations!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][sub-locations][getSubLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSubLocations;

/**
 */

const knexReader = require('../../../db/knex-reader');

const getSubLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT sl.*, l.name "locationName"`;

        sqlFrom = ` FROM sub_locations sl, locations l`;

        sqlWhere = ` WHERE sl."orgId" = ${orgId} AND sl."companyId" = ${payload.companyId} AND sl."isActive" AND sl."locationId" = l.id`;
        if(payload.locationId){
            sqlWhere += ` AND sl."locationId" = ${payload.locationId}`;
        }

        sqlOrderBy = ` ORDER BY l.name asc, sl.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Sub Locations!"
        });
    } catch (err) {
        console.log("[controllers][crop-cycle-plan][masters][getSubLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSubLocations;

/**
 */

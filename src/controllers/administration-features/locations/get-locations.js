const knexReader = require('../../../db/knex-reader');

const getLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT l.*`;

        sqlFrom = ` FROM locations l`;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."isActive"`;

        if(payload?.companyId){
            sqlWhere += `AND l."companyId" = ${payload.companyId}`;
        }

        sqlOrderBy = ` ORDER BY l.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Locations!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][locations][getLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLocations;

/**
 */

const knexReader = require('../../../db/knex-reader');

const getStorageLocations = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT sl.*`;

        sqlFrom = ` FROM storage_locations sl`;

        sqlWhere = ` WHERE sl."orgId" = ${orgId} AND sl."companyId" = ${payload.companyId} AND sl."isActive"`;

        sqlOrderBy = ` ORDER BY sl.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Storage Locations!"
        });
    } catch (err) {
        console.log("[controllers][invocie][masters][getStorageLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getStorageLocations;

/**
 */

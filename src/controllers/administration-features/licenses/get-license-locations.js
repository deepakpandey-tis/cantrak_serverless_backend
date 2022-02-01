const knexReader = require('../../../db/knex-reader');

const getLicenseLocations = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('license_locations')
            .select("id", "name", "description", "latitude", "longitude")
            .where({ isActive: true, orgId: orgId })
            .orderBy([{ column: 'name', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "License Locations!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getLicenseLocations] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseLocations;

/**
 */

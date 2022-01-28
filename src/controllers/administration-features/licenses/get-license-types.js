const knexReader = require('../../../db/knex-reader');

const getLicenseTypes = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('license_types')
            .select("id", "code", "name")
            .where({ isActive: true })
            .orderBy([{ column: 'listOrder', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "License Types!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getLicenseTypes] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseTypes;

/**
 */

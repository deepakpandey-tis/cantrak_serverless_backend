const knexReader = require('../../../db/knex-reader');

const getLicenseCategories = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('license_categories')
            .select("id", "name")
            .where({ isActive: true })
            .orderBy([{ column: 'name', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "License Categories!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getLicenseCategories] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenseCategories;

/**
 */

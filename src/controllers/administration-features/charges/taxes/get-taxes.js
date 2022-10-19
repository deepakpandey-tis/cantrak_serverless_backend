const knexReader = require('../../../../db/knex-reader');

const getTaxes = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('taxes')
            .select("id", "code", "description", "default", "percentage")
            .where({ isActive: true, orgId: orgId })
            .orderBy('percentage', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Taxes!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][charges][getTaxes] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getTaxes;

/**
 */

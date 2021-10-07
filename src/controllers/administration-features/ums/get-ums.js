const knexReader = require('../../../db/knex-reader');

const getUMs = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('ums')
            .select("id", "name", "abbreviation")
            .where({ isActive: true })
            .orderBy('name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "UMs!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getUMs] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getUMs;

/**
 */

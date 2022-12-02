const knexReader = require('../../../db/knex-reader');

const getCountires = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('countries')
            .select("id", "code", "name")
            .where({ isActive: true })
            .orderBy('countries.name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Countries!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][customers][getCountires] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getCountires;

/**
 */

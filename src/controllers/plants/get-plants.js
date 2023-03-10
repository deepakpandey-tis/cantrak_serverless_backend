const knexReader = require('../../db/knex-reader');

const getPlants = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('plants')
            .select("id", "name")
            .where({ isActive: true, orgId: orgId })
            .orderBy('plants.name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Plants List!"
        });
    } catch (err) {
        console.log("[controllers][plants][getPlants] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPlants;

/**
 */

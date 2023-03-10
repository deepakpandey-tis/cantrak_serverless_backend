const knexReader = require('../../../db/knex-reader');

const getSpecies = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader("species")
            .select("id", "name")
            .where({ isActive: true, orgId: orgId })
            .orderBy('species.name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Species List!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][getSpecies] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSpecies;

/**
 */

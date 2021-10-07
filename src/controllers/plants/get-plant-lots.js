const knexReader = require('../../db/knex-reader');

const getPlantLots = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        let payload = req.body;

        result = await knexReader('plant_lots')
            .select("id", "name", "description", "specieId", "strainId")
            .where({ isActive: true, orgId: orgId, companyId: payload.companyId })
            .where(qb => {
                if (payload.strainId) {
                    qb.where('strainId', payload.strainId)
                }
            })
            .orderBy('plant_lots.name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Plant Lots List!"
        });
    } catch (err) {
        console.log("[controllers][plants][getPlantLots] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getPlantLots;

/**
 */

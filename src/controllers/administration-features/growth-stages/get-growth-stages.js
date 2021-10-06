const knexReader = require('../../../db/knex-reader');

const getGrowthStages = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;
        let { itemId } = req.body;

        result = await knexReader('growth_stages')
            .select("id", "name", "itemId")
            .where({ isActive: true, orgId: orgId, itemId: itemId })
            .orderBy([{ column: 'listOrder', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Growth Stages List!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][growth-stages][getGrowthStages] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getGrowthStages;

/**
 */

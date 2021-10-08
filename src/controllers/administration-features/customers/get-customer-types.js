const knexReader = require('../../../db/knex-reader');

const getCustomerTypes = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('customer_types')
            .select("id", "name")
            .where({ isActive: true })
            .orderBy([{ column: 'name', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Customer Types!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][customers][getCustomerTypes] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getCustomerTypes;

/**
 */

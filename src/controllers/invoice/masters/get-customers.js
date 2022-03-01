const knexReader = require('../../../db/knex-reader');

const getCustomers = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('customers')
            .select("*")
            .where({ isActive: true, orgId: orgId })
            .orderBy('customers.name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Customers List!"
        });
    } catch (err) {
        console.log("[controllers][invoice][masters][getCustomers] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getCustomers;

/**
 */

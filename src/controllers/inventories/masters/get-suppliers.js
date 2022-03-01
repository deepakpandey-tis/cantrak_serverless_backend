const knexReader = require('../../../db/knex-reader');

const getSuppliers = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('suppliers')
            .select("id", "name")
            .where({ isActive: true, orgId: orgId })
            .orderBy('suppliers.name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Suppliers List!"
        });
    } catch (err) {
        console.log("[controllers][inventories][masters][getSuppliers] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getSuppliers;

/**
 */

const knexReader = require('../../../db/knex-reader');
const { ItemCategory, TxnTypes, SystemStores } = require('../../../helpers/txn-types');

const getItemCategories = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('item_categories')
            .select("id", "name")
            .where({ isActive: true })
            .whereNotIn('id', [ItemCategory.WasteMaterial, ItemCategory.PackingLoss])
            .orderBy([{ column: 'name', order: 'asc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Item Categories!"
        });
    } catch (err) {
        console.log("[controllers][harvest][masters][getItemCategories] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getItemCategories;

/**
 */

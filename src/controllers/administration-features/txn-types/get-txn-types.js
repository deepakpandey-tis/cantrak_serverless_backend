const knexReader = require('../../../db/knex-reader');

const getTxnTypes = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('txn_types')
            .select("id", "nameEn", "nameTh")
            .where({ isActive: true })
            .orderBy('id', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Txn Types!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][txn-types][getTxnTypes] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getTxnTypes;

/**
 */

const knexReader = require('../../../db/knex-reader');

const getLicenses = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('licenses')
            .select("id", "number", "primaryHolder", "subHolder")
            .where({ isActive: true, orgId: orgId })
            .orderBy([{ column: 'primaryHolder', order: 'asc' }, { column: 'subHolder', order: 'asc' }, { column: 'number', order: 'desc' }])

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Licenses!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][licenses][getLicenses] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLicenses;

/**
 */

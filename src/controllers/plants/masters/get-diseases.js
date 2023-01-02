const knexReader = require('../../../db/knex-reader');

const getDiseases = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('diseases')
            .select("id", "name")
            .where({ isActive: true, orgId: orgId })
            .orderBy('name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Diseases!"
        });
    } catch (err) {
        console.log("[controllers][plants][masters][getDiseases] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getDiseases;

/**
 */

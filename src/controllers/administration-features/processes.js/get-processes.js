const knexReader = require('../../../db/knex-reader');

const getProcesses = async (req, res) => {
    try {
        let result;
        let orgId = req.me.orgId;

        result = await knexReader('processes')
            .select("id", "name", "description")
            .where({ isActive: true })
            .orderBy('name', 'asc');

        return res.status(200).json({
            data: {
                records: result
            },
            message: "Processes!"
        });
    } catch (err) {
        console.log("[controllers][administrationFeatures][processes][getProcesses] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getProcesses;

/**
 */

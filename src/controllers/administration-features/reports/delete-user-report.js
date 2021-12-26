const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const deleteUserReport = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][reports][deleteUserReport]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `DELETE FROM report_master WHERE id = ${payload.id}
        `;

        var selectedRecs = await knex.raw(sqlStr);
        console.log('delete user report: ', selectedRecs);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows
            },
            message: 'User report deleted successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][reports][deleteUserReport] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteUserReport;

/**
 */

const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getCancelInvoiceRemark = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `SELECT rm.*
        FROM remarks_master rm
        WHERE rm."orgId" = ${orgId} AND rm."entityType" = 'invoice_cancelled' AND rm."entityId" = ${payload.id}
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Cancelled invoice remark!"
        });

    } catch (err) {
        console.log("[controllers][invoice][getCancelInvoiceRemark] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getCancelInvoiceRemark;

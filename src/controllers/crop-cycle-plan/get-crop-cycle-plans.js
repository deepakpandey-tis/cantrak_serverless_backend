const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getCropCyclePlans = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `SELECT ccp.*`;
        sqlStr += ` FROM crop_cycle_plans ccp`;
        sqlStr += ` WHERE ccp."orgId" = ${orgId} AND ccp."companyId" = ${payload.companyId}`;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Crop cycle plans!"
        });

    } catch (err) {
        console.log("[controllers][crop-cycle-plan][getCropCyclePlans] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getCropCyclePlans;

const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getCropCyclePlan = async (req, res) => {
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

        sqlStr = `SELECT ccp.*`;
        sqlStr += `, (SELECT json_agg(row_to_json(ccpd1.*)) "cropCyclePlanDetail"`;
        sqlStr += ` FROM (`;
        sqlStr += ` SELECT ccpd.*, pl."plantsCount", pl."plantedOn"`;
        sqlStr += `, (SELECT json_agg(row_to_json(ccpdgs1.*)) "cropCyclePlanDetailGS" FROM (SELECT ccpdgs.* FROM crop_cycle_plan_detail_gs ccpdGS WHERE ccpdGS."cropCyclePlanDetailId" = ccpd."id" ORDER BY ccpdGS."listOrder") "ccpdgs1")`;
        sqlStr += ` FROM crop_cycle_plan_detail ccpd LEFT JOIN plant_lots pl ON ccpd."plantLotId" = pl."id" WHERE ccpd."cropCyclePlanId" = ccp.id ORDER BY ccpd.id`;
        sqlStr += `) ccpd1)`;
        sqlStr += ` FROM crop_cycle_plans ccp`;
        sqlStr += ` WHERE ccp."id" = ${payload.id} AND ccp."orgId" = ${orgId}`;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Crop cycle plan detail!"
        });

    } catch (err) {
        console.log("[controllers][crop-cycle-plan][getCropCyclePlan] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getCropCyclePlan;

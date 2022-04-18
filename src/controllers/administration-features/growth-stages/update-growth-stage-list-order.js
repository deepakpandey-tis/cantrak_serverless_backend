const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const updateGrowthStageListOrder = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;
        let insertedRecord = [];

        const schema = Joi.object().keys({
            growthStages: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][growth-stages]updateGrowthStageListOrder: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        let currentTime = new Date().getTime();

        sqlStr = `UPDATE growth_stages SET "listOrder" = new_gs."newListOrder"
        FROM (
            SELECT gs.*, row_number() over() as "newListOrder"
            FROM json_to_recordset('${payload.growthStages}')  as gs("id" bigint, "orgId" bigint, "specieId" bigint)
        ) new_gs
        WHERE growth_stages.id = new_gs.id and growth_stages."orgId" = new_gs."orgId" and growth_stages."specieId" = new_gs."specieId"
        `;

        var updatedRecs = await knex.raw(sqlStr);
        //console.log('updatedRecs: ', updatedRecs);

        return res.status(200).json({
            data: {
                record: updatedRecs[0]
            },
            message: 'Growth Stage list order updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][growth-stages][updateGrowthStageListOrder] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateGrowthStageListOrder;

/**
 */

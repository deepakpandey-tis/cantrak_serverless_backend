const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updateCropCyclePlanPlantDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedDetail = [];

        const schema = Joi.object().keys({
            inputItems: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][ctop-cycle-plan]updateCropCyclePlanPlantDetail: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            // Plan Detail
            let record;
            let recNo;
            let insertDetail;

            recNo = 0;
            for (let rec of payload.inputItems) {
                record = {
                    plantLotId: rec.plantLotId,

                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('rec: ', record);

                insertDetail = await knex
                    .update(record)
                    .where({ id: rec.id })
                    .returning(["*"])
                    .transacting(trx)
                    .into("crop_cycle_plan_detail");

                insertedDetail[recNo] = insertDetail[0];

                recNo += 1;
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedDetail,
            },
            message: 'Crop cycle plant lot detail updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][ctop-cycle-plan][updateCropCyclePlanPlantDetail] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
    }
}

module.exports = updateCropCyclePlanPlantDetail;

/**
 */

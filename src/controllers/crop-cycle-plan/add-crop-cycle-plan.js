const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const addCropCyclePlan = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedDetail = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            date: Joi.date().required(),
            name: Joi.string().required(),
            description: Joi.string().allow(null).allow('').required(),
            inputItems: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][crop-cycle-plan][addCropCyclePlan]: JOi Result",
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

            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                date: new Date(payload.date).getTime(),
                name: payload.name,
                description: payload.description,

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("crop_cycle_plans");

            insertedRecord = insertResult[0];

            // Plan Detail
            let record;
            let recNo;
            let txnId;

            txnId = null;
            recNo = 0;
            for (let rec of payload.inputItems) {
                record = {
                    orgId: orgId,
                    cropCyclePlanId: insertedRecord.id,
                    strainId: rec.strainId,
                    specieId: rec.specieId,
                    locationId: rec.locationId,
                    subLocationId: rec.subLocationId,
                    expectedPlants: rec.expectedPlants,
                    startDate: new Date(rec.startDate).getTime(),
                    expectedHarvestDate: new Date(rec.expectedHarvestDate).getTime(),

                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('rec: ', record);

                const insertResult = await knex
                    .insert(record)
                    .returning(["*"])
                    .transacting(trx)
                    .into("crop_cycle_plan_detail");

                insertedDetail[recNo] = insertResult[0];

                for(let rec1 of rec.growthStages){
                    record = {
                        orgId: orgId,
                        cropCyclePlanDetailId: insertedDetail[recNo].id,
                        growthStageId: rec1.growthStageId,
                        name: rec1.name,
                        listOrder: rec1.listOrder,
                        noOfDays: rec1.noOfDays,
                        startDate: new Date(rec1.startDate).getTime(),
                        endDate: new Date(rec1.endDate).getTime(),

                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    }

                    const insertResult = await knex
                    .insert(record)
                    .returning(["*"])
                    .transacting(trx)
                    .into("crop_cycle_plan_detail_gs");
                }

                recNo += 1;
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                detail: insertedDetail,
            },
            message: 'Crop Cycle Plan added successfully.'
        });
    } catch (err) {
        console.log("[controllers][crop-cycle-plan][addCropCyclePlan] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addCropCyclePlan;

/**
 */

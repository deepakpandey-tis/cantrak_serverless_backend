const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updatePlantedDate = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            plantedOn: Joi.date().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][plants]updatePlantedDate: JOi Result",
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
                plantedOn: new Date(payload.plantedOn).getTime(),
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('Plant Lot update planted date record: ', insertData);
    
            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .into('plant_lots');
    
            insertedRecord = insertResult[0];

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
            },
            message: 'Plant Lot planted date updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][updatePlantedDate] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
    }
}

module.exports = updatePlantedDate;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updatePlant = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            companyId: Joi.string().required(),
            plantationId: Joi.string().required(),
            plantationPhaseId: Joi.string().required(),
            plantationGroupId: Joi.string().required(),
            licenseId: Joi.string().required(),
            supplierId: Joi.string().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            containerTypeId: Joi.string().required(),
            plantedOn: Joi.date().required(),
//            plantsCount: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][plants]updatePlant: JOi Result",
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
        let insertData = {
            orgId: orgId,
            ...payload,
            plantedOn: new Date(payload.plantedOn).getTime(),
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('plant insert record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into("plants");

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Plant updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][plants][updatePlant] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updatePlant;

/**
 */

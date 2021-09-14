const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const addPlant = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            plantationId: Joi.string().required(),
            plantationPhaseId: Joi.string().required(),
            plantationGroupId: Joi.string().required(),
            licenseId: Joi.string().required(),
            supplierId: Joi.string().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            containerTypeId: Joi.string().required(),
            growthStageId: Joi.number().integer().required(),
            plantedOn: Joi.date().required(),
            plantsCount: Joi.number().integer().required(),
            additionalAttributes: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][plants][addPlant]: JOi Result",
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
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('plant insert record: ', insertData);

        const insertPayload = {...insertData};
        ret = await knex.raw('select plants_save(?)', JSON.stringify(insertPayload));
        console.log(`[Return]: `, ret);

        return res.status(200).json({
            data: ret.rows,
            message: 'Plants added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][plants][addPlant] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addPlant;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const addPlant = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            plantLotId: Joi.string().required(),
            plantLotName: Joi.string().required(),
            plantLotDescription: Joi.string().optional().allow(''),
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
            "[controllers][plants][addPlant]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        // Check already exists
        if(+payload.plantLotId <= 0){
            const alreadyExists = await knexReader("plant_lots")
                .where(qb => {
                    qb.where('name', 'iLIKE', payload.plantLotName.trim())
                })
                .where({ orgId: req.orgId })
                .where({ companyId: payload.companyId });

            console.log(
                "[controllers][work-plans][addPlant]: ",
                alreadyExists
            );

            if (alreadyExists && alreadyExists.length) {
                return res.status(400).json({
                    errors: [
                        { code: "VALIDATION_ERROR", message: "Plant Lot Name already exist!" }
                    ]
                });
            }
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            if(+payload.plantLotId <= 0){
                    let insertData = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    specieId: payload.specieId,
                    strainId: payload.strainId,
                    name: payload.plantLotName,
                    description: payload.plantLotDescription,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };

                const insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("plant_lots");

                insertedRecord = insertResult[0];
            }

            insertData = {
                orgId: orgId,
                ...payload,
                plantLotId: +payload.plantLotId <= 0 ? insertedRecord.id : payload.plantLotId,
                plantedOn: new Date(payload.plantedOn).getTime(),
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('plant insert record: ', insertData);

            const insertPayload = { ...insertData };
            ret = await knex.raw('select plants_save(?)', JSON.stringify(insertPayload));
            console.log(`[Return]: `, ret);

            trx.commit;
        });

        return res.status(200).json({
            data: ret.rows,
            message: 'Plants added successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][addPlant] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addPlant;

/**
 */

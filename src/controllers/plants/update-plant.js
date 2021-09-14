const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updatePlant = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;
        const additionalAttributes = req.body.additionalAttributes;

        let insertedRecord = [];
        let insertedLocationRecord = [];
        let insertedAttribRecords = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            plantLocationId: Joi.string().required(),
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
            additionalAttributes: Joi.array().required(),
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

        await knex.transaction(async (trx) => {
            let insertData = {
                orgId: orgId,
                licenseId: payload.licenseId,
                strainId: payload.strainId,
                specieId: payload.specieId,
                plantedOn: new Date(payload.plantedOn).getTime(),
                containerTypeId: payload.containerTypeId,
                supplierId: payload.supplierId,
                growthStageId: payload.growthStageId,
                lotNumber: payload.lotNumber,
                plantSerial: payload.plantSerial,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('plant update record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into('plants');

            insertedRecord = insertResult[0];

            //  location
            let insertLocationData = {
                orgId: orgId,
                plantId: payload.plantId,
                companyId: payload.companyId,
                plantationId: payload.plantationId,
                plantationPhaseId: payload.plantationPhaseId,
                plantationGroupId: payload.plantationGroupId,
            };
            console.log('plant location update record: ', insertData);

            const insertLocationResult = await knex
                .update(insertLocationData)
                .where({ id: payload.plantLocationId, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into('plant_locations');

            insertedLocationRecord = insertLocationResult[0];

            //  Delete existing additional attributes
            let delRecs = await knex('plant_attributes')
                .where({ plantId: payload.id, orgId: orgId })
                .transacting(trx)
                .del();

            //  Add additional attributes
            if (additionalAttributes && additionalAttributes.length > 0) {
                for (attr of additionalAttributes) {
                    let rec = await knex
                        .insert({ 
                            orgId: orgId, 
                            plantId: payload.id, 
                            attributeName: attr.attributeName, 
                            attributeValue: attr.attributeValue,
                            createdBy: userId,
                            createdAt: currentTime,
                            updatedBy: userId,
                            updatedAt: currentTime,
                        })
                        .returning(["*"])
                        .transacting(trx)
                        .into('plant_attributes');

                    insertedAttribRecords.push(rec[0]);
                }
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                additionalAttributes: insertedAttribRecords
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

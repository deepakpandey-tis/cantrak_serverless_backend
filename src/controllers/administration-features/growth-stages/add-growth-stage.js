const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const addGrowthStage = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            specieId: Joi.string().required(),
            name: Joi.string().required(),
            noOfDays: Joi.number().integer().required(),
            listOrder: Joi.number().integer().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][growth-stages][addGrowthStage]: JOi Result",
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
        const alreadyExists = await knexReader("growth_stages")
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId })
            .where({ specieId: payload.specieId });

        console.log(
            "[controllers][administration-features][growth-stages][addGrowthStage]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Growth Stage already exist!" }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            name: payload.name.trim(),
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('growth stage insert record: ', insertData);

        const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into("growth_stages");

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Growth Stage added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][growth-stages][addGrowthStage] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addGrowthStage;

/**
 */

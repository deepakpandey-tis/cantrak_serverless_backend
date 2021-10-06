const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const addStrain = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            name: Joi.string().required(),
            itemId: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][strains][addStrain]: JOi Result",
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
        const alreadyExists = await knexReader('strains')
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId })
            .where({ itemId: payload.itemId });

        console.log(
            "[controllers][administration-features][strains][addStrain]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Strain already exist!" }
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
        console.log('Strain insert record: ', insertData);

        const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into('strains');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Strain added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][strains][addStrain] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addStrain;

/**
 */

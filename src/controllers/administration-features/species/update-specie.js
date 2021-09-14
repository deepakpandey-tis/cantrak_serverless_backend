const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateSpecie = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            name: Joi.string().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][species]updateSpecie: JOi Result",
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
        const alreadyExists = await knexReader("species")
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][species][updateSpecie]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Specie already exist!" }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('specie insert record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into("species");

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Specie updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][species][updateSpecie] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateSpecie;

/**
 */

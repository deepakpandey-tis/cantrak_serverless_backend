const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateProcess = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            name: Joi.string().required(),
            description: Joi.string().allow("").required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][processes]updateProcess: JOi Result",
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
        const alreadyExists = await knexReader('processes')
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][processes][updateProcess]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Process already exist!" }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            name: payload.name.trim(),
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Process update record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into('processes');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Process updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][processes][updateProcess] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateProcess;

/**
 */

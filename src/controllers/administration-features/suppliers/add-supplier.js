const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const addSupplier = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            name: Joi.string().required(),
            supplierTypeId: Joi.string().required(),
            taxId: Joi.allow('').optional(),
            address: Joi.allow('').optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][suppliers][addSupplier]: JOi Result",
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
        const alreadyExists = await knexReader('suppliers')
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][administration-features][suppliers][addSupplier]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Supplier already exist!" }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Supplier insert record: ', insertData);

        const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into('suppliers');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Supplier added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][suppliers][addSupplier] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addSupplier;

/**
 */

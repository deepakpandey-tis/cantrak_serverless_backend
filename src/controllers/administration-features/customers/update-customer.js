const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateCustomer = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            contactPerson: Joi.string().required(),
            name: Joi.string().required(),
            customerTypeId: Joi.string().required(),
            taxId: Joi.allow('').optional(),
            creditDays: Joi.number().required(),
            address: Joi.allow('').optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][customers]updateCustomer: JOi Result",
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
        const alreadyExists = await knexReader('customers')
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][customers][updateCustomer]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Customer already exist!" }
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
        console.log('Customer insert record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into('customers');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Customer updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][customers][updateCustomer] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateCustomer;

/**
 */

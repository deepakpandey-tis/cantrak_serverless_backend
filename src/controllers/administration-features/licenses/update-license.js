const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateLicense = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            number: Joi.string().required(),
            issuedOn: Joi.date().required(),
            expiredOn: Joi.date().required(),
            primaryHolder: Joi.string().required(),
            subHolder: Joi.string().required(),
            category: Joi.number().required(),
            locationName: Joi.string().required(),
            location: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][licenses]updateLicense: JOi Result",
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
        /*
        const alreadyExists = await knexReader('licenses')
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][licenses][updateLicense]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "License already exist!" }
                ]
            });
        }
        */

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            issuedOn: new Date(payload.issuedOn).getTime(),
            expiredOn: new Date(payload.expiredOn).getTime(),
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('License insert record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into('licenses');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'License updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][licenses][updateLicense] :  Error", err);
        if (err.code == 23505){            // unique_violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'License for Primary Holder, Sub Holder and Number already exists.' }]
            });
        }
        else{
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
}

module.exports = updateLicense;

/**
 */

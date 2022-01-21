const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const updateLicenseObjective = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            licenseTypeId: Joi.string().required(),
            nameArray: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][licenses]updateLicenseObjective: JOi Result",
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

        let insertData;
        let insertedRecords = [];
        let recNo;
        await knex.transaction(async (trx) => {

            recNo = 0;
            for (let rec of payload.nameArray) {
                insertData = {
                    // licenseTypeId: licenseTypeId,
                    name: rec.name,
                };
                console.log('license objective: ',insertData);

                recNo += 1;
                const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id })
                .returning(["*"])
                .into('license_objectives');

                insertedRecords[recNo] = insertResult[0];
            }

            trx.commit;
        });

/* 
        let insertData = {
            ...payload,
        };
        console.log('License Objective update record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id })
            .returning(["*"])
            .into('license_objectives');

        insertedRecord = insertResult[0];
 */
        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'License Objective updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][licenses][updateLicenseObjective] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateLicenseObjective;

/**
 */

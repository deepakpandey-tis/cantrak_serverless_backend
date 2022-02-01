const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const addLicenseObjective = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        const schema = Joi.object().keys({
            licenseTypeId: Joi.string().required(),
            nameArray: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][licenses][addLicenseObjective]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        let insertData;
        let insertedRecords = [];
        let recNo;
        await knex.transaction(async (trx) => {

            recNo = 0;
            for (let rec of payload.nameArray) {
                insertData = {
                    licenseTypeId: payload.licenseTypeId,
                    name: rec.name,
                };
                console.log('license objective: ',insertData);

                recNo += 1;
                const insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("license_objectives");

                insertedRecords[recNo] = insertResult[0];
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecords
            },
            message: `${recNo} License Objectives added successfully.`
        });
    } catch (err) {
        console.log("[controllers][administration-features][licenses][addLicenseObjective] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addLicenseObjective;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const updateSubLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            name: Joi.string().required(),
            description: Joi.string().allow("").required(),
            locationId: Joi.number().required(),
            companyId: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][sub-locations]updateSubLocation: JOi Result",
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
        const alreadyExists = await knex("sub_locations")
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][sub-locations][updateSubLocation]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Sub Location already exist!" }
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
        console.log('Sub Location update record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into("sub_locations");

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Sub Location updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][sub-locations][updateSubLocation] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateSubLocation;

/**
 */

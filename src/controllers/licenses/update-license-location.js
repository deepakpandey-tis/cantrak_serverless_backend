const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updateLicenseLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            name: Joi.string().required(),
            description: Joi.string().allow("").allow(null).required(),
            latitude: Joi.number().allow(null).allow(0).required(),
            longitude: Joi.number().allow(null).allow(0).required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][controllers][licenses]updateLicenseLocation: JOi Result",
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
        
        const alreadyExists = await knex('license_locations')
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][controllers][licenses][updateLicenseLocation]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "LicenseLocality of Operation already exist!" }
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
        console.log('License Location insert record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into('license_locations');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Locality of Operation updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][controllers][licenses][updateLicenseLocation] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateLicenseLocation;

/**
 */

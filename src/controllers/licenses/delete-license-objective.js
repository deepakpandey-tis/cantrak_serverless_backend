const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const deleteLicenseObjective = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlResult;
        let message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][controllers][licenses]deleteLicenseObjective: JOi Result",
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
        let check = await knex('license_objectives').select('isActive').where({ id: payload.id }).first();
        if (check.isActive) {
            sqlResult = await knex
            .update({ isActive: false })
            .where({ id: payload.id })
            .returning(["*"])
            .into('license_objectives');
            message = "License Objective de-activated successfully!"
        } else {
            sqlResult = await knex
            .update({ isActive: true })
            .where({ id: payload.id })
            .returning(["*"])
            .into('license_objectives');
            message = "License Objective activated successfully!"
        }

        return res.status(200).json({
            data: {
                record: sqlResult[0]
            },
            message: message
        });
    } catch (err) {
        console.log("[controllers][controllers][licenses][deleteLicenseObjective] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteLicenseObjective;

/**
 */

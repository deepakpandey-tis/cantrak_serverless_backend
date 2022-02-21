const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const toggleSpecie = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlResult;
        let message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][species]toggleSpecie: JOi Result",
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
        let check = await knex('species').select('isActive').where({ id: payload.id, orgId: orgId }).first();
        if (check.isActive) {
            sqlResult = await knex
              .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
              .where({ id: payload.id, orgId: req.orgId })
              .returning(["*"])
              .into("species");
              message = "Specie de-activated successfully!"
          } else {
            sqlResult = await knex
              .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
              .where({ id: payload.id, orgId: req.orgId })
              .returning(["*"])
              .into("species");
              message = "Specie activated successfully!"
          }

        return res.status(200).json({
            data: {
                record: sqlResult[0]
            },
            message: message
        });
    } catch (err) {
        console.log("[controllers][administration-features][species][toggleSpecie] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = toggleSpecie;

/**
 */

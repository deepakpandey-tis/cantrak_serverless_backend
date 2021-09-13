const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateGrowthStage = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.number().integer().required(),
            specieId: Joi.string().required(),
            name_en: Joi.string().required(),
            name_th: Joi.string().required(),
            listOrder: Joi.number().integer().required()
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][growth-stages]updateGrowthStage: JOi Result",
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
        const alreadyExists = await knexReader("growth_stages")
            .where(qb => {
                qb.where('name_en', 'iLIKE', payload.name_en)
                qb.orWhere('name_th', 'iLIKE', payload.name_th)
            })
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][growth-stages][updateGrowthStage]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Growth Stage already exist!" }
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
        console.log('growth stage insert record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into("growth_stages");

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Growth Stage updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][growth-stages][updateGrowthStage] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateGrowthStage;

/**
 */

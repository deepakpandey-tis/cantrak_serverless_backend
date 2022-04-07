const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const addWorkOrderTaskRemark = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;
        console.log(
            "[controllers][work-plans][addWorkOrderTaskRemark]: payload", payload
        );

        let insertedRecord = [];

        const schema = Joi.object().keys({
            entityId: Joi.string().required(),
            entityType: Joi.string().required(),
            remark: Joi.string().required(),
            // remark: Joi.string().allow(null).allow('').required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][work-plans][addWorkOrderTaskRemark]: JOi Result",
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
        let insertData = {
            orgId: orgId,
            entityId: payload.entityId,
            entityType: payload.entityType,
            description: payload.remark.trim(),
            createdBy: userId,
            createdAt: currentTime,
            updatedAt: currentTime,
        };
        console.log('work plan task observation insert record: ', insertData);

        insertedRecord = await knex
        .insert(insertData)
        .returning(["*"])
        .into("remarks_master");

        return res.status(200).json({
            data: {
                record: insertedRecord,
            },
            message: 'Work plan task remark added successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][addWorkOrderTaskRemark] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addWorkOrderTaskRemark;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updateWorkOrderDate = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertedRecord = [];

    const schema = Joi.object().keys({
        id: Joi.string().required(),
        workOrderDate: Joi.date().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][work-plans]updateWorkOrderDate: JOi Result",
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
    try {

        await knex.transaction(async (trx) => {
            let insertData = {
                workOrderDate: new Date(payload.workOrderDate).getTime(),
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('work order date update record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into('work_plan_schedule_assign_groups');

            insertedRecord = insertResult[0];

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
            },
            message: 'Work Order date updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][updateWorkOrderDate] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateWorkOrderDate;

/**
 */

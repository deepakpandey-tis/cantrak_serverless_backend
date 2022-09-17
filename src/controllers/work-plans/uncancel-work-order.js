const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const uncancelWorkOrder = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertedRecord = [];

    const schema = Joi.object().keys({
        id: Joi.string().required(),
        uncancelReason: Joi.string().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][work-plans]uncancelWorkOrder: JOi Result",
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
                entityId: payload.id,
                entityType: "work-orders",
                description: payload.uncancelReason,
                orgId: req.orgId,
                createdBy: req.me.id,
                createdAt: currentTime,
                updatedAt: currentTime,
            };
            console.log('uncancel work order reason record: ', insertData);

            const insertRemarkResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("remarks_master");

            insertData = {
                status: "O",
                cancelledBy: userId,
                cancelledAt: currentTime,
            };
            console.log('uncancel work order record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into('work_plan_schedule_assign_locations');

            insertedRecord = insertResult[0];

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
            },
            message: 'Work Order uncancelled successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][uncancelWorkOrder] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = uncancelWorkOrder;

/**
 */

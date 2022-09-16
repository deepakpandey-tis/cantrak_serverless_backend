const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const cancelWorkOrder = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertedRecord = [];

    const schema = Joi.object().keys({
        id: Joi.string().required(),
        cancelReason: Joi.string().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][work-plans]cancelWorkOrder: JOi Result",
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

        // Check already exists
        const alreadyExists = await knex("remarks_master")
            .where({ orgId: orgId })
            .where({ entityId: payload.id })
            .where({ entityType: "work-orders" });

        console.log(
            "[controllers][work-plans][cancelWorkOrder]: ",
            alreadyExists
        );

        await knex.transaction(async (trx) => {
            if (alreadyExists && alreadyExists.length) {
                let insertData = {
                    description: payload.cancelReason,
                    updatedAt: currentTime,
                };
                console.log('cancel work order reason record: ', insertData);

                const insertRemarkResult = await knex
                    .update(insertData)
                    .where({ orgId: orgId, entityId: payload.id, entityType: "work-orders"})
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");
            }
            else {
                let insertData = {
                    entityId: payload.id,
                    entityType: "work-orders",
                    description: payload.cancelReason,
                    orgId: req.orgId,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('cancel work order reason record: ', insertData);

                const insertRemarkResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");
            }

            insertData = {
                status: "C",
                cancelledBy: userId,
                cancelledAt: currentTime,
            };
            console.log('cancel work order record: ', insertData);

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
            message: 'Work Order cancelled successfully.'
        });
    } catch (err) {
        console.log("[controllers][work-plans][cancelWorkOrder] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = cancelWorkOrder;

/**
 */

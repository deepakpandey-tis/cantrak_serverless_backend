const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require('../../db/knex-reader');

const googleCalendarSync = require('../../helpers/google-calendar-sync');

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

        await knex.transaction(async (trx) => {
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

        const assignedServiceTeam = await knexReader('assigned_service_team')
            .where({
                orgId: orgId,
                entityType: 'work_order',
                entityId: payload.id
            }).first();

        const assignedServiceAdditionalUsers = await knexReader('assigned_service_additional_users')
            .where({
                orgId: orgId,
                entityType: 'work_order',
                entityId: payload.id
            });

        // Delete event from main user's calendar
        googleCalendarSync.deleteEventFromCalendar(
            +assignedServiceTeam.userId,
            +req.orgId,
            assignedServiceTeam.entityType,
            +assignedServiceTeam.entityId,    
            ).catch((error) => { 
            console.log(error);
            });
      
        // Delete event from additional users calendar
        if(assignedServiceAdditionalUsers && assignedServiceAdditionalUsers.length > 0) {
            for(let user of assignedServiceAdditionalUsers) {
                googleCalendarSync.deleteEventFromCalendar(
                +user.userId,
                +req.orgId,
                user.entityType,
                +user.entityId
                ).catch((error) => { 
                console.log(error);
                });
            }
        }
      
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

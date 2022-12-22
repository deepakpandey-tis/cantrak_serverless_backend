const Joi = require("@hapi/joi");
const Parallel = require('async-parallel');
const knex = require('../../db/knex');
const knexReader = require("../../db/knex-reader");

const workOrderEventsHelper = require('../../helpers/work-order-events');

const deleteWorkPlan = async (req, res) => {
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
            "[controllers][work-plans]deleteWorkPlan: JOi Result",
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
        let check = await knexReader('work_plan_master').select('isActive').where({ id: payload.id, orgId: orgId }).first();
        if (check.isActive) {
            sqlResult = await knex
              .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
              .where({ id: payload.id, orgId: req.orgId })
              .returning(["*"])
              .into('work_plan_master');
              message = "Template deleted successfully!"
            // In-active template is treated as deleted template  message = "Template de-activated successfully!"

            const workOrders = await knexReader('work_plan_master')
                .select('work_plan_schedule_assign_locations.id', 'work_plan_schedule_assign_locations.orgId')
                .innerJoin('work_plan_schedules', 'work_plan_master.id', 'work_plan_schedules.workPlanMasterId')
                .innerJoin('work_plan_schedule_assign_locations', 'work_plan_schedules.id', 'work_plan_schedule_assign_locations.workPlanScheduleId')
                .innerJoin('google_calendar_events', function() {
                    this.on('work_plan_schedule_assign_locations.id', '=', 'google_calendar_events.eventEntityId')
                    .andOn('google_calendar_events.eventEntityType', '=', knexReader.raw('?', ['work_order']));                
                })
                .where('work_plan_master.id', payload.id)
                .andWhere('work_plan_master.orgId', orgId);

            
            // Temporary code to test deleting multiple work order events without using queueHelper
            /*
            for(let i = 0; i < workOrders.length; i++) {
                const workOrder = workOrders[i];
                setTimeout(async () => {
                    await workOrderEventsHelper
                        .deleteWorkOrderEvents(+workOrder.id, +orgId);
                }, (i + 1) * 1000)
            }
            */

            // Import SQS Helper..
            const queueHelper = require('../../helpers/queue');

            Parallel.setConcurrency(5);

            await Parallel.each(workOrders, async (workOrder) => {
                try {
                    await queueHelper.addToQueue({
                        workOrder: workOrder
                    },
                        'sync-calendar',
                        'DELETE_WORK_ORDER_CALENDAR_EVENT'
                    );
                } catch (error) {
                    console.log("[controllers][work-plans]deleteWorkPlan Error: Some error in processing work order events", JSON.stringify(workOrder), error);
                }
            });

            Parallel.setConcurrency(0);
                        
          } else {
            sqlResult = await knex
              .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
              .where({ id: payload.id, orgId: req.orgId })
              .returning(["*"])
              .into('work_plan_master');
              message = "Template activated successfully!"
          }
        

        return res.status(200).json({
            data: {
                record: sqlResult[0]
            },
            message: message
        });
    } catch (err) {
        console.log("[controllers][work-plans][deleteWorkPlan] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteWorkPlan;

/**
 */

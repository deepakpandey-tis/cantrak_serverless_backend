const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const updateWorkOrderDate = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;

    const payload = req.body;

    let insertedRecord = [];
    let woAdditionalUserNo;

    const schema = Joi.object().keys({
        id: Joi.string().required(),
        workOrderDate: Joi.date().required(),
        astId: Joi.string().allow(null).allow('').required(),
        teamId: Joi.string().required(),
        userId: Joi.string().allow(null).allow('').required(),
        additionalUsersId: Joi.array().allow(null).required()
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
                .into('work_plan_schedule_assign_locations');

            insertedRecord = insertResult[0];

            //  Location Work Order Team
            if(payload.astId){
                let teamData = {
                    teamId: payload.teamId,
                    userId: payload.userId,
                    updatedAt: currentTime,
                };
                console.log('work order team update record: ', teamData);

                const teamResult = await knex
                    .update(teamData)
                    .where({ id: payload.astId, orgId: orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_service_team");
            } else {
                let teamData = {
                    orgId: orgId,
                    entityId: insertedRecord.id,
                    entityType: 'work_order',
                    teamId: payload.teamId,
                    userId: payload.userId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('work order team insert record: ', teamData);

                const teamResult = await knex
                    .insert(teamData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("assigned_service_team");
            }
        
            //  Location Work Order Additional Users
            //  First delete existing records and then insert
            let result = await knex('assigned_service_additional_users')
                .delete()
                .where({ entityId: payload.id, entityType: 'work_order', orgId: orgId })
                .transacting(trx)
                .returning(['*']);

            if(payload.additionalUsersId){
                woAdditionalUserNo = 0;
                for (let woAUId of payload.additionalUsersId) {
                    workOrderAdditionalUserData = {
                        orgId: orgId,
                        entityId: payload.id,
                        entityType: 'work_order',
                        userId: woAUId,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                    };
                    console.log('work order additional user insert record: ', workOrderAdditionalUserData);

                    const insertAdditionaUserResult = await knex
                        .insert(workOrderAdditionalUserData)
                        .returning(["*"])
                        .transacting(trx)
                        .into("assigned_service_additional_users");

                    woAdditionalUserNo += 1;
                }
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
            },
            message: 'Work Order updated successfully.'
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

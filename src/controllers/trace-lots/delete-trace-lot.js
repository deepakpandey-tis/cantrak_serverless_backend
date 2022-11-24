const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const deleteTraceLot = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr;
        let deletedRecord, message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.number().required(),
            companyId: Joi.number().allow(null).required(),
            lotNo: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][trace-lots]deleteTraceLot: JOi Result",
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

        await knex.transaction(async (trx) => {

            //  Delete uploaded file record, if any
            sqlStr = `DELETE FROM images WHERE "orgId" = ${orgId} AND "entityType" = 'public_trace_lot' AND "entityId" = ${payload.id}`;
            deletedRecs = await knex.raw(sqlStr).transacting(trx);

            //  Delete record
            sqlStr = `DELETE FROM trace_lots WHERE id = ${payload.id} AND "orgId" = ${orgId}`;
            deletedRecord = await knex.raw(sqlStr).transacting(trx);
            if(deletedRecs && deletedRecs.rowCount < 1) {
                throw { code: "DELETE_ERROR", message: "Error in deleting trace QR record!" };
            }

            message = `Trace QR detail deleted successfully.`

            //  Log user activity
            let userActivity = {
                orgId: orgId,
                companyId: payload.companyId,
                entityId: payload.id,
                entityTypeId: EntityTypes.TraceLot,
                entityActionId: EntityActions.Delete,
                description: `${req.me.name} deleted trace QR detail '${payload.lotNo}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
                createdBy: userId,
                createdAt: currentTime,
                trx: trx
            }
            const ret = await addUserActivityHelper.addUserActivity(userActivity);
            // console.log(`addUserActivity Return: `, ret);
            if (ret.error) {
                throw { code: ret.code, message: ret.message };
            }
            //  Log user activity

            trx.commit;
        });

        return res.status(200).json({
            message: message
        });
    } catch (err) {
        console.log("[controllers][trace-lots][deleteTraceLot] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteTraceLot;

/**
 */

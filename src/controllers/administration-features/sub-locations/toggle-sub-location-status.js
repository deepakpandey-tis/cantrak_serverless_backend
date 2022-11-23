const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const toggleSubLocationStatus = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let insertedRecord = [];
        let sqlResult;
        let message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.number().required(),
            name: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][sub-locations]toggleSubLocationStatus: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();
            let check = await knex('sub_locations').select('isActive').where({ id: payload.id, orgId: orgId }).first();
            if (check.isActive) {
                sqlResult = await knex
                    .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
                    .where({ id: payload.id, orgId: req.orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into('sub_locations');
                message = "Sub Location de-activated successfully!"
            } else {
                sqlResult = await knex
                    .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
                    .where({ id: payload.id, orgId: req.orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into('sub_locations');
                message = "Sub Location activated successfully!"
            }

            insertedRecord = sqlResult[0];

            //  Log user activity
            const action = check.isActive ? 'de-activated' : 'activated';
            let userActivity = {
                orgId: orgId,
                companyId: insertedRecord.companyId,
                entityId: payload.id,
                entityTypeId: EntityTypes.SubGrowingLocation,
                entityActionId: EntityActions.ToggleStatus,
                description: `${req.me.name} ${action} sub growing location '${payload.name}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
            data: {
                record: sqlResult[0]
            },
            message: message
        });
    } catch (err) {
        console.log("[controllers][administration-features][sub-locations][toggleSubLocationStatus] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = toggleSubLocationStatus;

/**
 */

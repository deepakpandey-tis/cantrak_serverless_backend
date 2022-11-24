const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require("../../db/knex-reader");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const deleteLicense = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let insertedRecord = [];
        let sqlResult;
        let message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][controllers][licenses]deleteLicense: JOi Result",
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
            let check = await knexReader('licenses').select('isActive').where({ id: payload.id, orgId: orgId }).first();
            if (check.isActive) {
                sqlResult = await knex
                    .update({ isActive: false, updatedBy: userId, updatedAt: currentTime })
                    .where({ id: payload.id, orgId: req.orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into('licenses');
                message = "License de-activated successfully!"
            } else {
                sqlResult = await knex
                    .update({ isActive: true, updatedBy: userId, updatedAt: currentTime })
                    .where({ id: payload.id, orgId: req.orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into('licenses');
                message = "License activated successfully!"
            }

            insertedRecord = sqlResult[0];

            //  Log user activity
            const action = check.isActive ? 'de-activated' : 'activated';
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.License,
                entityActionId: EntityActions.ToggleStatus,
                description: `${req.me.name} ${action} license '${insertedRecord.number}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
        console.log("[controllers][controllers][licenses][deleteLicense] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteLicense;

/**
 */

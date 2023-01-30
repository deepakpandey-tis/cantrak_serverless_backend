const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const deleteLicense = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr;
        let deletedRecord, message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            companyId: Joi.number().required(),
            number: Joi.string().required(),
            revisionNumber: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][licenses]deleteLicense: JOi Result",
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

            //  Setting licenseId to null
            sqlStr = `UPDATE invoices SET "licenseId" = null WHERE "orgId" = ${orgId} AND "companyId" = ${payload.companyId} AND "licenseId" = ${payload.id}`;
            deletedRecord = await knex.raw(sqlStr).transacting(trx);

            sqlStr = `UPDATE harvest_plant_lots SET "licenseId" = null WHERE "orgId" = ${orgId} AND "companyId" = ${payload.companyId} AND "licenseId" = ${payload.id}`;
            deletedRecord = await knex.raw(sqlStr).transacting(trx);

            sqlStr = `UPDATE plant_lots SET "licenseId" = null WHERE "orgId" = ${orgId} AND "companyId" = ${payload.companyId} AND "licenseId" = ${payload.id}`;
            deletedRecord = await knex.raw(sqlStr).transacting(trx);

            sqlStr = `UPDATE item_txns SET "licenseId" = null, "licenseNarId" = null, "licenseNarItemId" = null WHERE "orgId" = ${orgId} AND "companyId" = ${payload.companyId} AND "licenseId" = ${payload.id}`;
            deletedRecord = await knex.raw(sqlStr).transacting(trx);

            //  Delete license record
            sqlStr = `DELETE FROM licenses WHERE id = ${payload.id} AND "orgId" = ${orgId} AND "companyId" = ${payload.companyId}`;
            deletedRecord = await knex.raw(sqlStr).transacting(trx);

            message = `License deleted successfully.`

            let sRevisionNo = payload.revisionNumber > 0 ? `revision number ${payload.revisionNumber}` : '';

            //  Log user activity
            let userActivity = {
                orgId: orgId,
                companyId: payload.companyId,
                entityId: payload.id,
                entityTypeId: EntityTypes.Plant,
                entityActionId: EntityActions.Delete,
                description: `${req.me.name} deleted license '${payload.number}' ${sRevisionNo} on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
/*             data: {
                childRecords: childRecords,
            }, */
            message: message
        });
    } catch (err) {
        console.log("[controllers][licenses][deleteLicense] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteLicense;

/**
 */

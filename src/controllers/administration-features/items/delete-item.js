const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const deleteItem = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;
        var deletedRecs;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            name: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][items][deleteItem]: JOi Result",
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

            //  Delete record
            sqlStr = `DELETE FROM items WHERE "id" = ${payload.id} AND "orgId" = ${orgId}`;

            deletedRecs = await knex.raw(sqlStr).transacting(trx);
            // console.log('deleted recs: ', deletedRecs);

            if (deletedRecs && deletedRecs.rowCount < 1) {
                throw { code: "DELETE_ERROR", message: "Error in deleting Item record!" };
            }

            //  Log user activity
            let userActivity = {
                orgId: orgId,
                companyId: null,
                entityId: payload.id,
                entityTypeId: EntityTypes.Item,
                entityActionId: EntityActions.Delete,
                description: `${req.me.name} deleted item '${payload.name}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                record: deletedRecs
            },
            message: 'Item deleted successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][items][deleteItem] :  Error", err);
        if (err.code == 23503) {            // foreign key violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'Item record cannot be deleted because it is already in use.' }]
            });
        }
        else {
            //trx.rollback
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
}

module.exports = deleteItem;

/**
 */

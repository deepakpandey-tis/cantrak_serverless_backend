const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const deleteHarvesttLot = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr;
        let deletedRecord, message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            companyId: Joi.number().required(),
            plantsCount: Joi.number().integer().required(),
            harvestLotNo: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][harvest]deleteHarvesttLot: JOi Result",
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
        let harvestUsedCount;
        let childRecords;

        childRecords = false;
        harvestUsedCount = 0;

        //  Check whether harvest output items used in any transaction
        const harvestSql = `SELECT coalesce(count(id), 0) "harvestCount" FROM item_txns it WHERE it."orgId" = ${orgId} AND it."companyId" = ${payload.companyId} AND it."lotNo" = '${payload.harvestLotNo}' AND it."quantity" < 0;`;

        let hCount;

        [hCount] = await Promise.all(
            [
                knex.raw(harvestSql)
            ]
        );

        harvestUsedCount = parseInt(hCount.rows[0].harvestCount);

        if (harvestUsedCount) {
            childRecords = true;
            message = `Harvest lot has child records`
        }

        if (!childRecords) {
            await knex.transaction(async (trx) => {
                //  Delete harvest plant lot record
                sqlStr = `DELETE FROM harvest_plant_lots WHERE id = ${payload.id} AND "orgId" = ${orgId} AND "companyId" = ${payload.companyId}`;
                deletedRecord = await knex.raw(sqlStr).transacting(trx);

                message = `Harvest lot deleted successfully.`

                //  Log user activity
                let userActivity = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    entityId: payload.id,
                    entityTypeId: EntityTypes.Plant,
                    entityActionId: EntityActions.Delete,
                    description: `${req.me.name} deleted harvest lot '${payload.harvestLotNo}' containing ${payload.plantsCount} plants on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
        }

        return res.status(200).json({
            data: {
                childRecords: childRecords,
                harvestCount: harvestUsedCount
            },
            message: message
        });
    } catch (err) {
        console.log("[controllers][harvest][deleteHarvesttLot] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deleteHarvesttLot;

/**
 */

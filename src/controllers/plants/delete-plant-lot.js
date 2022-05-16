const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const deletePlantLot = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr;
        let deletedRecord, message;

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            confirm: Joi.string().allow('').allow(null).required(),
            companyId: Joi.number().required(),
            plantsCount: Joi.number().integer().required(),
            plantLotNo: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][plants]deletePlantLot: JOi Result",
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
        let wasteCount, locationChangeCount, growthStageChangeCount, harvestCount;
        let childRecords;

        childRecords = false;
        wasteCount = locationChangeCount = growthStageChangeCount = harvestCount = 0;
        if (payload.confirm != "confirm") {
            //  Check whether child records exist
            const wasteSql = `SELECT coalesce(sum(pwt."totalPlants"), 0) "wasteCount" FROM plant_waste_txns pwt WHERE "plantLotId" = ${payload.id} AND "orgId" = ${orgId};`;
            const locationSql = `SELECT coalesce(sum(plt."totalPlants"), 0) "locationChangeCount" FROM plant_location_txns plt WHERE "plantLotId" = ${payload.id} AND "orgId" = ${orgId};`;
            const growthSql = `SELECT coalesce(sum(pgst."totalPlants"), 0) "growthStageChangeCount" FROM plant_growth_stage_txns pgst WHERE pgst."plantLotId" = ${payload.id} AND "orgId" = ${orgId};`;
            const harvestSql = `SELECT coalesce(sum(hpl."plantsCount"), 0) "harvestCount" FROM harvest_plant_lots hpl WHERE hpl."plantLotId" = ${payload.id} AND "orgId" = ${orgId};`;

            let wCount, lChangeCount, gStageChangeCount, hCount;

            [wCount, lChangeCount, gStageChangeCount, hCount] = await Promise.all(
                [
                    knex.raw(wasteSql),
                    knex.raw(locationSql),
                    knex.raw(growthSql),
                    knex.raw(harvestSql)
                ]
            );

            wasteCount = parseInt(wCount.rows[0].wasteCount);
            locationChangeCount = parseInt(lChangeCount.rows[0].locationChangeCount);
            growthStageChangeCount = parseInt(gStageChangeCount.rows[0].growthStageChangeCount);
            harvestCount = parseInt(hCount.rows[0].harvestCount);

            if (wasteCount || locationChangeCount || growthStageChangeCount || harvestCount) {
                childRecords = true;
                message = `Plant lot has child records`
            }
        }

        if (!childRecords) {
            await knex.transaction(async (trx) => {
                //  Delete plant lot record
                sqlStr = `DELETE FROM plant_lots WHERE id = ${payload.id} AND "orgId" = ${orgId}`;
                deletedRecord = await knex.raw(sqlStr).transacting(trx);

                message = `Plant lot deleted successfully.`

                //  Log user activity
                let userActivity = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    entityId: payload.id,
                    entityTypeId: EntityTypes.Plant,
                    entityActionId: EntityActions.Delete,
                    description: `${req.me.name} deleted plant lot '${payload.plantLotNo}' containing ${payload.plantsCount} plants on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
                wasteCount: wasteCount,
                locationChangeCount: locationChangeCount,
                growthStageChangeCount: growthStageChangeCount,
                harvestCount: harvestCount
            },
            message: message
        });
    } catch (err) {
        console.log("[controllers][plants][deletePlantLot] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = deletePlantLot;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
const { ObservationTypes } = require('../../helpers/txn-types');

const healthyEntry = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;
    let sqlStr;

    const payload = req.body;
    console.log(
        "[controllers][plants][healthyEntry]: payload", payload
    );

    let insertedRecord = [];
    let insertedReceiveTxn = [];

    const schema = Joi.object().keys({
        date: Joi.date().required(),
        companyId: Joi.number().required(),
        plantLotId: Joi.number().required(),
        plantLotNo: Joi.string().required(),
        locationId: Joi.number().required(),
        subLocationId: Joi.number().required(),
        growthStageId: Joi.number().required(),
        reason: Joi.string().required(),
        totalPlants: Joi.number().integer().required(),
        selectedPlantIds: Joi.array().required(),
        additionalAttributes: Joi.array().required(),
        tagData: Joi.object().required(),
        selectedFiles: Joi.array().allow(null).required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][plants][healthyEntry]: JOi Result",
        result
    );

    if (result && result.hasOwnProperty("error") && result.error) {
        return res.status(400).json({
            errors: [
                { code: "VALIDATION_ERROR", message: result.error.message }
            ]
        });
    }

    try {

        const {selectedPlantIds, reason, additionalAttributes, selectedFiles, ...txnHeader} = req.body;
        const selectedPIds = JSON.parse(selectedPlantIds);
        const allPlants = selectedPIds.find(r => r.id == 0);

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            companyId: txnHeader.companyId,
            observationType: ObservationTypes.Healthy,
            plantLotId: txnHeader.plantLotId,
            date: new Date(txnHeader.date).getTime(),
            locationId: txnHeader.locationId,
            subLocationId: txnHeader.subLocationId,
            growthStageId: txnHeader.growthStageId,
            plantIds: selectedPlantIds,
            totalPlants: txnHeader.totalPlants,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Healthy Entry Txn Header insert record: ', insertData);

        await knex.transaction(async (trx) => {
            const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("plant_observation_txns");

            insertedRecord = insertResult[0];

            if(allPlants){
                sqlStr = `INSERT INTO images ("entityId", "entityType", "s3Url", title, "name", "createdAt", "orgId", record_id)`;
                if(selectedFiles){
                    sqlStr += ` (SELECT DISTINCT ON (p.id) p.id, 'plant', '${selectedFiles[0].s3Url}', '${selectedFiles[0].title}', '${selectedFiles[0].name}', ${currentTime}, ${orgId}, ${insertedRecord.id}`;
                } else {
                    sqlStr += ` (SELECT DISTINCT ON (p.id) p.id, 'plant', null, null, null, ${currentTime}, ${orgId}, ${insertedRecord.id}`;
                }

                sqlStr += ` FROM plant_lots pl, plant_locations ploc, plant_growth_stages pgs, plants p
                WHERE pl.id = ${txnHeader.plantLotId} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste"
                AND p.id NOT IN  (SELECT "entityId" FROM (SELECT DISTINCT ON (i."entityId") i."entityId", it."tagData" FROM images i, image_tags it WHERE p.id = i."entityId" AND i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) illPlants WHERE (illPlants."tagData"->'plantCondition'->>'appearsIll')::boolean is true)
                AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."orgId" = ${orgId} and ploc2."plantId" = p.id order by id desc limit 1)
                AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."orgId" = ${OrgId} and pgs2."plantId" = p.id order by id desc limit 1)
                AND ploc."locationId" = ${txnHeader.locationId} AND ploc."subLocationId" = ${txnHeader.subLocationId}
                )`;
                console.log('Healthy Entry Txn images record all plants: ', sqlStr);

                await knex.raw(sqlStr).transacting(trx);

                sqlStr = `INSERT INTO image_tags ("entityId", "entityType", "tagData", "orgId", "createdBy", "createdAt")
                (SELECT i.id, 'plant', '${JSON.stringify(txnHeader.tagData)}', ${orgId}, ${userId}, ${currentTime}
                FROM plant_lots pl, plant_locations ploc, plant_growth_stages pgs, plants p
                WHERE pl.id = ${txnHeader.plantLotId} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste"
                AND p.id NOT IN  (SELECT "entityId" FROM (SELECT DISTINCT ON (i."entityId") i."entityId", it."tagData" FROM images i, image_tags it WHERE p.id = i."entityId" AND i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) illPlants WHERE (illPlants."tagData"->'plantCondition'->>'appearsIll')::boolean is true)
                AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."orgId" = ${orgId} and ploc2."plantId" = p.id order by id desc limit 1)
                AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."orgId" = ${OrgId} and pgs2."plantId" = p.id order by id desc limit 1)
                AND ploc."locationId" = ${txnHeader.locationId} AND ploc."subLocationId" = ${txnHeader.subLocationId}
                )`;
                console.log('Healthy Entry Txn images_tags record all plants: ', sqlStr);

                await knex.raw(sqlStr).transacting(trx);

                sqlStr = `INSERT INTO remarks_master ("entityId", "entityType", "description", "orgId", "createdBy", "createdAt", "updatedAt")
                (SELECT i.id, 'plant_observation', '${reason}', ${orgId}, ${userId}, ${currentTime}, ${currentTime}
                FROM plant_lots pl, plant_locations ploc, plant_growth_stages pgs, plants p
                WHERE pl.id = ${txnHeader.plantLotId} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND p."isActive" AND NOT p."isWaste"
                AND p.id NOT IN  (SELECT "entityId" FROM (SELECT DISTINCT ON (i."entityId") i."entityId", it."tagData" FROM images i, image_tags it WHERE p.id = i."entityId" AND i.id = it."entityId" ORDER BY i."entityId" asc, i."createdAt" DESC) illPlants WHERE (illPlants."tagData"->'plantCondition'->>'appearsIll')::boolean is true)
                AND p.id = ploc."plantId" AND ploc.id = (select id from plant_locations ploc2 where ploc2."orgId" = ${orgId} and ploc2."plantId" = p.id order by id desc limit 1)
                AND p.id = pgs."plantId" AND pgs.id = (select id from plant_growth_stages pgs2 where pgs2."orgId" = ${OrgId} and pgs2."plantId" = p.id order by id desc limit 1)
                AND ploc."locationId" = ${txnHeader.locationId} AND ploc."subLocationId" = ${txnHeader.subLocationId}
                )`;
                console.log('Healthy Entry Txn remarks_master record all plants: ', sqlStr);

                await knex.raw(sqlStr).transacting(trx);
            } else {
                sqlStr = `INSERT INTO images ("entityId", "entityType", "s3Url", title, "name", "createdAt", "orgId", record_id)`;
                if(selectedFiles){
                    sqlStr += ` (SELECT p.id, 'plant', '${selectedFiles[0].s3Url}', '${selectedFiles[0].title}', '${selectedFiles[0].name}', ${currentTime}, ${orgId}, ${insertedRecord.id}`;
                } else {
                    sqlStr += ` (SELECT p.id, 'plant', null, null, null, ${currentTime}, ${orgId}, ${insertedRecord.id}`;
                }
                sqlStr += ` FROM jsonb_to_recordset('${selectedPlantIds}') as p(id bigint))`;
                console.log('Healthy Entry Txn images record: ', sqlStr);

                await knex.raw(sqlStr).transacting(trx);

                sqlStr = `INSERT INTO image_tags ("entityId", "entityType", "tagData", "orgId", "createdBy", "createdAt")
                (SELECT i.id, 'plant', '${JSON.stringify(txnHeader.tagData)}', ${orgId}, ${userId}, ${currentTime} FROM images i, jsonb_to_recordset('${selectedPlantIds}') as p(id bigint) WHERE i."orgId" = ${orgId} AND i."entityType" = 'plant' AND i."entityId" = p.id ORDER BY id DESC LIMIT ${txnHeader.totalPlants})`;
                console.log('Healthy Entry Txn images_tags record: ', sqlStr);

                await knex.raw(sqlStr).transacting(trx);

                sqlStr = `INSERT INTO remarks_master ("entityId", "entityType", "description", "orgId", "createdBy", "createdAt", "updatedAt")
                (SELECT i.id, 'plant_observation', '${reason}', ${orgId}, ${userId}, ${currentTime}, ${currentTime} FROM images i, jsonb_to_recordset('${selectedPlantIds}') as p(id bigint) WHERE i."orgId" = ${orgId} AND i."entityType" = 'plant' AND i."entityId" = p.id ORDER BY id DESC LIMIT ${txnHeader.totalPlants})`;
                console.log('Healthy Entry Txn remarks_master record: ', sqlStr);

                await knex.raw(sqlStr).transacting(trx);
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.PlantWaste,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} marked ${insertedRecord.totalPlants} plant(s) healthy of plant lot '${payload.plantLotNo}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                record: insertedRecord
            },
            message: 'Plants healthy entry successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][healthyEntry] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = healthyEntry;

/**
 */

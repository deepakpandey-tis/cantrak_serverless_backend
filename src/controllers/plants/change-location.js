const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const changeLocation = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;
    let sqlStr, sqlInsert, sqlSelect, sqlFrom, sqlWhere;

    const payload = req.body;
    console.log(
        "[controllers][plants][changeLocation]: payload", payload
    );

    let insertedRecord = [];

    const schema = Joi.object().keys({
        companyId: Joi.number().required(),
        date: Joi.date().required(),
        plantLotId: Joi.number().required(),
        growthStageId: Joi.number().required(),
        fromLocationId: Joi.number().required(),
        fromSubLocationId: Joi.number().required(),
        toLocationId: Joi.number().required(),
        toSubLocationId: Joi.number().required(),
        totalPlants: Joi.number().integer().required(),
        selectedPlantIds: Joi.array().required(),
        remark: Joi.string().allow(null).allow('').required(),
        plantLotNo: Joi.string().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][plants][changeLocation]: JOi Result",
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

        const {selectedPlantIds, remark, plantLotNo, ...txnHeader} = req.body;
        const selectedPIds = JSON.parse(selectedPlantIds);
        const allPlants = selectedPIds.find(r => r.id == 0);

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...txnHeader,
            date: new Date(txnHeader.date).getTime(),
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Change Location Txn Header insert record: ', insertData);

        await knex.transaction(async (trx) => {
            const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("plant_location_txns");

            insertedRecord = insertResult[0];

            //  Change Location Records
            if(allPlants){
                sqlInsert = `INSERT INTO plant_locations ("orgId", "companyId", "plantLotId", "plantId", "plantLocationTxnId", "locationId", "subLocationId"
                , "startDate")`;
                sqlSelect = ` SELECT ${orgId}, ${payload.companyId}, ${payload.plantLotId}, p.id, ${insertedRecord.id}, ${txnHeader.toLocationId}, ${txnHeader.toSubLocationId}
                , ${new Date(txnHeader.date).getTime()}`;
                sqlFrom = ` FROM plants p, plant_lots pl, plant_locations ploc`;
                sqlWhere = ` WHERE pl.id = ${txnHeader.plantLotId} AND p."plantLotId" = pl.id and p.id = ploc."plantId"`;
                sqlWhere += ` AND p."isActive" AND NOT p."isWaste" AND ploc."locationId" = ${txnHeader.fromLocationId} AND ploc."subLocationId" = ${txnHeader.fromSubLocationId}`;

                sqlStr = sqlInsert + sqlSelect + sqlFrom + sqlWhere;
            } else {
                sqlInsert = `INSERT INTO plant_locations ("orgId", "companyId", "plantLotId", "plantId", "plantLocationTxnId", "locationId", "subLocationId"
                , "startDate")`;
                sqlSelect = ` SELECT ${orgId}, ${payload.companyId}, ${payload.plantLotId}, p.id, ${insertedRecord.id}, ${txnHeader.toLocationId}, ${txnHeader.toSubLocationId}
                , ${new Date(txnHeader.date).getTime()}`;
                sqlFrom = ` FROM jsonb_to_recordset('${selectedPlantIds}') as p(id bigint)`;

                sqlStr = sqlInsert + sqlSelect + sqlFrom;
            }

            console.log('Change Location Detail insert sql: ', sqlStr);

            await knex.raw(sqlStr).transacting(trx);

/*             if(allPlants){
                console.log('ALL PLANTS');
            } else {
                sqlInsert = `INSERT INTO plant_growth_stages ("orgId", "plantId", "plantTxnId", "growthStageId", "startDate")`;
                sqlInsert += ` SELECT ${orgId}, plant.id, ${insertedRecord.id}, ${txnHeader.toGrowthStageId}, ${new Date(txnHeader.date).getTime()}`;
                sqlInsert += ` FROM jsonb_to_recordset('${selectedPlantIds}') as plant(id bigint)`;
                console.log('SELECTED PLANTS: ', sqlInsert);
            }

            await knex.raw(sqlInsert); */
  
            //  Optional Remark
            if(payload.remark && payload.remark.trim() != ''){
                insertData = {
                    entityId: insertedRecord.id,
                    entityType: "plant_change_location",
                    description: payload.remark.trim(),
                    orgId: req.orgId,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('Plant change location record: ', insertData);

                const insertRemarkResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.PlantChangeLocation,
                entityActionId: EntityActions.Edit,
                description: `${req.me.name} changed location of ${insertedRecord.totalPlants} plant(s) of plant lot '${payload.plantLotNo}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
            message: 'Plants location changed successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][changeLocation] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = changeLocation;

/**
 */

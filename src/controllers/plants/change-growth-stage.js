const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const changeGrowthStage = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;
    let sqlStr, sqlInsert, sqlSelect, sqlFrom, sqlWhere;

    const payload = req.body;
    console.log(
        "[controllers][plants][changeGrowthStage]: payload", payload
    );

    let insertedRecord = [];

    const schema = Joi.object().keys({
        date: Joi.date().required(),
        plantLotId: Joi.string().required(),
        locationId: Joi.string().required(),
        fromGrowthStageId: Joi.string().required(),
        toGrowthStageId: Joi.string().required(),
        totalPlants: Joi.number().integer().required(),
//        selectedPlantIds: Joi.array().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][plants][changeGrowthStage]: JOi Result",
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

/*         const {selectedPlantIds, ...txnHeader} = req.body;
        const selectedPIds = JSON.parse(selectedPlantIds);
        const allPlants = selectedPIds.find(r => r.id == 0); */

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            plantLotId: payload.plantLotId,
            locationId: payload.locationId,
            date: new Date(payload.date).getTime(),
            fromGrowthStageId: payload.fromGrowthStageId,
            toGrowthStageId: payload.toGrowthStageId,
            totalPlants: payload.totalPlants,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Change Growth Stage Txn Header insert record: ', insertData);

        await knex.transaction(async (trx) => {
            const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("plant_growth_stage_txns");

            insertedRecord = insertResult[0];

            //  Growth Stage Records
            sqlInsert = `INSERT INTO plant_growth_stages ("orgId", "plantId", "plantGrowthStageTxnId", "growthStageId", "startDate")`;
            sqlSelect = ` SELECT ${orgId}, p.id, ${insertedRecord.id}, ${payload.toGrowthStageId}, ${new Date(payload.date).getTime()}`;
            sqlFrom = ` FROM plants p, plant_lots pl, plant_locations ploc`;
            sqlWhere = ` WHERE pl.id = ${payload.plantLotId} AND p."plantLotId" = pl.id and p.id = ploc."plantId"`;
            sqlWhere += ` AND p."isActive" AND NOT p."isWaste" AND ploc."locationId" = ${payload.locationId}`;

            sqlStr = sqlInsert + sqlSelect + sqlFrom + sqlWhere;

            await knex.raw(sqlStr);

/*             if(allPlants){
                console.log('ALL PLANTS');
            } else {
                sqlInsert = `INSERT INTO plant_growth_stages ("orgId", "plantId", "plantTxnId", "growthStageId", "startDate")`;
                sqlInsert += ` SELECT ${orgId}, plant.id, ${insertedRecord.id}, ${txnHeader.toGrowthStageId}, ${new Date(txnHeader.date).getTime()}`;
                sqlInsert += ` FROM jsonb_to_recordset('${selectedPlantIds}') as plant(id bigint)`;
                console.log('SELECTED PLANTS: ', sqlInsert);
            }

            await knex.raw(sqlInsert); */
  
            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Plants growth stage changed successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][changeGrowthStage] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = changeGrowthStage;

/**
 */
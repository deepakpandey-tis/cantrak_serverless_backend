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
        companyId: Joi.number().required(),
        plantLotId: Joi.number().required(),
        locationId: Joi.number().required(),
        subLocationId: Joi.number().required(),
        fromGrowthStageId: Joi.number().required(),
        toGrowthStageId: Joi.number().required(),
        totalPlants: Joi.number().integer().required(),
        selectedPlantIds: Joi.array().required(),
        remark: Joi.string().allow(null).allow('').required(),
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

        const {selectedPlantIds, ...txnHeader} = req.body;
        const selectedPIds = JSON.parse(selectedPlantIds);
        const allPlants = selectedPIds.find(r => r.id == 0);

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            companyId: payload.companyId,
            plantLotId: payload.plantLotId,
            locationId: payload.locationId,
            subLocationId: payload.subLocationId,
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
            if(allPlants){
                sqlInsert = `INSERT INTO plant_growth_stages ("orgId", "plantId", "plantGrowthStageTxnId", "growthStageId", "startDate")`;
                sqlSelect = ` SELECT ${orgId}, p.id, ${insertedRecord.id}, ${payload.toGrowthStageId}, ${new Date(payload.date).getTime()}`;
                sqlFrom = ` FROM plants p, plant_lots pl, plant_locations ploc`;
                sqlWhere = ` WHERE pl.id = ${payload.plantLotId} AND p."plantLotId" = pl.id and p.id = ploc."plantId"`;
                sqlWhere += ` AND p."isActive" AND NOT p."isWaste" AND ploc."locationId" = ${payload.locationId} AND ploc."subLocationId" = ${payload.subLocationId}`;

                sqlStr = sqlInsert + sqlSelect + sqlFrom + sqlWhere;
            } else {
                sqlInsert = `INSERT INTO plant_growth_stages ("orgId", "plantId", "plantGrowthStageTxnId", "growthStageId", "startDate")`;
                sqlSelect = ` SELECT ${orgId}, p.id, ${insertedRecord.id}, ${payload.toGrowthStageId}, ${new Date(payload.date).getTime()}`;
                sqlFrom = ` FROM jsonb_to_recordset('${selectedPlantIds}') as p(id bigint)`;

                sqlStr = sqlInsert + sqlSelect + sqlFrom;
            }


/*             sqlInsert = `INSERT INTO plant_growth_stages ("orgId", "plantId", "plantGrowthStageTxnId", "growthStageId", "startDate")`;
            sqlSelect = ` SELECT ${orgId}, p.id, ${insertedRecord.id}, ${payload.toGrowthStageId}, ${new Date(payload.date).getTime()}`;
            sqlFrom = ` FROM plants p, plant_lots pl, plant_locations ploc`;
            sqlWhere = ` WHERE pl.id = ${payload.plantLotId} AND p."plantLotId" = pl.id and p.id = ploc."plantId"`;
            sqlWhere += ` AND p."isActive" AND NOT p."isWaste" AND ploc."locationId" = ${payload.locationId} AND ploc."subLocationId" = ${payload.subLocationId}`;

            sqlStr = sqlInsert + sqlSelect + sqlFrom + sqlWhere;
 */
            console.log('Change Growth Stage Detail insert sql: ', sqlStr);

            await knex.raw(sqlStr);

            //  Optional Remark
            if(payload.remark && payload.remark.trim() != ''){
                insertData = {
                    entityId: insertedRecord.id,
                    entityType: "plant_change_growth_stage",
                    description: payload.remark.trim(),
                    orgId: req.orgId,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('Plant change growth stage record: ', insertData);

                const insertRemarkResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");
            }

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

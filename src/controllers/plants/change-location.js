const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

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
        date: Joi.date().required(),
        plantLotId: Joi.string().required(),
        growthStageId: Joi.string().required(),
        fromLocationId: Joi.string().required(),
        toLocationId: Joi.string().required(),
        totalPlants: Joi.number().integer().required(),
        selectedPlantIds: Joi.array().required(),
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

         const {selectedPlantIds, ...txnHeader} = req.body;
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
                sqlInsert = `INSERT INTO plant_locations ("orgId", "plantId", "plantLocationTxnId", "locationId"
                , "startDate")`;
                sqlSelect = ` SELECT ${orgId}, p.id, ${insertedRecord.id}, ${txnHeader.toLocationId}
                , ${new Date(txnHeader.date).getTime()}`;
                sqlFrom = ` FROM plants p, plant_lots pl, plant_locations ploc`;
                sqlWhere = ` WHERE pl.id = ${txnHeader.plantLotId} AND p."plantLotId" = pl.id and p.id = ploc."plantId"`;
                sqlWhere += ` AND p."isActive" AND NOT p."isWaste" AND ploc."locationId" = ${txnHeader.fromLocationId}`;

                sqlStr = sqlInsert + sqlSelect + sqlFrom + sqlWhere;
            } else {
                sqlInsert = `INSERT INTO plant_locations ("orgId", "plantId", "plantLocationTxnId", "locationId"
                , "startDate")`;
                sqlSelect = ` SELECT ${orgId}, p.id, ${insertedRecord.id}, ${txnHeader.toLocationId}
                , ${new Date(txnHeader.date).getTime()}`;
                sqlFrom = ` FROM jsonb_to_recordset('${selectedPlantIds}') as p(id bigint)`;

                sqlStr = sqlInsert + sqlSelect + sqlFrom;
            }

            console.log('Change Location Detail insert sql: ', sqlStr);

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
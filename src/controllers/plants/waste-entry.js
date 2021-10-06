const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const wasteEntry = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;
    let sqlStr, sqlUpdate, sqlSelect, sqlFrom, sqlWhere;

    const payload = req.body;
    console.log(
        "[controllers][plants][wasteEntry]: payload", payload
    );

    let insertedRecord = [];

    const schema = Joi.object().keys({
        date: Joi.date().required(),
        companyId: Joi.string().required(),
        plantLotId: Joi.string().required(),
        growthStageId: Joi.string().required(),
        plantationId: Joi.string().required(),
        plantationPhaseId: Joi.string().required(),
        plantationGroupId: Joi.string().required(),
        weightKg: Joi.number().integer().required(),
        weightGm: Joi.number().integer().required(),
        isDestroy: Joi.bool().required(),
        reason: Joi.string().required(),
        totalPlants: Joi.number().integer().required(),
        selectedPlantIds: Joi.array().required(),
        additionalAttributes: Joi.array().required(),
    });

    const result = Joi.validate(payload, schema);
    console.log(
        "[controllers][plants][wasteEntry]: JOi Result",
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

        const {selectedPlantIds, reason, additionalAttributes, ...txnHeader} = req.body;
        const selectedPIds = JSON.parse(selectedPlantIds);
        const allPlants = selectedPIds.find(r => r.id == 0);

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...txnHeader,
            date: new Date(txnHeader.date).getTime(),
            plantIds: selectedPlantIds,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Waste Entry Txn Header insert record: ', insertData);

        await knex.transaction(async (trx) => {
            const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(trx)
            .into("plant_waste_txns");

            insertedRecord = insertResult[0];

            //  Mandatory reason
            insertData = {
                entityId: payload.id,
                entityType: "waste_entry",
                description: reason,
                orgId: req.orgId,
                createdBy: req.me.id,
                createdAt: currentTime,
                updatedAt: currentTime,
            };
            console.log('cancel work order reason record: ', insertData);

            const insertRemarkResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("remarks_master");


            //  Mark Plants as Waste, Destroy and EndOfLife
            if(allPlants){
                sqlUpdate = `UPDATE plants SET "isWaste" = true`;
                if(txnHeader.isDestroy){
                    sqlUpdate += `, "isDestroy" = true, "isEndOfLife" = true`;
                }
                sqlUpdate += `, "updatedBy" = ${req.me.id}, "updatedAt" = ${currentTime}`;

                sqlWhere = ` WHERE id IN`;

                sqlSelect = ` (SELECT p.id FROM plant_lots pl, plants p, plant_locations pl2 
                WHERE pl.id = p."plantLotId" AND p.id = pl2."plantId" AND p2."isActive" AND NOT p."isWaste" 
                AND pl.id = ${txnHeader.plantLotId} AND pl2."plantationGroupId" = ${txnHeader.plantationGroupId})
                `;

                sqlStr = sqlUpdate + sqlWhere + sqlSelect;
            } else {
                sqlUpdate = `UPDATE plants SET "isWaste" = true`;
                if(txnHeader.isDestroy){
                    sqlUpdate += `, "isDestroy" = true, "isEndOfLife" = true`;
                }
                sqlUpdate += `, "updatedBy" = ${req.me.id}, "updatedAt" = ${currentTime}`;

                sqlWhere = ` WHERE id IN`;

                sqlSelect = ` (SELECT p.id FROM jsonb_to_recordset('${selectedPlantIds}') as p(id bigint))`;

                sqlStr = sqlUpdate + sqlWhere + sqlSelect;
            }

            console.log('Waste Entry Plant Update sql: ', sqlStr);

            await knex.raw(sqlStr);
  
            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Plants waste entry successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][wasteEntry] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = wasteEntry;

/**
 */

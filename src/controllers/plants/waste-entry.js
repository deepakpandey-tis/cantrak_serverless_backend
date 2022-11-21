const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
const { ItemCategory, BatchTypes, TxnTypes, SystemStores } = require('../../helpers/txn-types');

/* 
const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveProductFromHarvest: 21,
    ReceiveWasteFromPlantWaste: 22,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};
 */

const wasteEntry = async (req, res) => {
    let orgId = req.me.orgId;
    let userId = req.me.id;
    let sqlStr, sqlUpdate, sqlSelect, sqlFrom, sqlWhere;

    const payload = req.body;
    console.log(
        "[controllers][plants][wasteEntry]: payload", payload
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
        itemId: Joi.number().required(),
        specieId: Joi.number().required(),
        strainId: Joi.number().required(),
        umId: Joi.number().required(),
        storageLocationId: Joi.number().required(),
        quantity: Joi.number().required(),
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
            companyId: txnHeader.companyId,
            plantLotId: txnHeader.plantLotId,
            date: new Date(txnHeader.date).getTime(),
            locationId: txnHeader.locationId,
            subLocationId: txnHeader.subLocationId,
            growthStageId: txnHeader.growthStageId,
            plantIds: selectedPlantIds,
            totalPlants: txnHeader.totalPlants,
            isDestroy: txnHeader.isDestroy,
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
                entityId: insertedRecord.id,
                entityType: "plant_waste_txn_entry",
                description: reason,
                orgId: req.orgId,
                createdBy: req.me.id,
                createdAt: currentTime,
                updatedAt: currentTime,
            };
            console.log('Waste Entry Txn reason record: ', insertData);

            const insertRemarkResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("remarks_master");

            // Waste Receive Txn
            insertData = {
                orgId: orgId,
                companyId: txnHeader.companyId,
                txnType: TxnTypes.ReceiveWasteFromPlantWaste,
                date: new Date(txnHeader.date).getTime(),
                itemCategoryId: ItemCategory.WasteMaterial,
                itemId: txnHeader.itemId,
                lotNo: txnHeader.plantLotNo,
                specieId: txnHeader.specieId,
                strainId: txnHeader.strainId,
                quantity: txnHeader.quantity,
                plantsCount: txnHeader.totalPlants,
                umId: txnHeader.umId,
                storageLocationId: txnHeader.storageLocationId,
                plantLotId: txnHeader.plantLotId,
                plantWasteTxnId: insertedRecord.id,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('Waste receive txn from plant waste insert record: ', insertData);

            const insertReceiveResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedReceiveTxn = insertReceiveResult[0];


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

            await knex.raw(sqlStr).transacting(trx);

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.PlantWaste,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} marked ${insertedRecord.totalPlants} plant(s) waste of plant lot '${payload.plantLotNo}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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

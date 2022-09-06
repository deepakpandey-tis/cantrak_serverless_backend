const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

/* const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveProductFromHarvest: 21,
    ReceiveWasteFromPlantWaste: 22,
    ReceiveWaste: 23,                          // Inventory option
    ReceiveFromProduction: 24,
    AdjustmentAdd: 41,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueForProduction: 54,
    IssueForSale: 55,
    AdjustmentMinus: 81,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};
 */

const addHarvest = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedProductRecords = [];
        let insertedWasteRecords = [];
        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            plantLotId: Joi.string().required(),
            licenseId: Joi.string().required(),
            harvestedOn: Joi.date().required(),
            plantsCount: Joi.number().integer().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            isFinalHarvest: Joi.bool().required(),
            isEntireLot: Joi.bool().required(),
            selectedPlantIds: Joi.array().required(),
            harvestedProducts: Joi.array().required(),
            harvestedWastes: Joi.array().required(),
            plantLotNo: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][harvest][addHarvest]: JOi Result",
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

            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                plantLotId: payload.plantLotId,
                licenseId: payload.licenseId,
                plantsCount: payload.plantsCount,
                isFinalHarvest: payload.isFinalHarvest,
                isEntireLot: payload.isEntireLot,
                plantIds: payload.selectedPlantIds,
                harvestedOn: new Date(payload.harvestedOn).getTime(),
                specieId: payload.specieId,
                strainId: payload.strainId,

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("harvest_plant_lots");

            insertedRecord = insertResult[0];

            // Receive Products
            let product;
            let productRecNo;
            let txnId;

            txnId = null;
            productRecNo = 0;
            for (let rec of payload.harvestedProducts) {
                product = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.ReceiveProductFromHarvest,
                    txnId: txnId,
                    date: new Date(payload.harvestedOn).getTime(),
                    // itemCategoryId: ItemCategory.Product,    itemCategoryId is now passed from frontend
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: payload.specieId,
                    strainId: payload.strainId,
                    plantsCount: rec.plantsCount,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    expiryDate: new Date(rec.expiryDate).getTime(),
                    quality: rec.quality,
                    storageLocationId: rec.storageLocationId,
                    licenseId: payload.licenseId,
                    plantLotId: payload.plantLotId,
                    lotNo: insertedRecord.lotNo,
                    harvestPlantLotId: insertedRecord.id,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                    };
                console.log('product: ', product);

                productRecNo += 1;
                const insertResult = await knex
                    .insert(product)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedProductRecords[productRecNo] = insertResult[0];
                if(productRecNo == 1){
                    txnId = insertedProductRecords[productRecNo].txnId;
                }

                //  Add Product's plants weight txns
                if(rec.plantsWeight.length > 0){
                    sqlStr = `INSERT INTO harvest_product_plants_weight ("orgId", "companyId", "harvestPlantLotId", "itemId", "itemTxnId", "plantId", "plantWeight")
                    SELECT ${orgId}, ${payload.companyId}, ${insertedRecord.id}, ${rec.itemId}, ${insertedProductRecords[productRecNo].id}
                    , x."plantId", coalesce(x."plantWeight", 0) FROM json_to_recordset('${JSON.stringify(rec.plantsWeight)}') as x("plantId" bigint, "plantWeight" float)
                    `;
        
                    console.log('plant weight sql: ', sqlStr);
                    var insertedRecs = await knex.raw(sqlStr).transacting(trx);
                }
            }

            // Receive Wastes
            let waste;
            let wasteRecNo;

            wasteRecNo = 0;
            for (let rec of payload.harvestedWastes) {
                waste = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.ReceiveProductFromHarvest,
                    txnId: txnId,
                    date: new Date(payload.harvestedOn).getTime(),
                    itemCategoryId: ItemCategory.WasteMaterial,
                    itemId: rec.itemId,
                    specieId: payload.specieId,
                    strainId: payload.strainId,
                    plantsCount: rec.plantsCount,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    quality: rec.quality,
                    storageLocationId: rec.storageLocationId,
                    licenseId: payload.licenseId,
                    plantLotId: payload.plantLotId,
                    lotNo: insertedRecord.lotNo,
                    harvestPlantLotId: insertedRecord.id,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                    };
                console.log('waste: ', waste);

                wasteRecNo += 1;
                const insertResult = await knex
                    .insert(waste)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedWasteRecords[wasteRecNo] = insertResult[0];
                if(productRecNo < 1){
                    //  No product, only waste
                    txnId = insertedWasteRecords[wasteRecNo].txnId;
                }
            }

/*          plant lot can be harvested more than once. isFinalHarvest column added to mark final / last harvest   
            // Update Plant Lot with harvestPlantLotId
            plantLotResult = await knex
              .update({ harvestPlantLotId: insertedRecord.id })
              .where("id", payload.plantLotId)
              .returning(["*"])
              .transacting(trx)
              .into("plant_lots");
 */
            // Update Plant Lot with isFinalHarvest
            if(payload.isEntireLot){
                plantLotResult = await knex
                .update({ isFinalHarvest: payload.isFinalHarvest })
                .where("id", payload.plantLotId)
                .returning(["*"])
                .transacting(trx)
                .into("plant_lots");
            }

            // ownerList = plantLotResult[0];

            let entity;
            if(insertedRecord.isFinalHarvest){
                entity = 'final harvested';
            }
            else {
                entity = 'partially harvested';
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Harvest,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} ${entity} ${insertedRecord.plantsCount} plant(s) of plant lot '${payload.plantLotNo}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
                record: insertedRecord,
                products: insertedProductRecords,
                wastes: insertedWasteRecords
            },
            message: 'Harvest added successfully.'
        });
    } catch (err) {
        console.log("[controllers][harvest][addHarvest] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addHarvest;

/**
 */

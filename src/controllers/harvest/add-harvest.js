const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

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

const addHarvest = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedProductRecords = [];
        let insertedWasteRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            plantLotId: Joi.string().required(),
            licenseId: Joi.string().required(),
            harvestedOn: Joi.date().required(),
            plantsCount: Joi.number().integer().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            harvestedProducts: Joi.array().required(),
            harvestedWastes: Joi.array().required(),
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

            productRecNo = 0;
            for (let rec of payload.harvestedProducts) {
                product = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.ReceiveProductFromHarvest,
                    date: new Date(payload.harvestedOn).getTime(),
                    itemCategoryId: ItemCategory.Product,
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
            }

            // Update Plant Lot with harvestPlantLotId
            plantLotResult = await knex
              .update({ harvestPlantLotId: insertedRecord.id })
              .where("id", payload.plantLotId)
              .returning(["*"])
              .transacting(trx)
              .into("plant_lots");
            ownerList = plantLotResult[0];

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
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

const TxnSubTypes ={
    AdjustmentStoreTxn: 2,              // -ve Adjustment issue from Store A to Store B OR +ve Adjustment reeive into Store A from Store B
    ReceiveWasteFromAdjustmentMinusTxn: 91,
    AdjustmentMinusWasteTxn: 91,
};

const addAdjustment = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            subId: Joi.number().required(),
            licenseId: Joi.number().required(),
            date: Joi.date().required(),
            itemCategoryId: Joi.number().required(),
            itemId: Joi.number().required(),
            specieId: Joi.number().allow(null).required(),
            strainId: Joi.number().allow(null).required(),
            umId: Joi.number().required(),
            storageLocationId: Joi.number().required(),
            expiryDate: Joi.date().allow(null).required(),
            lotNo: Joi.string().required(),
            quantity: Joi.number().required(),
            remark: Joi.string().required(),
            wasteItemId: Joi.number().allow(null).required(),
            wasteItemQty: Joi.number().required(),
            wasteItemUMId: Joi.number().allow(null).required(),
            wasteItemStorageLocationId: Joi.number().allow(null).required(),
            otherStorageLocationId: Joi.number().allow(null).required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][inventories][addAdjustment]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        console.log('add adjustment payload: ', payload);
        
        await knex.transaction(async (trx) => {

            let txnId;
            let currentTime = new Date().getTime();

            txnId = null;
            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                txnType: payload.quantity > 0 ? TxnTypes.AdjustmentAdd : TxnTypes.AdjustmentMinus,
                subId: payload.subId,
                date: new Date(payload.date).getTime(),
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                specieId: payload.specieId,
                strainId: payload.strainId,
                quantity: payload.quantity,
                umId: payload.umId,
                expiryDate: payload.expiryDate,
                // quality: payload.quality,
                storageLocationId: payload.storageLocationId,
                licenseId: payload.licenseId,
                lotNo: payload.lotNo,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };

            console.log('add adjustment insertData: ', insertData);

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedRecords[0] = insertResult[0];
            txnId = insertedRecords[0].txnId;

            console.log('add adjustment insertedRecord and txnId: ', insertedRecords[0], txnId);

            if(payload.subId == TxnSubTypes.ReceiveWasteFromAdjustmentMinusTxn){
                //  Add Waste txn
                let insertData = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: payload.wasteItemQty > 0 ? TxnTypes.AdjustmentAdd : TxnTypes.AdjustmentMinus,
                    txnId: txnId,
                    subId: payload.subId,
                    date: new Date(payload.date).getTime(),
                    itemCategoryId: ItemCategory.WasteMaterial,
                    itemId: payload.wasteItemId,
                    specieId: payload.specieId,
                    strainId: payload.strainId,
                    quantity: payload.wasteItemQty,
                    umId: payload.wasteItemUMId,
                    expiryDate: payload.expiryDate,
                    // quality: payload.quality,
                    storageLocationId: payload.wasteItemStorageLocationId,
                    licenseId: payload.licenseId,
                    lotNo: payload.lotNo,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };

                let insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedRecords[1] = insertResult[0];
            }
            else
            if(payload.subId == TxnSubTypes.AdjustmentStoreTxn){
                //  Add Store Adjustment txn
                let insertData = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: payload.quantity > 0 ? TxnTypes.AdjustmentMinus : TxnTypes.AdjustmentAdd,  // issue (-ve) from store is receive (+ve) into other store
                    txnId: txnId,
                    subId: payload.subId,
                    date: new Date(payload.date).getTime(),
                    itemCategoryId: payload.itemCategoryId,
                    itemId: payload.itemId,
                    specieId: payload.specieId,
                    strainId: payload.strainId,
                    quantity: payload.quantity * -1,
                    umId: payload.umId,
                    expiryDate: payload.expiryDate,
                    // quality: payload.quality,
                    storageLocationId: payload.otherStorageLocationId,
                    licenseId: payload.licenseId,
                    // lotNo: payload.lotNo,        Store adjustment create new lotNo
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                    };

                let insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedRecords[1] = insertResult[0];
            }

            //  Mandatory reason
            insertData = {
                entityId: insertedRecords[0].id,
                entityType: "adjustment_txn_entry",
                description: payload.remark,
                orgId: req.orgId,
                createdBy: req.me.id,
                createdAt: currentTime,
                updatedAt: currentTime,
            };
            console.log('Adjustment Txn reason record: ', insertData);

            const insertRemarkResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("remarks_master");

            if(payload.subId == TxnSubTypes.ReceiveWasteFromAdjustmentMinusTxn){
                //  Also add Remark for Waste txn
                let insertData = {
                    entityId: insertedRecords[1].id,
                    entityType: "adjustment_txn_entry",
                    description: payload.remark,
                    orgId: req.orgId,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('Adjustment Txn reason record: ', insertData);

                const insertRemarkResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");
            }
            else
            if(payload.subId == TxnSubTypes.AdjustmentStoreTxn){
                //  Also add Remark for Store Adjustment txn
                let insertData = {
                    entityId: insertedRecords[1].id,
                    entityType: "adjustment_txn_entry",
                    description: payload.remark,
                    orgId: req.orgId,
                    createdBy: req.me.id,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('Adjustment Txn reason record: ', insertData);

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
                record: insertedRecords,
            },
            message: 'Adjustment added successfully.'
        });
    } catch (err) {
        console.log("[controllers][inventories][addAdjustment] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addAdjustment;

/**
 */

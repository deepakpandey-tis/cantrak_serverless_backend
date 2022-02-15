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

const addAdjustment = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            licenseId: Joi.string().required(),
            date: Joi.date().required(),
            itemCategoryId: Joi.string().required(),
            itemId: Joi.string().required(),
            specieId: Joi.string().allow(null).required(),
            strainId: Joi.string().allow(null).required(),
            umId: Joi.string().required(),
            storageLocationId: Joi.string().required(),
            expiryDate: Joi.date().allow(null).required(),
            lotNo: Joi.string().required(),
            quantity: Joi.number().required(),
            remark: Joi.string().required(),
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

            let currentTime = new Date().getTime();

            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                txnType: payload.quantity > 0 ? TxnTypes.AdjustmentAdd : TxnTypes.AdjustmentMinus,
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

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedRecord = insertResult[0];

            //  Mandatory reason
            insertData = {
                entityId: insertedRecord.id,
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

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
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

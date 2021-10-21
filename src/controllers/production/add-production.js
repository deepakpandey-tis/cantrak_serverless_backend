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
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueForProduction: 54,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

const addProduction = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedIssueRecord = [];
        let insertedReceiveRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            productionOn: Joi.date().required(),
            processId: Joi.string().required(),
            itemCategoryId: Joi.string().required(),
            itemId: Joi.string().required(),
            umId: Joi.string().required(),
            storageLocationId: Joi.string().required(),
            specieId: Joi.string().allow(null).allow("").optional(),
            strainId: Joi.string().allow(null).allow("").optional(),
            itemLotNo: Joi.string().required(),
            quantity: Joi.number().required(),
            outputItems: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][production][addProduction]: JOi Result",
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
                processId: payload.processId,
                productionOn: new Date(payload.productionOn).getTime(),
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                umId: payload.umId,
                storageLocationId: payload.storageLocationId,
                specieId: payload.specieId,
                strainId: payload.strainId,
                itemLotNo: payload.itemLotNo,
                quantity: payload.quantity,

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("production_lots");

            insertedRecord = insertResult[0];


            // Issue Txn
            insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                txnType: TxnTypes.IssueForProduction,
                date: new Date(payload.productionOn).getTime(),
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                lotNo: payload.itemLotNo,
                specieId: payload.specieId,
                strainId: payload.strainId,
                quantity: (payload.quantity * -1),
                umId: payload.umId,
                storageLocationId: payload.storageLocationId,
                productionLotId: insertedRecord.id,
                lotNo: payload.itemLotNo,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('issue txn insert record: ', insertData);

            insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedIssueRecord = insertResult[0];

            // Receive Items
            let item;
            let itemRecNo;

            itemRecNo = 0;
            for (let rec of payload.outputItems) {
                item = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.ReceiveFromProduction,
                    date: new Date(payload.productionOn).getTime(),
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: payload.specieId,
                    strainId: payload.strainId,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    expiryDate: new Date(rec.expiryDate).getTime(),
                    quality: rec.quality,
                    storageLocationId: rec.storageLocationId,
                    productionLotId: insertedRecord.id,
                    lotNo: insertedRecord.lotNo,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('item: ', item);

                itemRecNo += 1;
                const insertResult = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedReceiveRecords[itemRecNo] = insertResult[0];
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                inputItem: insertedIssueRecord,
                outputItems: insertedReceiveRecords
            },
            message: 'Production added successfully.'
        });
    } catch (err) {
        console.log("[controllers][production][addProduction] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addProduction;

/**
 */

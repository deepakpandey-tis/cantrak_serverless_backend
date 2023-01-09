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
    ReceiveWaste: 23,                          // Inventory option
    ReceiveFromProduction: 24,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueForProduction: 54,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};
 */

const addProduction = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedIssueRecords = [];
        let insertedReceiveRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            productionOn: Joi.date().required(),
            processId: Joi.string().required(),
            fromHarvestLot: Joi.bool().required(),
            // itemCategoryId: Joi.string().required(),
            // itemId: Joi.string().required(),
            // umId: Joi.string().required(),
            // storageLocationId: Joi.string().required(),
            // specieId: Joi.string().allow(null).allow("").optional(),
            // strainId: Joi.string().allow(null).allow("").optional(),
            // itemLotNo: Joi.string().required(),
            // itemLotExpiryDate: Joi.date().allow(null).required(),
            // quantity: Joi.number().required(),
            inputItems: Joi.array().required(),
            outputItems: Joi.array().required(),
            refNo: Joi.string().allow([null, '']).required(),
            refDate: Joi.date().allow([null]).optional(),
            additionalAttributes: Joi.array().required(),
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
                fromHarvestLot: payload.fromHarvestLot,
                // itemCategoryId: payload.itemCategoryId,
                // itemId: payload.itemId,
                // umId: payload.umId,
                // storageLocationId: payload.storageLocationId,
                // specieId: payload.specieId,
                // strainId: payload.strainId,
                // itemLotNo: payload.itemLotNo,
                // quantity: payload.quantity,
                refNo: payload.refNo,
                refDate: payload.refDate ? new Date(payload.refDate).getTime() : null,
                additionalAttributes: payload.additionalAttributes,

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('production_lots rec: ', insertData);

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("production_lots");

            insertedRecord = insertResult[0];

/* Provision on multiple input items given
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
                expiryDate: payload.itemLotExpiryDate,
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

            insertedIssueRecords = insertResult[0];
 */

            // Issue Items
            let item;
            let itemRecNo;
            let specieId, strainId;

            specieId = 0;
            strainId = 0;
            itemRecNo = 0;

/*             for (let rec of payload.inputItems) {
                if(specieId == 0 && rec.specieId != 0){
                    //  save ids to set in output item
                    specieId = rec.specieId;
                    strainId = rec.strainId;
                }

                item = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.IssueForProduction,
                    date: new Date(payload.productionOn).getTime(),
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: rec.specieId,
                    strainId: rec.strainId,
                    quantity: (rec.quantity * -1),
                    umId: rec.umId,
                    expiryDate: rec.expiryDate,
                    // quality: rec.quality,
                    storageLocationId: rec.storageLocationId,
                    productionLotId: insertedRecord.id,
                    lotNo: rec.lotNo,
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

                insertedIssueRecords[itemRecNo] = insertResult[0];
            }
 */

            for (const rec of payload.inputItems) {
                for (const lot of rec.lotNos) {
                    if(+lot.quantity == 0){
                        //  Ignore
                        continue;
                    }

                    if(specieId == 0 && lot.specieId != 0){
                        //  save ids to set in output item
                        specieId = lot.specieId;
                        strainId = lot.strainId;
                    }

                    item = {
                        orgId: orgId,
                        companyId: payload.companyId,
                        txnType: TxnTypes.IssueForProduction,
                        date: new Date(payload.productionOn).getTime(),
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        specieId: lot.specieId,
                        strainId: lot.strainId,
                        quantity: (+lot.quantity * -1),
                        umId: rec.umId,
                        expiryDate: lot.expiryDate,
                        // quality: rec.quality,
                        storageLocationId: lot.storageLocationId,
                        productionLotId: insertedRecord.id,
                        lotNo: lot.lotNo,

                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('item: ', item);

                    const insertResult = await knex
                        .insert(item)
                        .returning(["*"])
                        .transacting(trx)
                        .into("item_txns");
    
                    insertedIssueRecords[itemRecNo] = insertResult[0];
                    itemRecNo += 1;
    
                }
            }

            // Receive Items
            // let item;
            let itemReceiveNo;

            itemReceiveNo = 0;
            for (let rec of payload.outputItems) {
                item = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.ReceiveFromProduction,
                    date: new Date(payload.productionOn).getTime(),
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: specieId,
                    strainId: strainId,
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

                const insertResult = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedReceiveRecords[itemReceiveNo] = insertResult[0];
                itemReceiveNo += 1;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Production,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} produced lot '${insertedRecord.lotNo}' containing ${itemReceiveNo} item(s) on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                inputItems: insertedIssueRecords,
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
 * 2021/11/09 ds  Bug: Input item lot expiry date not saved in issue txn
 *                Resolution: fixed
 */

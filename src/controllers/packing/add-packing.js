const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const addPacking = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedIssueRecords = [];
        let insertedReceiveRecords = [];
        let insertedLossRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            packingOn: Joi.date().required(),
            inputItems: Joi.array().required(),
            outputItems: Joi.array().required(),
            outputWastes: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][packing][addPacking]: JOi Result",
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
                packingOn: new Date(payload.packingOn).getTime(),

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('packing_lots rec: ', insertData);

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("packing_lots");

            insertedRecord = insertResult[0];

            // Issue Items
            let item;
            let itemRecNo;
            let specieId, strainId;

            specieId = 0;
            strainId = 0;
            itemRecNo = 0;

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
                        txnType: TxnTypes.IssueForPacking,
                        date: new Date(payload.packingOn).getTime(),
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        specieId: lot.specieId,
                        strainId: lot.strainId,
                        quantity: (+lot.quantity * -1),
                        umId: rec.umId,
                        expiryDate: lot.expiryDate,
                        // quality: rec.quality,
                        storageLocationId: lot.storageLocationId,
                        packingLotId: insertedRecord.id,
                        lotNo: lot.lotNo,
                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('issue item: ', item);

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
                    txnType: TxnTypes.ReceiveFromPacking,
                    date: new Date(payload.packingOn).getTime(),
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: specieId,
                    strainId: strainId,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    expiryDate: new Date(rec.expiryDate).getTime(),
                    quality: rec.quality,
                    storageLocationId: rec.storageLocationId,
                    packingLotId: insertedRecord.id,
                    packingWeight: rec.packingWeight,
                    lotNo: insertedRecord.lotNo,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('receive item: ', item);

                const insertResult = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedReceiveRecords[itemReceiveNo] = insertResult[0];
                itemReceiveNo += 1;
            }

            // Packing Loss Items
            let itemLossNo;

            itemLossNo = 0;
            for (let rec of payload.outputWastes) {
                if(+rec.packingWeight == 0){
                    //  Ignore
                    continue;
                }

                item = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    txnType: TxnTypes.PackingLoss,
                    date: new Date(payload.packingOn).getTime(),
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: specieId,
                    strainId: strainId,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    storageLocationId: rec.storageLocationId,
                    packingLotId: insertedRecord.id,
                    packingWeight: rec.packingWeight,
                    lotNo: insertedRecord.lotNo,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('packing loss item: ', item);

                const insertResult = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedLossRecords[itemLossNo] = insertResult[0];
                itemLossNo += 1;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Packing,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} packing lot '${insertedRecord.lotNo}' containing ${itemReceiveNo} item(s) on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
                outputItems: insertedReceiveRecords,
                lossItems: insertedLossRecords
            },
            message: 'Packing added successfully.'
        });
    } catch (err) {
        console.log("[controllers][packing][addPacking] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addPacking;

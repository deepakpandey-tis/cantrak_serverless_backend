const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

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

const importItemFromSupplier = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const {itemCategoryId, data} = req.body;

/*         for(let rec of data){
            console.log('rec: ', rec);
        }
 */
        let insertedRecord = [];
        let insertedSupplier = [];
        let insertedRecNo = 0;

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            let insertData;

            insertedRecNo = 0;
            for(let rec of data){
                insertData = {
                    orgId: orgId,
                    companyId: rec.companyId,
                    txnType: TxnTypes.ReceiveFromSupplier,
                    date: new Date(rec.date).getTime(),
                    itemCategoryId: itemCategoryId,
                    itemId: rec.itemId,
                    imported: rec.imported,
                    specieId: rec.specieId,
                    strainId: rec.strainId,
                    quantity: rec.quantity,
                    umId: rec.umId,
                    storageLocationId: rec.storageLocationId,
                    lotNo: rec.lotNo,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('txn insert record: ', insertData);

                const insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txns");

                insertedRecord[insertedRecNo] = insertResult[0];

                insertData = {
                    orgId: orgId,
                    companyId: rec.companyId,
                    itemTxnId: insertedRecord[insertedRecNo].id,
                    supplierId: rec.supplierId,
                    lotNo: rec.supplierLotNo,
                    internalCode: rec.supplierInternalCode,
                    licenseNo: rec.supplierLicenseNo,
                    quality: rec.supplierQuality,
                };
                console.log('txn supplier insert record: ', insertData);

                const insertSupplier = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("item_txn_suppliers");

                insertedSupplier[insertedRecNo] = insertSupplier[0];
                insertedRecNo += 1;
            }

            let entity;
            let entityType;
            if(itemCategoryId == ItemCategory.RawMaterial){
                entity = 'Raw Material';
                entityType = EntityTypes.RawMaterial;
            }
            else
            if(itemCategoryId == ItemCategory.Product){
                entity = 'Product';
                entityType = EntityTypes.Product;
            }
            else
            if(itemCategoryId == ItemCategory.FinishedGoods){
                entity = 'Finished Good';
                entityType = EntityTypes.FinishedGood;
            }
            else
            if(itemCategoryId == ItemCategory.WasteMaterial){
                entity = 'Waste Material';
                entityType = EntityTypes.WasteMaterial;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord[0].orgId,
                companyId: insertedRecord[0].companyId,
                entityId: insertedRecord[0].id,
                entityTypeId: entityType,
                entityActionId: EntityActions.Import,
                description: `${req.me.name} imported ${insertedRecNo} ${entity} items on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                txn: insertedRecord,
                supplier: insertedSupplier
            },
            message: `${insertedRecNo} items imported successfully.`
        });
    } catch (err) {
        console.log("[controllers][inventories][importItemFromSupplier] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = importItemFromSupplier;

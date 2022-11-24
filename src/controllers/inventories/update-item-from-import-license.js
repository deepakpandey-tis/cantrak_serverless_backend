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

const updateItemFromImportLicense = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedSupplier = [];

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            companyId: Joi.number().required(),
            date: Joi.date().required(),
            licenseId: Joi.number().integer().required(),
            licenseNarId: Joi.number().required(),
            licenseNarItemId: Joi.number().required(),
            itemCategoryId: Joi.number().integer().required(),
            itemId: Joi.number().required(),
            imported: Joi.bool().default(false).optional(),
            quantity: Joi.number().required(),
            umId: Joi.number().required(),
            specieId: Joi.number().required(),
            strainId: Joi.number().required(),
            storageLocationId: Joi.number().required(),
            itemTxnSupplierId: Joi.number().required(),
            supplierId: Joi.number().required(),
            refNo: Joi.string().allow([null, '']).required(),
            refDate: Joi.date().allow([null]).optional(),
            additionalAttributes: Joi.array().required(),
            itemName: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][inventories][updateItemFromImportLicense]: JOi Result",
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
                companyId: payload.companyId,
                txnType: TxnTypes.ReceiveFromSupplier,
                date: new Date(payload.date).getTime(),
                licenseId: payload.licenseId,
                licenseNarId: payload.licenseNarId,
                licenseNarItemId: payload.licenseNarItemId,
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                imported: payload.imported,
                specieId: payload.specieId,
                strainId: payload.strainId,
                quantity: payload.quantity,
                umId: payload.umId,
                storageLocationId: payload.storageLocationId,
                refNo: payload.refNo,
                refDate: payload.refDate ? new Date(payload.refDate).getTime() : null,
                additionalAttributes: payload.additionalAttributes,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('txn update record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedRecord = insertResult[0];

            insertData = {
                companyId: payload.companyId,
                itemTxnId: insertedRecord.id,
                supplierId: payload.supplierId,
                // lotNo: payload.supplierLotNo,
                // internalCode: payload.supplierInternalCode,
                // licenseNo: payload.supplierLicenseNo,
                // quality: payload.supplierQuality,
            };
            console.log('txn supplier insert record: ', insertData);

            const insertSupplier = await knex
                .update(insertData)
                .where({ id: payload.itemTxnSupplierId, itemTxnId: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into("item_txn_suppliers");

            insertedSupplier = insertSupplier[0];

            let entity;
            let entityType;
            if(insertedRecord.itemCategoryId == ItemCategory.RawMaterial){
                entity = `imported raw material '${payload.itemName}'`;
                entityType = EntityTypes.RawMaterial;
            }
            else
            if(insertedRecord.itemCategoryId == ItemCategory.Product){
                entity = `imported product '${payload.itemName}'`;
                entityType = EntityTypes.Product;
            }
            else
            if(insertedRecord.itemCategoryId == ItemCategory.FinishedGoods){
                entity = `imported finished good '${payload.itemName}'`;
                entityType = EntityTypes.FinishedGood;
            }
            else
            if(insertedRecord.itemCategoryId == ItemCategory.WasteMaterial){
                entity = `imported waste material '${payload.itemName}'`;
                entityType = EntityTypes.WasteMaterial;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: entityType,
                entityActionId: EntityActions.Edit,
                description: `${req.me.name} changed ${entity} '${insertedRecord.lotNo}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
            message: 'Item from import license updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][inventories][updateItemFromImportLicense] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateItemFromImportLicense;

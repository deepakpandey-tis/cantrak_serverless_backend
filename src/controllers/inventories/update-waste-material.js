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

const updateWasteMaterial = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            companyId: Joi.string().required(),
            date: Joi.date().required(),
            itemCategoryId: Joi.number().integer().required(),
            itemId: Joi.string().required(),
            quantity: Joi.number().required(),
            umId: Joi.string().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            storageLocationId: Joi.string().required(),
            refNo: Joi.string().allow([null, '']).required(),
            refDate: Joi.date().allow([null]).optional(),
            additionalAttributes: Joi.array().required(),
            itemName: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][inventories][updateWasteMaterial]: JOi Result",
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
                txnType: TxnTypes.ReceiveWaste,
                date: new Date(payload.date).getTime(),
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
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
            console.log('waste txn update record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedRecord = insertResult[0];

            let entity;
            let entityType;
            if(insertedRecord.itemCategoryId == ItemCategory.RawMaterial){
                entity = `raw material waste of '${payload.itemName}'`;
                entityType = EntityTypes.RawMaterial;
            }
            else
            if(insertedRecord.itemCategoryId == ItemCategory.Product){
                entity = `product waste of '${payload.itemName}'`;
                entityType = EntityTypes.Product;
            }
            else
            if(insertedRecord.itemCategoryId == ItemCategory.FinishedGoods){
                entity = `finished good waste of '${payload.itemName}'`;
                entityType = EntityTypes.FinishedGood;
            }
            else
            if(insertedRecord.itemCategoryId == ItemCategory.WasteMaterial){
                entity = `waste material of '${payload.itemName}'`;
                entityType = EntityTypes.WasteMaterial;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: entityType,
                entityActionId: EntityActions.Edit,
                description: `${req.me.name} changed ${entity} '${insertedRecord.lotNo}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
            },
            message: 'Waste material updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][inventories][updateWasteMaterial] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateWasteMaterial;

/**
 */

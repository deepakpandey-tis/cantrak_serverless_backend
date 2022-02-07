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

const addItemFromSupplier = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedSupplier = [];

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            date: Joi.date().required(),
            itemCategoryId: Joi.number().integer().required(),
            itemId: Joi.number().required(),
            imported: Joi.bool().default(false).optional(),
            quantity: Joi.number().required(),
            umId: Joi.number().required(),
            specieId: Joi.number().required(),
            strainId: Joi.number().required(),
            storageLocationId: Joi.number().required(),
            supplierId: Joi.number().required(),
            supplierLotNo: Joi.string().allow([null, '']).required(),
            supplierInternalCode: Joi.string().allow([null, '']).required(),
            supplierLicenseNo: Joi.string().allow([null, '']).required(),
            supplierQuality: Joi.string().allow([null, '']).required(),
            refNo: Joi.string().allow([null, '']).required(),
            refDate: Joi.date().allow([null]).optional(),
            additionalAttributes: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][inventories][addItemFromSupplier]: JOi Result",
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
                txnType: TxnTypes.ReceiveFromSupplier,
                date: new Date(payload.date).getTime(),
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

            insertedRecord = insertResult[0];

            insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                itemTxnId: insertedRecord.id,
                supplierId: payload.supplierId,
                lotNo: payload.supplierLotNo,
                internalCode: payload.supplierInternalCode,
                licenseNo: payload.supplierLicenseNo,
                quality: payload.supplierQuality,
            };
            console.log('txn supplier insert record: ', insertData);

            const insertSupplier = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txn_suppliers");

            insertedSupplier = insertSupplier[0];

            trx.commit;
        });

        return res.status(200).json({
            data: {
                txn: insertedRecord,
                supplier: insertedSupplier
            },
            message: 'Item from supplier added successfully.'
        });
    } catch (err) {
        console.log("[controllers][inventories][addItemFromSupplier] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addItemFromSupplier;

/**
 * 2021/11/29:  column imported added
 */

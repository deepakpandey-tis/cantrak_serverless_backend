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
    IssueForSale: 55,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

const addInvoice = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedInvoiceItemRecords = [];
        let insertedItemRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            licenseId: Joi.string().required(),
            invoiceOn: Joi.date().required(),
            customerId: Joi.string().required(),
            customerLicense: Joi.string().allow('').allow(null).required(),
            customerPo: Joi.string().allow('').allow(null).required(),
            creditDays: Joi.number().allow(0).required(),
            dueDate: Joi.date().required(),
            invoiceItems: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][invoice][addInvoice]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        console.log('add invoice payload: ', payload);
        
        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            //  Calculate Invoice Amount
            let invoiceCost = 0;
            let invoiceVat = 0;
            let invoiceAmount = 0;
            for (let rec of payload.invoiceItems){
                invoiceCost += rec.cost;
                invoiceVat += rec.vat;
                invoiceAmount += rec.amount;
            }
            console.log('invoice amount: ', invoiceAmount);

            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                licenseId: payload.licenseId,
                invoiceOn: new Date(payload.invoiceOn).getTime(),
                invoiceCost: invoiceCost,
                invoiceVat: invoiceVat,
                invoiceAmount: invoiceAmount,
                creditDays: payload.creditDays,
                dueDate: new Date(payload.dueDate).getTime(),
                customerId: payload.customerId,
                customerLicense: payload.customerLicense,
                customerPo: payload.customerPo,

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("invoices");

            insertedRecord = insertResult[0];

            // Invoice Items
            let item;
            let recNo;

            recNo = 0;
            for (let rec of payload.invoiceItems){
                item = {
                    orgId: orgId,
                    invoiceId: insertedRecord.id,
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    umId: rec.umId,
                    quantity: rec.quantity,
                    unitPrice: rec.unitPrice,
                    chargeVAT: rec.chargeVAT,
                    cost: rec.cost,
                    vat: rec.vat,
                    amount: rec.amount,
                    gtin: rec.gtin,
                    lotNos: JSON.stringify(rec.lotNos),

                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('invoice item: ', item);

                recNo += 1;
                const insertResult = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("invoice_items");

                insertedInvoiceItemRecords[recNo] = insertResult[0];

                //  Issue Item Txn
                let itemNo;
                let txnId;

                txnId = null;
                itemNo = 0;
                for (let lotRec of rec.lotNos){
                    item = {
                        orgId: orgId,
                        companyId: payload.companyId,
                        txnType: TxnTypes.IssueForSale,
                        txnId: txnId,
                        date: new Date(payload.invoiceOn).getTime(),
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        specieId: lotRec.specieId,
                        strainId: lotRec.strainId,
                        quantity: lotRec.quantity * -1,
                        umId: rec.umId,
                        expiryDate: lotRec.expiryDate,
                        // quality: rec.quality,
                        storageLocationId: lotRec.storageLocationId,
                        licenseId: payload.licenseId,
                        invoiceId: insertedRecord.id,
                        lotNo: lotRec.lotNo,
                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('item: ', item);

                    itemNo += 1;
                    const insertResult = await knex
                        .insert(item)
                        .returning(["*"])
                        .transacting(trx)
                        .into("item_txns");
    
                    insertedItemRecords[itemNo] = insertResult[0];
                    if(itemNo == 1){
                        txnId = insertedItemRecords[itemNo].txnId;
                    }
    
                }
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                invoiceItems: insertedInvoiceItemRecords,
            },
            message: 'Invoice added successfully.'
        });
    } catch (err) {
        console.log("[controllers][invoice][addInvoice] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addInvoice;

/**
 */

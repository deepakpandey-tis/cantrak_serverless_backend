const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const updateInvoice = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;
        let insertedRecord = [];
        let insertedInvoiceChargeRecords = [];
        let insertedInvoiceItemRecords = [];
        let insertedItemRecords = [];
        var deletedRecs;

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            companyId: Joi.string().required(),
            licenseId: Joi.number().allow(null).optional(),
            invoiceOn: Joi.date().required(),
            invoiceNo: Joi.string().required(),
            customerId: Joi.string().required(),
            customerLicense: Joi.string().allow('').allow(null).required(),
            customerPo: Joi.string().allow('').allow(null).required(),
            creditDays: Joi.number().allow(0).required(),
            taxId: Joi.string().required(),
            subTotal: Joi.number().required(),
            taxTotal: Joi.number().allow(0).required(),
            grandTotal: Joi.number().required(),
            dueDate: Joi.date().required(),
            invoiceItems: Joi.array().required(),
            invoiceItemsDeleted: Joi.array().required(),
            invoiceCharges: Joi.array().required(),
            customerName: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][invoice][updateInvoice]: JOi Result",
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

            //  getting existing txnId of issued items from item_txn table
            sqlStr = `SELECT DISTINCT coalesce("txnId", 0) "txnId" FROM item_txns WHERE "orgId" = ${orgId} AND "companyId" = ${payload.companyId} AND "invoiceId" = ${payload.id}`;
            var selectedRecs = await knex.raw(sqlStr);

            let existingTxnId;
            if(selectedRecs.rows.length){
                existingTxnId = selectedRecs.rows[0].txnId;
            }
            else {
                existingTxnId = null;
            }
            console.log('existingTxnId: ', existingTxnId);

            //  Delete invoice existing charges
            sqlStr = `DELETE FROM invoice_charges WHERE "orgId" = ${orgId} AND "invoiceId" = ${payload.id}`;
            deletedRecs = await knex.raw(sqlStr).transacting(trx);
            // console.log('deleted invoice_charges recs: ', deletedRecs);

            //  Delete invoice existing items
            sqlStr = `DELETE FROM invoice_items WHERE "orgId" = ${orgId} AND "invoiceId" = ${payload.id}`;
            deletedRecs = await knex.raw(sqlStr).transacting(trx);
            // console.log('deleted invoice_items recs: ', deletedRecs);

            //  Reverse deleted Invoiced Items' Txns in item_txns table
            let recNo;
            let item;
            let itemNo;
            let txnId;

            let dt = new Date(payload.invoiceOn);
            let invoiceOnStr = dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + dt.getFullYear()

            recNo = 0;
            txnId = existingTxnId ? existingTxnId : null;
            itemNo = 0;
            for (let rec of payload.invoiceItemsDeleted){

                recNo += 1;
                for (let lotRec of rec.lotNos){
                    item = {
                        orgId: orgId,
                        companyId: payload.companyId,
                        txnType: TxnTypes.ReceiveFromSaleCancelled,
                        txnId: txnId,
                        date: new Date(payload.invoiceOn).getTime(),
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        specieId: lotRec.specieId,
                        strainId: lotRec.strainId,
                        quantity: lotRec.quantity,
                        umId: rec.umId,
                        expiryDate: lotRec.expiryDate,
                        // quality: rec.quality,
                        storageLocationId: lotRec.storageLocationId,
                        licenseId: payload.licenseId,
                        invoiceId: payload.id,
                        lotNo: lotRec.lotNo,
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
    
                    insertedItemRecords[itemNo] = insertResult[0];
                    if(itemNo == 0){
                        txnId = insertedItemRecords[itemNo].txnId;
                    }
                    itemNo += 1;

                    //  Invoice item deleted Remark
                    let insertData = {
                        entityId: insertedItemRecords[0].id,
                        entityType: "invoice_item_cancelled",
                        description: `${req.me.name} deleted item from invoice '${payload.invoiceNo}' dated ${invoiceOnStr} of '${payload.customerName}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
                        orgId: orgId,
                        createdBy: userId,
                        createdAt: currentTime,
                        updatedAt: currentTime,
                    };
                    console.log('Invoice item deleted reason record: ', insertData);

                    const insertItemTxnRemarkResult = await knex
                        .insert(insertData)
                        .returning(["*"])
                        .transacting(trx)
                        .into("remarks_master");
                }
            }

            //  update invoice
            let insertData = {
                taxId: payload.taxId,
                licenseId: payload.licenseId,
                invoiceOn: new Date(payload.invoiceOn).getTime(),
                invoiceCost: payload.subTotal,
                invoiceVat: payload.taxTotal,
                invoiceAmount: payload.grandTotal,
                creditDays: payload.creditDays,
                dueDate: new Date(payload.dueDate).getTime(),
                customerId: payload.customerId,
                customerLicense: payload.customerLicense,
                customerPo: payload.customerPo,

                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into("invoices");

            insertedRecord = insertResult[0];

            // Invoice Charges
            let charge;

            recNo = 0;
            for (let rec of payload.invoiceCharges){
                charge = {
                    orgId: orgId,
                    invoiceId: insertedRecord.id,
                    chargeId: rec.chargeId,
                    calculationUnit: rec.calculationUnit,
                    rate: rec.rate,
                    totalHours: rec.totalHours,
                    amount: rec.rate * rec.totalHours,

                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('invoice charge: ', charge);

                const insertResult = await knex
                    .insert(charge)
                    .returning(["*"])
                    .transacting(trx)
                    .into("invoice_charges");

                insertedInvoiceChargeRecords[recNo] = insertResult[0];
                recNo += 1;
            }

            // Invoice Items
            txnId = existingTxnId ? existingTxnId : null;
            itemNo = 0;
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
                    // chargeVAT: rec.chargeVAT,
                    // cost: rec.cost,
                    // vat: rec.vat,
                    // amount: rec.amount,
                    chargeVAT: false,
                    cost: rec.quantity * rec.unitPrice,
                    vat: 0,
                    amount: rec.quantity * rec.unitPrice,       // cost + vat
                    gtin: rec.gtin,
                    lotNos: JSON.stringify(rec.lotNos),

                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('invoice item: ', item);

                const insertResult = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("invoice_items");

                insertedInvoiceItemRecords[recNo] = insertResult[0];
                recNo += 1;

                if(rec.existingItem){
                    //  an existing item, do not generate issue txn
                    continue ;
                }
                
                //  Issue Item Txn
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

                    const insertResult = await knex
                        .insert(item)
                        .returning(["*"])
                        .transacting(trx)
                        .into("item_txns");
    
                    insertedItemRecords[itemNo] = insertResult[0];
                    if(itemNo == 0){
                        txnId = insertedItemRecords[itemNo].txnId;
                    }
                    itemNo += 1;
    
                }
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Invoice,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} changed invoice '${payload.invoiceNo}' of '${payload.customerName}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
                invoiceItems: insertedInvoiceItemRecords,
                invoiceCharges: insertedInvoiceChargeRecords,
            },
            message: 'Invoice updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][invoice][updateInvoice] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateInvoice;

/**
 */

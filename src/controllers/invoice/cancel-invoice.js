const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const cancelInvoice = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlStr;
        let insertedRecord = [];
        let insertedItemRecords = [];

        const payload = req.body;
        const schema = Joi.object().keys({
            id: Joi.string().required(),
            companyId: Joi.string().required(),
            customerName: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][invoice]cancelInvoice: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let cancelOn = new Date();
    
        //  Get invoice detail
        sqlStr = `SELECT i.*, to_char(to_timestamp(i."invoiceOn"/1000 )::date, 'dd/mm/yyyy') "invoiceOnStr", u2."name" "createdByName"
        , (SELECT json_agg(row_to_json(ii.*)) FROM invoice_items ii WHERE i."orgId" = ii."orgId" and i.id = ii."invoiceId") "invoiceItems"
        , (SELECT json_agg(row_to_json(ic.*)) FROM invoice_charges ic WHERE i."orgId" = ic."orgId" and i.id = ic."invoiceId") "invoiceCharges"
        FROM invoices i, users u2
        WHERE i.id = ${payload.id} and i."orgId" = ${orgId} and i."companyId" = ${payload.companyId} and i."createdBy" = u2.id
        `;

        var selectedRecs = await knex.raw(sqlStr);
        if(selectedRecs.rows[0].id){
        
            await knex.transaction(async (trx) => {

                let insertData;

                let insertResult = await knex
                    .update({ isCancelled: true, updatedBy: userId, updatedAt: currentTime })
                    .where({ id: payload.id, orgId: req.orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into("invoices");

                insertedRecord = insertResult[0];

                //  Reverse Invoiced Items' Txns in item_txns table
                let recNo;
                let item;
                let itemNo;
                let txnId;

                recNo = 0;
                for (let rec of selectedRecs.rows[0].invoiceItems){

                    recNo += 1;
                    txnId = null;
                    itemNo = 0;
                    for (let lotRec of rec.lotNos){
                        item = {
                            orgId: orgId,
                            companyId: payload.companyId,
                            txnType: TxnTypes.ReceiveFromSaleCancelled,
                            txnId: txnId,
                            date: new Date(cancelOn.getFullYear(), cancelOn.getMonth(), cancelOn.getDate()).getTime(),      //  Remove time
                            itemCategoryId: rec.itemCategoryId,
                            itemId: rec.itemId,
                            specieId: lotRec.specieId,
                            strainId: lotRec.strainId,
                            quantity: lotRec.quantity,
                            umId: rec.umId,
                            expiryDate: lotRec.expiryDate,
                            // quality: rec.quality,
                            storageLocationId: lotRec.storageLocationId,
                            licenseId: selectedRecs.rows[0].licenseId,
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
                    }
                }

                //  Cancelled Invoice Remark
                insertData = {
                    entityId: insertedItemRecords[0].id,
                    entityType: "invoice_cancelled",
                    description: `${req.me.name} cancelled invoice '${selectedRecs.rows[0].invoiceNo}' dated ${selectedRecs.rows[0].invoiceOnStr} of '${payload.customerName}' containing ${recNo} item(s) on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
                    orgId: orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('Invoice cancelled reason record: ', insertData);

                const insertItemTxnRemarkResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");

                //  Cancelled Invoice Remark
                insertData = {
                    entityId: payload.id,
                    entityType: "invoice_cancelled",
                    description: `${req.me.name} cancelled invoice '${selectedRecs.rows[0].invoiceNo}' dated ${selectedRecs.rows[0].invoiceOnStr} of '${payload.customerName}' containing ${recNo} item(s) on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
                    orgId: orgId,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedAt: currentTime,
                };
                console.log('Invoice cancelled reason record: ', insertData);

                const insertCancelInvoiceRemarkResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .transacting(trx)
                    .into("remarks_master");


                //  Log user activity
                let userActivity = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    entityId: payload.id,
                    entityTypeId: EntityTypes.Invoice,
                    entityActionId: EntityActions.Cancel,
                    description: `${req.me.name} cancelled invoice '${selectedRecs.rows[0].invoiceNo}' dated ${selectedRecs.rows[0].invoiceOnStr} of '${payload.customerName}' containing ${recNo} item(s) on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
                },
                message: 'Invoice cancelled successfully.'
            });
        }
    } catch (err) {
        console.log("[controllers][invoice][cancelInvoice] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = cancelInvoice;

/**
 */

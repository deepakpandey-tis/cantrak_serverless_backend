const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateLicense = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedItemRecords = [];

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            companyId: Joi.string().required(),
            number: Joi.string().required(),
            issuedOn: Joi.date().required(),
            expiredOn: Joi.date().required(),
            assignedPerson: Joi.string().required(),
            licenseTypeId: Joi.string().required(),
            licenseObjectiveIds: Joi.array().required(),
            items: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][licenses]updateLicense: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        // Check already exists
        /*
        const alreadyExists = await knexReader('licenses')
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][licenses][updateLicense]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "License already exist!" }
                ]
            });
        }
        */

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();
            let insertData = {
                companyId: payload.companyId,
                number: payload.number,
                issuedOn: new Date(payload.issuedOn).getTime(),
                expiredOn: new Date(payload.expiredOn).getTime(),
                assignedPerson: payload.assignedPerson,
                licenseTypeId: payload.licenseTypeId,
                licenseObjectiveIds: payload.licenseObjectiveIds,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('License update record: ', insertData);
    
            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: req.orgId })
                .returning(["*"])
                .into('licenses');
    
            insertedRecord = insertResult[0];

            let insertItem;
            let item;
            let itemRecNo;

            itemRecNo = 0;
            for (let rec of payload.items) {
                if(rec.id){
                    item = {
                        companyId: payload.companyId,
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        quantity: rec.quantity,
                        umId: rec.umId,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('item: ', item);

                    insertItem = await knex
                    .update(item)
                    .where({ id: rec.id, orgId: req.orgId })
                    .returning(["*"])
                    .transacting(trx)
                    .into('license_items');
                }
                else {
                    item = {
                        orgId: orgId,
                        companyId: payload.companyId,
                        licenseId: payload.id,
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        quantity: rec.quantity,
                        umId: rec.umId,
                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('item: ', item);

                    insertItem = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("license_items");
                }

                itemRecNo += 1;
                insertedItemRecords[itemRecNo] = insertItem[0];
            }
    
            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                items: insertedItemRecords
            },
            message: 'License updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][licenses][updateLicense] :  Error", err);
        if (err.code == 23505){            // unique_violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'License for Primary Holder, Sub Holder and Number already exists.' }]
            });
        }
        else{
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
        }
    }
}

module.exports = updateLicense;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const addLicenseNar = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedItemRecords = [];

        const schema = Joi.object().keys({
            licenseId: Joi.number().required(),
            supplierId: Joi.number().required(),
            permitNumber: Joi.string().required(),
            issuedOn: Joi.date().required(),
            expiredOn: Joi.date().required(),
            itemArray: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][licenses][addLicenseNar]: JOi Result",
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
                licenseId: payload.licenseId,
                permitNumber: payload.permitNumber,
                supplierId: payload.supplierId,
                issuedOn: new Date(payload.issuedOn).getTime(),
                expiredOn: new Date(payload.expiredOn).getTime(),
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('License insert record: ', insertData);
    
            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .into('license_nars');
    
            insertedRecord = insertResult[0];

            let item;
            let itemRecNo;

            itemRecNo = 0;
            for (let rec of payload.itemArray) {
                item = {
                    orgId: orgId,
                    licenseNarId: insertedRecord.id,
                    licenseItemId: rec.licenseItemId,
                    itemCategoryId: rec.itemCategoryId,
                    itemId: rec.itemId,
                    specieId: rec.specieId,
                    strainId: rec.strainId,
                    quantity: rec.quantity,
                    umId: rec.umId,
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
                    .into("license_nar_items");

                insertedItemRecords[itemRecNo] = insertResult[0];
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                items: insertedItemRecords
            },
            message: `License NAR added successfully.`
        });
    } catch (err) {
        console.log("[controllers][administration-features][licenses][addLicenseNar] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addLicenseNar;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const updateLicenseNar = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedItemRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            id: Joi.number().required(),
            licenseId: Joi.number().required(),
            supplierId: Joi.number().required(),
            permitNumber: Joi.string().required(),
            issuedOn: Joi.date().required(),
            expiredOn: Joi.date().required(),
            itemArray: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][controllers][licenses][addLicenseNar]: JOi Result",
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
        const alreadyExists = await knex("license_nars")
            .where('permitNumber', 'iLIKE', payload.permitNumber.trim())
            .where({ orgId: req.orgId, licenseId: payload.licenseId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][controllers][licenses][updateLicenseNar]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Permit Number already exist!" }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();
            let insertData = {
                permitNumber: payload.permitNumber,
                supplierId: payload.supplierId,
                issuedOn: new Date(payload.issuedOn).getTime(),
                expiredOn: new Date(payload.expiredOn).getTime(),
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('License NAR update record: ', insertData);
    
            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: req.orgId })
                .returning(["*"])
                .into('license_nars');
    
            insertedRecord = insertResult[0];

            let insertItem;
            let item;
            let itemRecNo;
            let itemRecNew, itemRecOld;

            itemRecNo = 0;
            itemRecNew = itemRecOld = 0;
            for (let rec of payload.itemArray) {
                if(rec.id){
                    item = {
                        licenseItemId: rec.licenseItemId,
                        itemCategoryId: rec.itemCategoryId,
                        itemId: rec.itemId,
                        specieId: rec.specieId,
                        strainId: rec.strainId,
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
                    .into('license_nar_items');

                    itemRecOld += 1;
                }
                else {
                    item = {
                        orgId: orgId,
                        licenseNarId: payload.id,
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

                    insertItem = await knex
                    .insert(item)
                    .returning(["*"])
                    .transacting(trx)
                    .into("license_nar_items");

                    itemRecNew += 1;
                }

                itemRecNo += 1;
                insertedItemRecords[itemRecNo] = insertItem[0];
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: payload.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.LicenseNar,
                entityActionId: EntityActions.Edit,
                description: `${req.me.name} changed license nar '${insertedRecord.permitNumber}' with ${itemRecOld} existing and ${itemRecNew} new items on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
                items: insertedItemRecords
            },
            message: `License NAR updated successfully.`
        });
    } catch (err) {
        console.log("[controllers][controllers][licenses][updateLicenseNar] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = updateLicenseNar;

/**
 */

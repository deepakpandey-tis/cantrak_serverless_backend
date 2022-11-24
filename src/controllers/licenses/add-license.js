const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
// const knexReader = require("../../../db/knex-reader");
const _ = require("lodash");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const addLicense = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = _.omit(req.body, ['selectedFiles']);
        const selectedFiles = req.body?.selectedFiles;

        let insertedRecord = [];
        let insertedItemRecords = [];

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            number: Joi.string().required(),
            revisionNumber: Joi.number().required(),
            issuedOn: Joi.date().required(),
            expiredOn: Joi.date().required(),
            assignedPerson: Joi.string().required(),
            licenseTypeId: Joi.number().required(),
            licenseObjectiveIds: Joi.array().required(),
            quantity: Joi.number().required(),
            items: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][controllers][licenses][addLicense]: JOi Result",
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
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][controllers][licenses][addLicense]: ",
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
                orgId: orgId,
                companyId: payload.companyId,
                number: payload.number,
                revisionNumber: payload.revisionNumber,
                issuedOn: new Date(payload.issuedOn).getTime(),
                expiredOn: new Date(payload.expiredOn).getTime(),
                assignedPerson: payload.assignedPerson,
                licenseTypeId: payload.licenseTypeId,
                licenseObjectiveIds: payload.licenseObjectiveIds,
                quantity: payload.quantity,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('License insert record: ', insertData);
    
            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .into('licenses');
    
            insertedRecord = insertResult[0];

            let item;
            let itemRecNo;
            let licanceId = insertedRecord.id;

            itemRecNo = 0;
            for (let rec of payload.items) {
                item = {
                    orgId: orgId,
                    companyId: payload.companyId,
                    licenseId: insertedRecord.id,
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
                    .into("license_items");

                insertedItemRecords[itemRecNo] = insertResult[0];
            }


            if(insertedRecord && insertedRecord?.id > 0){
                const Parallel = require("async-parallel");

                const deletedFiles = await knex.del().from('files').where({ "entityId": insertedRecord.id });

                await Parallel.map(selectedFiles, async (pd) => {

                    let insertDataForFiles = {
                        "entityId": licanceId,
                        "entityType": "licenses",
                        "s3Url": pd.s3Url,
                        title: pd.title,
                        "name": pd.name,
                        "orgId": orgId,
                        createdAt: currentTime,
                        updatedAt: currentTime
                    }

                    const insertResultForFiles = await knex
                        .insert(insertDataForFiles)
                        .transacting(trx)
                        .into("files");

                });
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.License,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added license '${insertedRecord.number}' and ${itemRecNo} license item(s) on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
            message: 'License added successfully.'
        });
    } catch (err) {
        console.log("[controllers][controllers][licenses][addLicense] :  Error", err);
        if (err.code == 23505){            // unique_violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'License for Assigned Person and Number already exists.' }]
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

module.exports = addLicense;

/**
 */

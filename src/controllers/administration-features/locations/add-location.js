const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const addLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedSubLocationRecords = [];
        let subLocationRecNo;

        const schema = Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string().allow("").required(),
            companyId: Joi.string().required(),
            subLocations: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][locations][addLocation]: JOi Result",
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
        const alreadyExists = await knexReader('locations')
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][administration-features][locations][addLocation]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Location already exist!" }
                ]
            });
        }

        /* 2022/03/21 Sub Growing Location part of Growing Location Form
                let currentTime = new Date().getTime();
                let insertData = {
                    orgId: orgId,
                    ...payload,
                    name: payload.name.trim(),
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('Location insert record: ', insertData);
        
                const insertResult = await knex
                    .insert(insertData)
                    .returning(["*"])
                    .into('locations');
        
                insertedRecord = insertResult[0];
         */

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                name: payload.name.trim(),
                description: payload.description,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('Location insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into('locations');

            insertedRecord = insertResult[0];

            // Sub Growing Locations
            let subLocation;

            subLocationRecNo = 0;
            for (let rec of payload.subLocations) {
                subLocation = {
                    orgId: orgId,
                    companyId: insertedRecord.companyId,
                    locationId: insertedRecord.id,
                    name: rec.name.trim(),
                    description: rec.description,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('sub location: ', subLocation);

                const insertResult = await knex
                    .insert(subLocation)
                    .returning(["*"])
                    .transacting(trx)
                    .into('sub_locations');

                insertedSubLocationRecords[subLocationRecNo] = insertResult[0];
                subLocationRecNo += 1;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.GrowingLocation,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added growing location '${insertedRecord.name}' and ${subLocationRecNo} sub growing location(s) on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                subLocations: insertedSubLocationRecords,
            },
            message: `Growing location with ${subLocationRecNo} sub growing location(s) added successfully.`
        });
    } catch (err) {
        console.log("[controllers][administration-features][locations][addLocation] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addLocation;

/**
 */

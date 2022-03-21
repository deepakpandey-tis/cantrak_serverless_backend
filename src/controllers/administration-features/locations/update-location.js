const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const updateLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let deletingSubLocationName = '';
        let insertedRecord = [];
        let insertedSubLocationRecords = [];
        let subLocationRecNo;

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            name: Joi.string().required(),
            description: Joi.string().allow("").required(),
            companyId: Joi.string().required(),
            subLocations: Joi.array().required(),
            deletedSubLocations: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][locations]updateLocation: JOi Result",
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
        const alreadyExists = await knexReader("locations")
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId })
            .whereNot({ id: payload.id });

        console.log(
            "[controllers][administration-features][locations][updateLocation]: ",
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
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Location update record: ', insertData);

        const insertResult = await knex
            .update(insertData)
            .where({ id: payload.id, orgId: req.orgId })
            .returning(["*"])
            .into("locations");

        insertedRecord = insertResult[0];
 */

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            // First delete sub growing locations
            for (let rec of payload.deletedSubLocations) {
                deletingSubLocationName = rec.name;
                const deleteResult = await knex('sub_locations')
                    .delete()
                    .where({ id: rec.id })
                    .returning(["*"])
                    .transacting(trx)
            }

            let insertData = {
                name: payload.name.trim(),
                description: payload.description,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('Location update record: ', insertData);

            const insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: req.orgId })
                .returning(["*"])
                .transacting(trx)
                .into("locations");

            insertedRecord = insertResult[0];

            // Sub Growing Locations
            let subLocation;

            subLocationRecNo = 0;
            for (let rec of payload.subLocations) {
                if(!rec.id){
                    // New sub growing location
                    subLocation = {
                        orgId: orgId,
                        companyId: payload.companyId,
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
                else {
                    // Existing sub growing location
                    subLocation = {
                        name: rec.name.trim(),
                        description: rec.description,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('existing sub location: ', subLocation);

                    const insertResult = await knex
                        .update(subLocation)
                        .where({ id: rec.id, orgId: req.orgId })
                        .returning(["*"])
                        .transacting(trx)
                        .into('sub_locations');

                    insertedSubLocationRecords[subLocationRecNo] = insertResult[0];
                    subLocationRecNo += 1;
                }
            }

            trx.commit;
        });

        return res.status(200).json({
            data: {
                record: insertedRecord,
                subLocations: insertedSubLocationRecords,
            },
            message: `Growing location with ${subLocationRecNo} sub growing location(s) updated successfully.`
        });
    } catch (err) {
        console.log("[controllers][administration-features][locations][updateLocation] :  Error", err);
        if (err.code == 23503){            // foreign key violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: `Sub growing location "${deletingSubLocationName}" record cannot be deleted because it is already in use.` }]
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

module.exports = updateLocation;

/**
 */

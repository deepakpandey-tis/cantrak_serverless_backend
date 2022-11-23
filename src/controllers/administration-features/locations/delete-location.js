const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const deleteLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;
        let deletedLocation;
        let deletedSubLocations;

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            id: Joi.number().required(),
            name: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][locations][deleteLocation]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

/*         //  Check already in use
        sqlStr = `SELECT * FROM sub_locations WHERE "orgId" = ${orgId} AND "companyId" = ${payload.companyId} AND "locationId" = ${payload.id} LIMIT 1`;

        var selectedRecs = await knex.raw(sqlStr);
        // console.log('selected recs: ', selectedRecs.rows);
        if(selectedRecs && selectedRecs.rows.length){
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Growing Location record cannot be deleted it is already used in Sub Growing Location!" }
                ]
            });
        }
 */

/* 2022/03/21 Sub Growing Location part of Growing Location Form, Deleting Growing Location also deletes Sub Growing Locations
        //  Delete record
        sqlStr = `DELETE FROM locations WHERE "id" = ${payload.id} AND "orgId" = ${orgId} AND "companyId" = ${payload.companyId}`;

        var deletedRecs = await knex.raw(sqlStr);
        // console.log('deleted recs: ', deletedRecs);

        if(deletedRecs && deletedRecs.rowCount < 1){
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Error in deleting Growing Location record!" }
                ]
            });
        }
 */

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            // First delete sub growing locations
            deletedSubLocations = await knex('sub_locations')
                .delete()
                .where({ locationId: payload.id, orgId: orgId, companyId: payload.companyId })
                .returning(["*"])
                .transacting(trx)

            // console.log('deleted sublocations: ', deletedSubLocations);

            // Now delete growing locations
            deletedLocation = await knex('locations')
                .delete()
                .where({ id: payload.id, orgId: orgId, companyId: payload.companyId })
                .returning(["*"])
                .transacting(trx)

            //  Log user activity
            let userActivity = {
                orgId: orgId,
                companyId: payload.companyId,
                entityId: payload.id,
                entityTypeId: EntityTypes.GrowingLocation,
                entityActionId: EntityActions.Delete,
                description: `${req.me.name} deleted growing location '${payload.name}' and its ${deletedSubLocations.length} sub growing location(s) on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                locationRecord: deletedLocation,
                subLocationRecords: deletedSubLocations
            },
            message: 'Growing Location deleted successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][locations][deleteLocation] :  Error", err);
        if (err.code == 23503){            // foreign key violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'Growing location record cannot be deleted because it is already in use.' }]
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

module.exports = deleteLocation;

/**
 */

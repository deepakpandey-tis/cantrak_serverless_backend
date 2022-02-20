const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const deleteLocation = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            companyId: Joi.number().required(),
            id: Joi.number().required(),
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

        return res.status(200).json({
            data: {
                record: deletedRecs
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

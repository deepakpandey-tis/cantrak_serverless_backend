const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const deleteStrain = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            specieId: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][strains][deleteStrain]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        //  Delete record
        sqlStr = `DELETE FROM strains WHERE "id" = ${payload.id} AND "specieId" = ${payload.specieId} AND "orgId" = ${orgId}`;

        var deletedRecs = await knex.raw(sqlStr);
        // console.log('deleted recs: ', deletedRecs);

        if(deletedRecs && deletedRecs.rowCount < 1){
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Error in deleting Strain record!" }
                ]
            });
        }

        return res.status(200).json({
            data: {
                record: deletedRecs
            },
            message: 'Strain deleted successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][strains][deleteStrain] :  Error", err);
        if (err.code == 23503){            // foreign key violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'Strain record cannot be deleted because it is already in use.' }]
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

module.exports = deleteStrain;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const deleteGrowthStage = async (req, res) => {
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
            "[controllers][administration-features][growth-stages][deleteGrowthStage]: JOi Result",
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
        sqlStr = `DELETE FROM growth_stages WHERE "id" = ${payload.id} AND "specieId" = ${payload.specieId} AND "orgId" = ${orgId}`;

        var deletedRecs = await knex.raw(sqlStr);
        // console.log('deleted recs: ', deletedRecs);

        if(deletedRecs && deletedRecs.rowCount < 1){
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Error in deleting Growth Stage record!" }
                ]
            });
        }

        return res.status(200).json({
            data: {
                record: deletedRecs
            },
            message: 'Growth Stage deleted successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][growth-stages][deleteGrowthStage] :  Error", err);
        if (err.code == 23503){            // foreign key violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'Growth Stage record cannot be deleted because it is already in use.' }]
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

module.exports = deleteGrowthStage;

/**
 */

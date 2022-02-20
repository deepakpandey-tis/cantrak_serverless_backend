const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');

const deleteItem = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][items][deleteItem]: JOi Result",
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
        sqlStr = `DELETE FROM items WHERE "id" = ${payload.id} AND "orgId" = ${orgId}`;

        var deletedRecs = await knex.raw(sqlStr);
        // console.log('deleted recs: ', deletedRecs);

        if(deletedRecs && deletedRecs.rowCount < 1){
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Error in deleting Item record!" }
                ]
            });
        }

        return res.status(200).json({
            data: {
                record: deletedRecs
            },
            message: 'Item deleted successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][items][deleteItem] :  Error", err);
        if (err.code == 23503){            // foreign key violation
            res.status(500).json({
                errors: [{ code: "UNKNOWN_SERVER_ERROR", message: 'Item record cannot be deleted because it is already in use.' }]
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

module.exports = deleteItem;

/**
 */

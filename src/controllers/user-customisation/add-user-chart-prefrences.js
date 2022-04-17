const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const knexReader = require("../../db/knex-reader");

const addUserChartPrefresences = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            name: Joi.string().required(),
            companyId: Joi.number().required(),
            configJson: Joi.array().required().items(Joi.object().keys({
                from: Joi.number().required(),
                to: Joi.number().required()
            }))
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][user-customisation][addUserChartPrefresences]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }


        payload.config_json = JSON.stringify(payload.configJson);
        delete payload.configJson;

        let currentTime = new Date().getTime();

        let cureentData = knexReader().where({orgId, userId, companyId: payload.companyId}).first();
        let msg;
        
        if(cureentData){
            let insertData = {
                orgId: orgId,
                userId: userId,
                ...payload,
            };
            console.log('List component columns template insert record: ', insertData);
    
            const insertResult = await knex
                .update(insertData)
                .where({companyId: payload.companyId})
                .returning(["*"])
                .into('user_chart_prefrences');
    
            insertedRecord = insertResult[0];
            msg = 'User Chart Prefrences Updated successfully.';
        }else{
            let insertData = {
                orgId: orgId,
                userId: userId,
                ...payload,
            };
            console.log('List component columns template insert record: ', insertData);
    
            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .into('user_chart_prefrences');
    
            insertedRecord = insertResult[0];
            msg = 'User Chart Prefrences added successfully.';
        }
        
        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: msg
        });
    } catch (err) {
        console.log("[controllers][user-customisation][addUserChartPrefresences] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addUserChartPrefresences;

/**
 */

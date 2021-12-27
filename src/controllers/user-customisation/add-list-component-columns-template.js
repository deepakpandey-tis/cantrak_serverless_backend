const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const addListComponentColumnsTemplate = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            listComponentName: Joi.string().required(),
            name: Joi.string().required(),
            defaultColumns: Joi.string().required(),
            displayColumns: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][user-customisation][addListComponentColumnsTemplate]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,

            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('List component columns template insert record: ', insertData);

        const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into('list_component_columns_templates');

        insertedRecord = insertResult[0];

        //  Add / Update to user_list_component_columns (user default)

        // Check already exists
        const alreadyExists = await knex('user_list_component_columns')
            .where({ orgId: orgId, userId:userId, listComponentName: payload.listComponentName });

        if (alreadyExists && alreadyExists.length) {

            const insertResult = await knex
            .update({listComponentColumnsTemplateId: insertedRecord.id})
            .where({ orgId: orgId, userId:userId, listComponentName: payload.listComponentName })
            .returning(["*"])
            .into('user_list_component_columns');

            insertedRecord = insertResult[0];
        }
        else {
            let insertDefaultData = {
                orgId: orgId,
                userId: userId,
                listComponentName: payload.listComponentName,
                listComponentColumnsTemplateId: insertedRecord.id,
            };
            console.log('User list component columns insert record: ', insertData);
    
            const insertDefaultResult = await knex
                .insert(insertDefaultData)
                .returning(["*"])
                .into('user_list_component_columns');
    
            let insertedDefaultRecord = insertDefaultResult[0];
        }

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'List component columns template added successfully.'
        });
    } catch (err) {
        console.log("[controllers][user-customisation][addListComponentColumnsTemplate] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addListComponentColumnsTemplate;

/**
 */

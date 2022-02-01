const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const addUserListComponentColumns = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            listComponentName: Joi.string().required(),
            listComponentColumnsTemplateId: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][user-customisation][addUserListComponentColumns]: JOi Result",
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
        const alreadyExists = await knex('user_list_component_columns')
            .where({ orgId: orgId, userId:userId, listComponentName: payload.listComponentName });

        let currentTime = new Date().getTime();
        if (alreadyExists && alreadyExists.length) {

            const insertResult = await knex
            .update({listComponentColumnsTemplateId: payload.listComponentColumnsTemplateId})
            .where({ orgId: orgId, userId:userId, listComponentName: payload.listComponentName })
            .returning(["*"])
            .into('user_list_component_columns');

            insertedRecord = insertResult[0];
        }
        else {
            let insertData = {
                orgId: orgId,
                userId: userId,
                ...payload,
            };
            console.log('User list component columns insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .into('user_list_component_columns');

            insertedRecord = insertResult[0];
        }

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'User list component columns default template updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][user-customisation][addUserListComponentColumns] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addUserListComponentColumns;

/**
 */

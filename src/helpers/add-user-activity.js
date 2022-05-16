const knex = require("../db/knex");

const addUserActivityHelper = {
  addUserActivity: async (userActivity) => {
    console.log("[helpers][addUserActivity][payload] userActivity:", userActivity)

    let insertedRecord = [];
    let insertResult;

    try {
        let insertData = {
            orgId: userActivity.orgId,
            companyId: userActivity.companyId,
            entityId: userActivity.entityId,
            entityTypeId: userActivity.entityTypeId,
            entityActionId: userActivity.entityActionId,
            description: userActivity.description,
            createdBy: userActivity.createdBy,
            createdAt: userActivity.createdAt
        };
        console.log('User Activity record: ', insertData);

        if(userActivity.trx){
            insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .transacting(userActivity.trx)
            .into('user_activities');
        }
        else {
            insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into('user_activities');
        }

        insertedRecord = insertResult[0];

        return {
            data: {
                record: insertedRecord
            },
            error: false,
            message: 'User activity added successfully.'
        };

    } catch (err) {

        console.log("[helpers][addUserActivity]:  Error", err);
        return {
            data: {
                record: insertedRecord
            },
            error: true,
            code: "UNKNOWN_SERVER_ERROR",
            message: err.message
        };
        // return { code: "UNKNOWN_ERROR", message: err.message, error: err };
    }
  },
};
module.exports = addUserActivityHelper;

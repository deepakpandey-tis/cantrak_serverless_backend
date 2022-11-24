const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const addUM = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            name: Joi.string().required(),
            abbreviation: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][ums][addUM]: JOi Result",
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
        const alreadyExists = await knexReader('ums')
            .where('name', 'iLIKE', payload.name.trim())
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][administration-features][ums][addUM]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "UoM already exist!" }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();
            let insertData = {
                orgId: orgId,
                ...payload,
                name: payload.name.trim(),
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('UM insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into('ums');

            insertedRecord = insertResult[0];

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: null,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.UoM,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added UoM '${insertedRecord.name}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                record: insertedRecord
            },
            message: 'UoM added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][ums][addUM] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addUM;

/**
 */

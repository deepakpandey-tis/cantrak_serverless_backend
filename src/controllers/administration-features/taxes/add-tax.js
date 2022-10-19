const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const addTax = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlResult;
        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            code: Joi.string().required(),
            description: Joi.string().allow(null).required(),
            percentage: Joi.number().required(),
            default: Joi.bool().required(),
            noTax: Joi.bool().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][taxes][addTax]: JOi Result",
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
        const alreadyExists = await knexReader('taxes')
            .where('code', 'iLIKE', payload.code.trim())
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][administration-features][taxes][addTax]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Tax code already exist!" }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();
            let insertData = {
                orgId: orgId,
                ...payload,
                code: payload.code.trim(),
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('Tax insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into('taxes');

            insertedRecord = insertResult[0];

            if(payload.default){
                //  Set other default tax, if any, to false
                sqlResult = await knex
                    .update({ default: false, updatedBy: userId, updatedAt: currentTime })
                    .where({ orgId: req.orgId, default: true })
                    .whereNot({ id: insertedRecord.id })
                    .returning(["*"])
                    .transacting(trx)
                    .into('taxes');
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: null,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Tax,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added tax '${insertedRecord.code}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
            message: 'Tax added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][taxes][addTax] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addTax;

/**
 */

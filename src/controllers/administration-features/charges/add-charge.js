const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');

const addCharge = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let sqlResult;
        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            code: Joi.string().required(),
            description: Joi.string().allow(null).required(),
            calculationUnit: Joi.number().required(),                   //  1: By Rate; 2: By Hour
            rate: Joi.number().required(),
            // taxId: Joi.number().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][charges][addCharge]: JOi Result",
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
        const alreadyExists = await knexReader('charges')
            .where('code', 'iLIKE', payload.code.trim())
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][administration-features][charges][addCharge]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Charge code already exist!" }
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
            console.log('Charge insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into('charges');

            insertedRecord = insertResult[0];

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: null,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Charge,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added charge '${insertedRecord.code}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
            message: 'Charge added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][charges][addCharge] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addCharge;

/**
 */

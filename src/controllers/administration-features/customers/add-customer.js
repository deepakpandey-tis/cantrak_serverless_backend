const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../../helpers/user-activity-constants');
const { CustomerTypes } = require('../../../helpers/txn-types');

const addCustomer = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            type: Joi.number().required(),
            contactPerson: Joi.string().allow('').allow(null).optional(),
            name: Joi.string().required(),
            customerTypeId: Joi.string().optional(),
            taxId: Joi.allow('').optional(),
            creditDays: Joi.number().optional(),
            address: Joi.allow('').optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][customers][addCustomer]: JOi Result",
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
        const alreadyExists = await knexReader('customers')
            .where('name', 'iLIKE', payload.name)
            .where({ orgId: req.orgId });

        console.log(
            "[controllers][administration-features][customers][addCustomer]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Customer already exist!" }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();
            let insertData = {
                orgId: orgId,
                ...payload,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('Customer insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into('customers');

            insertedRecord = insertResult[0];

            let customerType;
            if(payload.type == CustomerTypes.IndividualLocal){
                customerType = 'individual local';
            }
            else if(payload.type == CustomerTypes.IndividualForeigner){
                customerType = 'individual foreigner';
            }
            else if(payload.type == CustomerTypes.CorporateLocal){
                customerType = 'corporate local';
            }
            else if(payload.type == CustomerTypes.CorporateForeigner){
                customerType = 'corporate foreigner';
            }
            else if(payload.type == CustomerTypes.Government){
                customerType = 'government';
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: null,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.Customer,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added ${customerType} '${insertedRecord.name}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
            message: 'Customer added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][customers][addCustomer] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addCustomer;

/**
 */

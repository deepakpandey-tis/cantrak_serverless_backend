const Joi = require("@hapi/joi");
const knex = require('../../../db/knex');
const knexReader = require("../../../db/knex-reader");

const addItem = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            name: Joi.string().required(),
            itemCategoryId: Joi.string().required(),
            umId: Joi.string().required(),
            description: Joi.string().allow("").required(),
            refCode: Joi.string().allow(null).allow("").required(),
            gtin: Joi.string().allow(null).allow("").required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][administration-features][items][addItem]: JOi Result",
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
        const alreadyExists = await knexReader('items')
        .where({ orgId: req.orgId })
        .where({itemCategoryId: payload.itemCategoryId})
        .where((qb) => {
            qb.where('name', 'iLIKE', payload.name.trim())
            // .andWhere({itemCategoryId: payload.itemCategoryId})
            if(payload.refCode){
                qb.orWhere('refCode', 'iLIKE', payload.refCode.trim())
            }
        });

        console.log(
            "[controllers][administration-features][items][addItem]: ",
            alreadyExists
        );

        if (alreadyExists && alreadyExists.length) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: "Item already exist with same name or reference code!" }
                ]
            });
        }

        let currentTime = new Date().getTime();
        let insertData = {
            orgId: orgId,
            ...payload,
            name: payload.name.trim(),
            refCode: payload.refCode ? payload.refCode.trim() : null,
            createdBy: userId,
            createdAt: currentTime,
            updatedBy: userId,
            updatedAt: currentTime,
        };
        console.log('Item insert record: ', insertData);

        const insertResult = await knex
            .insert(insertData)
            .returning(["*"])
            .into('items');

        insertedRecord = insertResult[0];

        return res.status(200).json({
            data: {
                record: insertedRecord
            },
            message: 'Item added successfully.'
        });
    } catch (err) {
        console.log("[controllers][administration-features][items][addItem] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addItem;

/**
 */

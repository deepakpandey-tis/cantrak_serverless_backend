const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const addWasteMaterial = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            date: Joi.date().required(),
            itemCategoryId: Joi.number().integer().required(),
            itemId: Joi.string().required(),
            quantity: Joi.number().required(),
            umId: Joi.string().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            storageLocationId: Joi.string().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][inventories][addWasteMaterial]: JOi Result",
            result
        );

        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        await knex.transaction(async (trx) => {

            let currentTime = new Date().getTime();

            let insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                txnType: 11,
                date: new Date(payload.date).getTime(),
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                specieId: payload.specieId,
                strainId: payload.strainId,
                quantity: payload.quantity,
                umId: payload.umId,
                storageLocationId: payload.storageLocationId,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('waste txn insert record: ', insertData);

            const insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedRecord = insertResult[0];

            trx.commit;
        });

        return res.status(200).json({
            data: {
                txn: insertedRecord,
            },
            message: 'Waste material added successfully.'
        });
    } catch (err) {
        console.log("[controllers][inventories][addWasteMaterial] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addWasteMaterial;

/**
 */

const Joi = require("@hapi/joi");
const knex = require('../../db/knex');

const ItemCategory = {
    RawMaterial: 1,
    Product: 2,
    WasteMaterial: 3,
    FinishedGoods: 4
};

const TxnTypes ={
    ReceiveFromSupplier: 11,
    ReceiveFromTxnType: 11,
    ReceiveUptoTxnType: 50,
    IssueForPlantation: 51,
    IssueFromTxnType: 51,
    IssueUptoTxnType: 90,
};

const addPlant = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedIssueTxn = [];

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            itemTxnId: Joi.string().required(),
            itemCategoryId: Joi.string().required(),
            itemId: Joi.string().required(),
            umId: Joi.string().required(),
            storageLocationId: Joi.string().required(),
            itemLotNo: Joi.string().required(),
            specieId: Joi.string().required(),
            strainId: Joi.string().required(),
            supplierId: Joi.string().required(),
            locationId: Joi.string().required(),
            licenseId: Joi.string().required(),
            containerTypeId: Joi.string().required(),
            growthStageId: Joi.number().integer().required(),
            plantedOn: Joi.date().required(),
            plantsCount: Joi.number().integer().required(),
            additionalAttributes: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][plants][addPlant]: JOi Result",
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
                itemTxnId: payload.itemTxnId,
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                itemLotNo: payload.itemLotNo,
                specieId: payload.specieId,
                strainId: payload.strainId,
                supplierId: payload.supplierId,
                licenseId: payload.licenseId,
                containerTypeId: payload.containerTypeId,
                locationId: payload.locationId,
                plantedOn: new Date(payload.plantedOn).getTime(),
                plantsCount: payload.plantsCount,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("plant_lots");

            insertedRecord = insertResult[0];

            // Additional Attributes
            let additionalAttribute;
            let insertedAdditionalRecords = [];
            let additionalRecNo;

            additionalRecNo = 0;
            for (let rec of payload.additionalAttributes) {
                additionalAttribute = {
                    orgId: orgId,
                    plantLotId: insertedRecord.id,
                    attributeName: rec.attributeName,
                    attributeValue: rec.attributeValue,
                    createdBy: userId,
                    createdAt: currentTime,
                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('additionalAttribute: ', additionalAttribute);

                additionalRecNo += 1;
                const insertResult = await knex
                    .insert(additionalAttribute)
                    .returning(["*"])
                    .transacting(trx)
                    .into("plant_lot_attributes");

                insertedAdditionalRecords[additionalRecNo] = insertResult[0];
            }

            // Issue Txn
            insertData = {
                orgId: orgId,
                companyId: payload.companyId,
                txnType: TxnTypes.IssueForPlantation,
                date: new Date(payload.plantedOn).getTime(),
                itemCategoryId: payload.itemCategoryId,
                itemId: payload.itemId,
                lotNo: payload.itemLotNo,
                specieId: payload.specieId,
                strainId: payload.strainId,
                quantity: payload.plantsCount,
                umId: payload.umId,
                storageLocationId: payload.storageLocationId,
                plantLotId: insertedRecord.id,
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('waste txn insert record: ', insertData);

            insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("item_txns");

            insertedIssueTxn = insertResult[0];


            // Plants
            insertData = {
                orgId: orgId,
                ...payload,
                plantLotId: insertedRecord.id,
                plantedOn: new Date(payload.plantedOn).getTime(),
                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('plant insert record: ', insertData);

            const insertPayload = { ...insertData };
            ret = await knex.raw('select plants_save(?)', JSON.stringify(insertPayload));
            console.log(`[Return]: `, ret);

            trx.commit;
        });

        return res.status(200).json({
            data: ret.rows,
            message: 'Plants added successfully.'
        });
    } catch (err) {
        console.log("[controllers][plants][addPlant] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addPlant;

/**
 */

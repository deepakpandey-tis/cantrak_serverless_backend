const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');
// const { ItemCategory, TxnTypes, SystemStores } = require('../../helpers/txn-types');

const addTraceLot = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];

        const schema = Joi.object().keys({
            lotOfOption: Joi.number().required(),
            lotType: Joi.number().required(),
            companyId: Joi.number().allow(null).optional(),
            lotNo: Joi.string().required(),
            lotId: Joi.number().allow(null).optional(),
            itemTxnId: Joi.number().allow(null).optional(),
            description: Joi.string().required(),
            cultivatedBy: Joi.string().optional(),
            strainId: Joi.number().required(),
            // strain: Joi.string().optional(),
            specieId: Joi.number().required(),
            // specie: Joi.string().optional(),
            origin: Joi.string().optional(),
            locationId: Joi.number().allow(null).optional(),
            growingLocation: Joi.string().optional(),
            plantedDates: Joi.string().allow(null).optional(),
            plantedOn: Joi.date().optional(),
            plantsCount: Joi.number().optional(),
            harvestedOn: Joi.date().optional(),
            expiryDate: Joi.date().optional(),
            averageWeight: Joi.number().optional(),
            umId: Joi.number().required(),
            cbd: Joi.number().optional(),
            thc: Joi.number().optional(),
            cbg: Joi.number().optional(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][trace-lots][addTraceLot]: JOi Result",
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
                lotType: payload.lotType,
                companyId: payload.companyId,
                lotNo: payload.lotNo,
                productionLotId: payload.lotId,
                itemTxnId: payload.itemTxnId,
                description: payload.description,
                cultivatedBy: payload.cultivatedBy,
                strainId: payload.strainId,
                // strain: payload.strain,
                specieId: payload.specieId,
                // specie: payload.specie,
                origin: payload.origin,
                locationId: payload.locationId,
                growingLocation: payload.growingLocation,
                plantedDates: payload.plantedDates,
                plantedOn: payload.plantedOn ? new Date(payload.plantedOn).getTime() : null,
                plantsCount: payload.plantsCount,
                harvestedOn: payload.harvestedOn ? new Date(payload.harvestedOn).getTime() : null,
                expiryDate: payload.expiryDate ? new Date(payload.expiryDate).getTime() : null,
                averageWeight: payload.averageWeight,
                umId: payload.umId,
                cbd: payload.cbd,
                thc: payload.thc,
                cbg: payload.cbg,

                createdBy: userId,
                createdAt: currentTime,
                updatedBy: userId,
                updatedAt: currentTime,
            };
            console.log('trace_lots rec: ', insertData);

            let insertResult = await knex
                .insert(insertData)
                .returning(["*"])
                .transacting(trx)
                .into("trace_lots");

            insertedRecord = insertResult[0];

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: insertedRecord.companyId,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.TraceLot,
                entityActionId: EntityActions.Add,
                description: `${req.me.name} added trace QR detail '${insertedRecord.lotNo}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                record: insertedRecord,
            },
            message: 'Trace QR detail added successfully.'
        });
    } catch (err) {
        console.log("[controllers][trace-lots][addTraceLot] :  Error", err);
        //trx.rollback
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = addTraceLot;

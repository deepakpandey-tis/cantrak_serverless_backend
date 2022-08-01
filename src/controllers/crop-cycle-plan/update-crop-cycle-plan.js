const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const updateCropCyclePlan = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedDetail = [];

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            companyId: Joi.string().required(),
            date: Joi.date().required(),
            name: Joi.string().required(),
            description: Joi.string().allow(null).allow('').required(),
            inputItems: Joi.array().required(),
            deletedInputItems: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][ctop-cycle-plan]updateCropCyclePlan: JOi Result",
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

            let deletedRecords;
            for (const rec of payload.deletedInputItems) {
                deletedRecords = await knex('crop_cycle_plan_detail_gs')
                .delete()
                .where({ cropCyclePlanDetailId: rec.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)

                deletedRecords = await knex('crop_cycle_plan_detail')
                .delete()
                .where({ id: rec.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
            }

            let insertData = {
                date: new Date(payload.date).getTime(),
                name: payload.name,
                description: payload.description,

                updatedBy: userId,
                updatedAt: currentTime,
            };

            let insertResult = await knex
                .update(insertData)
                .where({ id: payload.id, orgId: orgId })
                .returning(["*"])
                .transacting(trx)
                .into("crop_cycle_plans");

            insertedRecord = insertResult[0];

            // Plan Detail
            let record;
            let recNo;
            let txnId;
            let insertDetail;

            txnId = null;
            recNo = 0;
            for (let rec of payload.inputItems) {
                if(rec.id){
                    record = {
                        strainId: rec.strainId,
                        specieId: rec.specieId,
                        locationId: rec.locationId,
                        subLocationId: rec.subLocationId,
                        expectedPlants: rec.expectedPlants,
                        startDate: new Date(rec.startDate).getTime(),
                        expectedHarvestDate: new Date(rec.expectedHarvestDate).getTime(),

                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('rec: ', record);

                    insertDetail = await knex
                        .update(record)
                        .where({ id: rec.id, orgId: orgId })
                        .returning(["*"])
                        .transacting(trx)
                        .into("crop_cycle_plan_detail");
                }
                else {
                    record = {
                        orgId: orgId,
                        cropCyclePlanId: payload.id,
                        specieId: rec.specieId,
                        locationId: rec.locationId,
                        subLocationId: rec.subLocationId,
                        expectedPlants: rec.expectedPlants,
                        startDate: new Date(rec.startDate).getTime(),
                        expectedHarvestDate: new Date(rec.expectedHarvestDate).getTime(),

                        createdBy: userId,
                        createdAt: currentTime,
                        updatedBy: userId,
                        updatedAt: currentTime,
                    };
                    console.log('rec: ', record);

                    insertDetail = await knex
                        .insert(record)
                        .returning(["*"])
                        .transacting(trx)
                        .into("crop_cycle_plan_detail");
                }

                insertedDetail[recNo] = insertDetail[0];

                for(let rec1 of rec.growthStages){
                    if(rec1.id){
                        record = {
                            cropCyclePlanDetailId: rec.id,
                            growthStageId: rec1.growthStageId,
                            name: rec1.name,
                            listOrder: rec1.listOrder,
                            noOfDays: rec1.noOfDays,
                            startDate: new Date(rec1.startDate).getTime(),
                            endDate: new Date(rec1.endDate).getTime(),

                            updatedBy: userId,
                            updatedAt: currentTime,
                        }

                        const insertResult = await knex
                        .update(record)
                        .where({ id: rec1.id, orgId: orgId })
                        .returning(["*"])
                        .transacting(trx)
                        .into("crop_cycle_plan_detail_gs");
                    }
                    else {
                        record = {
                            orgId: orgId,
                            cropCyclePlanDetailId: insertedDetail[recNo].id,
                            growthStageId: rec1.growthStageId,
                            name: rec1.name,
                            listOrder: rec1.listOrder,
                            noOfDays: rec1.noOfDays,
                            startDate: new Date(rec1.startDate).getTime(),
                            endDate: new Date(rec1.endDate).getTime(),

                            createdBy: userId,
                            createdAt: currentTime,
                            updatedBy: userId,
                            updatedAt: currentTime,
                        }

                        const insertResult = await knex
                        .insert(record)
                        .returning(["*"])
                        .transacting(trx)
                        .into("crop_cycle_plan_detail_gs");
                    }
                }

                recNo += 1;
            }

            //  Log user activity
            let userActivity = {
                orgId: insertedRecord.orgId,
                companyId: null,
                entityId: insertedRecord.id,
                entityTypeId: EntityTypes.CropCyclePlan,
                entityActionId: EntityActions.Edit,
                description: `${req.me.name} changed crop cycle plan '${insertedRecord.name}' on ${moment(currentTime).format("DD/MM/YYYY HH:mm:ss")} `,
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
            message: 'Crop Cycle Plan updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][ctop-cycle-plan][updateCropCyclePlan] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
    }
}

module.exports = updateCropCyclePlan;

/**
 */

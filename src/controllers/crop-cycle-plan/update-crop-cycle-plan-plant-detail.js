const Joi = require("@hapi/joi");
const knex = require('../../db/knex');
const moment = require("moment-timezone");
const addUserActivityHelper = require('../../helpers/add-user-activity')
const { EntityTypes, EntityActions } = require('../../helpers/user-activity-constants');

const updateCropCyclePlanPlantDetail = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        const payload = req.body;

        let insertedRecord = [];
        let insertedDetail = [];

        const schema = Joi.object().keys({
            cropCyclePlanName: Joi.string().required(),
            inputItems: Joi.array().required(),
        });

        const result = Joi.validate(payload, schema);
        console.log(
            "[controllers][ctop-cycle-plan]updateCropCyclePlanPlantDetail: JOi Result",
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

            // Plan Detail
            let record;
            let recNo;
            let insertDetail;

            recNo = 0;
            for (let rec of payload.inputItems) {
                record = {
                    plantLotId: rec.plantLotId,

                    updatedBy: userId,
                    updatedAt: currentTime,
                };
                console.log('rec: ', record);

                insertDetail = await knex
                    .update(record)
                    .where({ id: rec.id })
                    .returning(["*"])
                    .transacting(trx)
                    .into("crop_cycle_plan_detail");

                insertedDetail[recNo] = insertDetail[0];

                recNo += 1;
            }

            //  Log user activity
            let userActivity = {
                orgId: orgId,
                companyId: null,
                entityId: insertedDetail[0].id,
                entityTypeId: EntityTypes.CropCyclePlanDetail,
                entityActionId: EntityActions.Edit,
                description: `${req.me.name} updated plant lot in crop cycle plan '${payload.cropCyclePlanName}' on ${moment(currentTime).format('DD MMM YYYY hh:mm:ss a')} `,
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
                record: insertedDetail,
            },
            message: 'Crop cycle plant lot detail updated successfully.'
        });
    } catch (err) {
        console.log("[controllers][ctop-cycle-plan][updateCropCyclePlanPlantDetail] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
            });
    }
}

module.exports = updateCropCyclePlanPlantDetail;

/**
 */

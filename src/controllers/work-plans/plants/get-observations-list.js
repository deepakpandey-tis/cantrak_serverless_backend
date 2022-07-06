const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getObservationsList = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            workPlanScheduleLocationTaskId: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT i.*, it."tagData"`;
        sqlFrom = ` FROM images i, image_tags it`;
        sqlWhere = ` WHERE i."entityId" = ${payload.id} AND i."entityType" = 'plant' AND i."workPlanScheduleLocationTaskId" = ${payload.workPlanScheduleLocationTaskId} AND i."orgId" = ${orgId} AND it."orgId" = ${orgId} AND i.id = it."entityId" ORDER BY i.id desc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows,
            },
            message: "Observations List!"
        });

    } catch (err) {
        console.log("[controllers][work-plans][plants][getPlant] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getObservationsList;
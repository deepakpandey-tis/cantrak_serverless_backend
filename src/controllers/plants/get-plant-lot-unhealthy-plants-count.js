const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLotUnhealthyPlantsCount = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const schema = Joi.object().keys({
            id: Joi.string().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT DISTINCT ON (i."entityId") it."tagData"->'plantCondition'->'appearsIll',  it."tagData", i.id, i."entityId", p."plantLotId"`;
        sqlFrom = ` FROM images i, image_tags it, plants p`;
        sqlWhere = ` WHERE p."plantLotId" = ${payload.id} AND p."orgId" = ${orgId} AND p."isActive" AND NOT p."isWaste"`;
        sqlWhere += ` AND i.id = it."entityId" and i."entityId" = p.id`;
        sqlOrderBy = ` ORDER BY i."entityId" asc, i."createdAt" desc`;

        sqlStr = `SELECT count(*) FROM (` + sqlSelect + sqlFrom + sqlWhere + sqlOrderBy + `) a WHERE (a."tagData"->'plantCondition'->>'appearsIll')::boolean is true`;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant lot unhealthy plants count!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantLotUnhealthyPlantsCount] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLotUnhealthyPlantsCount;

const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLotAiResponsePlantsCount = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        const schema = Joi.object().keys({
            id: Joi.string().required(),
            locationId: Joi.number().allow(null).required(),
            subLocationId: Joi.number().allow(null).required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlStr = `WITH plant_current_locations AS
        (
        SELECT pl2."orgId", pl2."locationId", pl2."subLocationId", pl."id" "plantLotId", pl."lotNo", p.id "plantId"
        FROM plant_lots pl, plants p, plant_locations pl2
        WHERE pl."orgId" = ${orgId} AND pl."id" = ${payload.id}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"  AND p."isActive" AND not p."isWaste"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        `;

        if(payload.locationId){
            //  location specified; get for this location
            sqlStr += ` AND pl2."locationId" = ${payload.locationId} AND pl2."subLocationId" = ${payload.subLocationId}`;
        }

        sqlStr += ` AND pl2."locationId" IN (${req.GROWINGLOCATION})
        ), plants_with_ai_response AS
        (
        SELECT DISTINCT ON (i."entityId") i."entityId" , gt."apiResponse"
        FROM images i, growdoc_txns gt, plant_current_locations pcl
        WHERE i."orgId" = pcl."orgId" and i."entityType" = 'plant' and  i."entityId" = pcl."plantId" and gt."orgId" = i."orgId" and gt."entityType" = i."entityType" and gt."entityId" = i."id" -- and gt2."apiResponse"->>'Result' != 'Not A Plant'
        ORDER BY i."entityId" ASC, i."createdAt" DESC
        )
        SELECT count(*)
        FROM plants_with_ai_response pwar
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant lot AI response plants count!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantLotAiResponsePlantsCount] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLotAiResponsePlantsCount;

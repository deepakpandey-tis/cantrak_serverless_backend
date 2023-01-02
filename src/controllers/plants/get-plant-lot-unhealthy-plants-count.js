const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLotUnhealthyPlantsCount = async (req, res) => {
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
        SELECT pl2."locationId", pl2."subLocationId", pl."id" "plantLotId", pl."lotNo", p.id "plantId"
        FROM plant_lots pl, plants p, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = ${orgId} AND hpl."plantLotId" = ${payload.id} AND hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId"
        WHERE pl."orgId" = ${orgId} AND pl."id" = ${payload.id}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"  AND p."isActive" AND not p."isWaste"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        -- AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        `;

        if(payload.locationId){
            //  location specified; get unhealthy plants for this location
            sqlStr += ` AND pl2."locationId" = ${payload.locationId} AND pl2."subLocationId" = ${payload.subLocationId}`;
        }

        sqlStr += `AND pl2."locationId" IN (${req.GROWINGLOCATION})
        ), unhealthy_plants AS
        (
        SELECT DISTINCT ON (i."entityId") it."tagData"->'plantCondition'->'appearsIll',  it."tagData", pcl.*
        FROM images i, image_tags it, plant_current_locations pcl
        WHERE i.id = it."entityId" and i."entityId" = pcl."plantId"
        ORDER BY i."entityId" ASC, i."createdAt" DESC
        )
        SELECT count(*)
        FROM unhealthy_plants up
        WHERE (up."tagData"->'plantCondition'->>'appearsIll')::boolean is true
        GROUP BY up."locationId", up."subLocationId", up."plantLotId", up."lotNo"
        `;

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

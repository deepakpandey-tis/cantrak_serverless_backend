const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, sqlGroupBy;

        const schema = Joi.object().keys({
            companyId: Joi.string().required(),
            locationId: Joi.string().required(),
            subLocationId: Joi.string().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }


        sqlStr = `WITH plant_lot_current_locations AS (
        SELECT pl.id, pl."lotNo", pl.name "lotName", pl2."locationId", pl2."subLocationId"
        , coalesce(hpl."isFinalHarvest", false) "isFinalHarvest", coalesce(hpl."plantsCount", 0) "harvestedPlantsCount"
        , count(p."isActive") "plantsCount", sum(p."isWaste"::int) "wastePlants"
        FROM plant_lots pl, plants p, plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest"
        WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl2."locationId" = ${payload.locationId} AND pl2."subLocationId" = ${payload.subLocationId}
        AND pl.id = p."plantLotId" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id IN (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        GROUP BY pl.id, pl."lotNo", pl2."locationId", pl2."subLocationId" , coalesce(hpl."isFinalHarvest", false),  coalesce(hpl."isEntireLot" , false), coalesce(hpl."plantsCount", 0)
        )
        , plant_lot_current_locations_sum AS
        (select id, "lotNo", "lotName", "locationId", "subLocationId", "plantsCount", "wastePlants", "isFinalHarvest", sum("harvestedPlantsCount") "harvestedPlantsCount"
        from plant_lot_current_locations plcl
        group by id, "lotNo", "lotName", "locationId", "subLocationId", "plantsCount", "wastePlants", "isFinalHarvest"
        )
        select plcls.*, pl4."orgId", pl4."companyId", pl4."specieId", s."name" "specieName", pl4."strainId", s2."name" "strainName", pl4."licenseId"
        from plant_lot_current_locations_sum plcls, plant_lots pl4, species s, strains s2
        WHERE plcls.id = pl4.id AND pl4."specieId" = s.id AND pl4."strainId" = s2.id
        AND (plcls."plantsCount" - plcls."wastePlants" - plcls."harvestedPlantsCount") > 0
        ORDER BY plcls."lotNo"
        `;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Plant lots!"
        });

    } catch (err) {
        console.log("[controllers][harvest][plants][getPlantLots] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLots;

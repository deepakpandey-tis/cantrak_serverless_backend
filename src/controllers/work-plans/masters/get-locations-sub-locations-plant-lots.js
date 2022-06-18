const knexReader = require('../../../db/knex-reader');

const getLocationsSubLocationsPlantLots = async (req, res) => {
    try {
        let orgId = req.me.orgId;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy;

        sqlSelect = `SELECT l.*,
        (
            SELECT json_agg(row_to_json(sl1.*)) "subLocations" FROM
            (SELECT sl.*
                , (SELECT json_agg(row_to_json(pl1.*)) "plantLots" FROM 
                (select pl.*, (SELECT count(p.id)::int FROM plants p WHERE p."plantLotId" = pl.id AND p."isWaste") "wastePlants", s2."name" "specieName", s."name" "strainName" 
                FROM plant_lots pl, species s2 , strains s WHERE pl."orgId" = sl."orgId" AND pl."companyId" = sl."companyId" AND pl."locationId" = sl."locationId" AND pl."subLocationId" = sl.id AND pl."isActive" AND not pl."isFinalHarvest" AND pl."specieId" = s2.id AND pl."strainId" = s.id ORDER BY pl."lotNo") "pl1")
            FROM sub_locations sl WHERE sl."isActive" AND sl."locationId" = l.id ORDER BY sl."name") sl1 
        )
        `;

        sqlFrom = ` FROM locations l`;

        sqlWhere = ` WHERE l."orgId" = ${orgId} AND l."companyId" = ${payload.companyId} AND l."isActive" AND l."id" IN (${req.GROWINGLOCATION})`;

        sqlOrderBy = ` ORDER BY l.name asc`;

        sqlStr = sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        
        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows
            },
            message: "Locations Sub Locations Plant Lots!"
        });
    } catch (err) {
        console.log("[controllers][work-plans][masters][getLocationsSubLocationsPlantLots] :  Error", err);
        res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }]
        });
    }
}

module.exports = getLocationsSubLocationsPlantLots;

/**
 */

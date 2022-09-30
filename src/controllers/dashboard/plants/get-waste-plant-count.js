const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getWastePlantCount = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

/*         const schema = Joi.object().keys({
            companyId: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }
 */
        sqlSelect = `SELECT count(p."plantSerial") "wastePlants"
        `;

        sqlFrom = ` FROM plant_lots pl , plants p , plant_locations pl2
        LEFT JOIN harvest_plant_lots hpl ON hpl."orgId" = pl2."orgId" AND hpl."companyId" = pl2."companyId" AND hpl."plantLotId" = pl2."plantLotId" AND hpl."locationId" = pl2."locationId" AND hpl."subLocationId" = pl2."subLocationId" AND hpl."isFinalHarvest"
        `;

        // sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."isActive" AND NOT pl."isFinalHarvest"
        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."isActive"
        AND pl.id = p."plantLotId" AND p."isWaste" AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId"
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND (NOT coalesce(hpl."isFinalHarvest", false) OR (coalesce(hpl."isFinalHarvest", false) AND NOT coalesce(hpl."isEntireLot" , false)))
        AND pl2."locationId" IN (${req.GROWINGLOCATION})
        `;

        if(!Array.isArray(payload.locationId) && payload.locationId != 0){
            sqlWhere += ` AND pl2."locationId"  = ${payload.locationId}`;
        }
        else if(Array.isArray(payload.locationId) && payload.locationId.length > 0 && payload.locationId[0] != 0){
            sqlWhere += ` AND pl2."locationId" IN (${payload.locationId.join()})`;
        }

        if(!Array.isArray(payload.subLocationId) && payload.subLocationId != 0){
            sqlWhere += ` AND pl2."subLocationId"  = ${payload.subLocationId}`;
        }
        else if(Array.isArray(payload.subLocationId) && payload.subLocationId.length > 0 && payload.subLocationId[0] != 0){
            sqlWhere += ` AND pl2."subLocationId" IN (${payload.subLocationId.join()})`;
        }

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Waste Plant Count!"
        });

    } catch (err) {
        console.log("[controllers][dashboard][plants][getWastePlantCount] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getWastePlantCount;

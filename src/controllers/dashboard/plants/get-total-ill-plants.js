const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getTotalIllPlants = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlObservation;

        sqlSelect = `SELECT count(DISTINCT p."plantSerial") "totalIllPlants"`;

        sqlFrom = ` FROM plant_lots pl , plant_locations pl2 , plants p`;
        //  Ill Plants
        sqlObservation = `(SELECT DISTINCT ON (i."entityId") it."tagData", i."entityId" FROM images i, image_tags it WHERE i.id = it."entityId" AND ("tagData"->'plantCondition'->>'appearsIll')::boolean is true ORDER BY i."entityId" asc, i."createdAt" DESC) observation`;
        sqlFrom += ` JOIN ${sqlObservation} ON p.id = observation."entityId"`;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."isActive" AND NOT pl."isFinalHarvest"
        AND NOT p."isWaste" AND pl.id = p."plantLotId" AND p.id = pl2."plantId"
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
            message: "Ill Plants Count!"
        });

    } catch (err) {
        console.log("[controllers][dashboard][plants][getTotalIllPlants] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getTotalIllPlants;

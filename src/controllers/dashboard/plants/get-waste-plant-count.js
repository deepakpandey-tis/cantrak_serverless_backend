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

        sqlFrom = ` FROM plant_lots pl , plants p , plant_locations pl2`;

        sqlWhere = ` WHERE pl."orgId" = ${orgId} AND pl."companyId" = ${payload.companyId} AND pl."isActive" AND NOT pl."isFinalHarvest"
        AND pl.id = p."plantLotId" AND p."isWaste" AND p.id = pl2."plantId"
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

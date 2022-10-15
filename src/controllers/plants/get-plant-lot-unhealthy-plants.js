const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getPlantLotUnhealthyPlants = async (req, res) => {

    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;
        let {id, locationId, subLocationId} = req.body;

        let sqlStr;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
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

        sqlStr = `SELECT pl.id, pl."lotNo", p.id "plantId", p."plantSerial", l."name" "locationName", sl."name" "subLocationName", gs."name" "growthStageName"
        , i.*, it.*
        , (SELECT json_build_object('id', string_agg(d.id::varchar(15), ', '),  'name', string_agg(d."name", ', ')) "diseases" from diseases d, UNNEST(string_to_array(regexp_replace((it."tagData"->'plantCondition'->>'diseases'), '[\\[" \\]]', '', 'g'), ',')::bigint[]) did where d.id = did)
        FROM image_tags it , images i, plants p, plant_lots pl, plant_locations pl2, plant_growth_stages pgs, locations l, sub_locations sl, growth_stages gs
        WHERE pl.id = ${id} AND pl."orgId" = ${orgId} AND pl.id = p."plantLotId" AND NOT p."isWaste" AND p.id = i."entityId" AND i."orgId" = pl."orgId" AND i."entityType" = 'plant' AND it."orgId" = i."orgId" AND it."entityId" = i.id
        AND p."orgId" = pl2."orgId" AND p.id = pl2."plantId" AND pl2."locationId" = l.id AND pl2."subLocationId" = sl.id 
        AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id order by pl3.id desc limit 1)
        AND p."orgId" = pgs."orgId" AND p.id = pgs."plantId" AND pgs."growthStageId" = gs.id 
        AND pgs.id in (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."orgId" = pl."orgId" AND pgs2."plantId" = p.id order by pgs2.id desc limit 1)
        AND it.id in (SELECT it2.id FROM image_tags it2, images i2 WHERE it2."entityId" = i2.id AND it2."entityType" = 'plant' AND i2."entityId" = p.id order by it2."createdAt" desc limit 1)
        AND (it."tagData"->'plantCondition'->>'appearsIll')::boolean is true
        `;

        if(locationId){
            sqlStr += ` AND pl2."locationId" = ${locationId}`;
        }
        if(subLocationId){
            sqlStr += ` AND pl2."subLocationId" = ${subLocationId}`;
        }
        
        sqlStr += ` ORDER BY it."createdAt" desc, p."plantSerial" desc
        `;

        console.log('getPlantLotUnhealthyPlants: ', sqlStr);

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Plant lot unhealthy plants!"
        });

    } catch (err) {
        console.log("[controllers][plants][getPlantLotUnhealthyPlants] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLotUnhealthyPlants;

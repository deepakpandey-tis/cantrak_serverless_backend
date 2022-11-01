const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getPlantLotGrowthStages = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr;
        // , sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, sqlGroupBy;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
            locationId: Joi.number().required(),
            subLocationId: Joi.number().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }
/* 
        //  Get plant lot growth stages
        sqlSelect = `SELECT DISTINCT  pl."lotNo", gs."listOrder", gs."name", pgs."startDate" "startDate"`;
        sqlFrom = ` FROM plant_lots pl , plants p , plant_growth_stages pgs , growth_stages gs`;
        sqlWhere = ` WHERE pl."id" = ${payload.id}`;
        sqlWhere += ` AND pl.id = p."plantLotId" and pgs."plantId" = p.id and pgs."growthStageId" = gs.id`;
        sqlWhere += ` AND pgs.id IN (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id AND pgs2."growthStageId" = pgs."growthStageId" ORDER BY id DESC limit 1)`;
        // sqlWhere += ` AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id ORDER BY id DESC limit 1)`;
        sqlOrderBy = ` ORDER BY pl."lotNo" , gs."listOrder"`;

        //  Get growth stage end date (start date of next growth stage is end date of the current growth stage) using lead() function
        // sqlStr = ` SELECT pgs3.* , case when lead(pgs3."startDate") over (partition by pgs3."lotNo" order by pgs3."startDate") is null then (extract(epoch from now()) * 1000)::bigint else lead(pgs3."startDate") over (partition by pgs3."lotNo" order by pgs3."startDate") end "endDate"
        sqlStr = ` SELECT pgs3.* , lead(pgs3."startDate") over (partition by pgs3."lotNo" order by pgs3."startDate") "endDate"
        FROM (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        sqlStr += ` ) pgs3`;
 */

        //  Get current growth stages of plant lot at location - subLocation
        //  Get growth stage end date (start date of next growth stage is end date of the current growth stage) using lead() function
        sqlStr = `SELECT pgs3.*
        , case when lead(pgs3."startDate") over (partition by pgs3."lotNo" order by pgs3."startDate") is null then (extract(epoch from now()) * 1000)::bigint else lead(pgs3."startDate") over (partition by pgs3."lotNo" order by pgs3."startDate") end "endDate"
        FROM (
            SELECT DISTINCT ON (gs."listOrder") pl."lotNo", pgs."startDate", to_timestamp(pgs."startDate"/1000)::date "startDateStr" , gs."name", gs."listOrder"
            FROM plant_lots pl , plants p , plant_locations pl2, plant_growth_stages pgs , growth_stages gs
            WHERE pl."id" = ${payload.id} AND pl."orgId" = ${orgId} AND pl."orgId" = p."orgId"  AND pl.id = p."plantLotId"
            AND pl."orgId" = pl2."orgId" AND p.id = pl2."plantId" AND pl2."locationId" = ${payload.locationId} AND pl2."subLocationId" = ${payload.subLocationId}
            AND pl2.id in (SELECT id FROM plant_locations pl3 WHERE pl3."orgId" = pl."orgId" AND pl3."plantId" = p.id ORDER BY pl3.id DESC LIMIT 1)
            AND pl."orgId" = pgs."orgId" AND pgs."plantId" = p.id AND pgs."growthStageId" = gs.id
            AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pl."orgId" = pgs2."orgId" AND pgs2."plantId" = p.id ORDER BY pgs2.id DESC LIMIT 1)
            ORDER BY gs."listOrder" , pgs."startDate" desc
        ) pgs3
        `;

        console.log('get plant lot growth stages: ', sqlStr);

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                records: selectedRecs.rows,
            },
            message: "Plant lot growth stages!"
        });

    } catch (err) {
        console.log("[controllers][crop-cycle-plan][getPlantLotGrowthStages] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getPlantLotGrowthStages;

const Joi = require("@hapi/joi");
const knexReader = require("../../../db/knex-reader");

const getPlantLotGrowthStages = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere, sqlOrderBy, sqlGroupBy;

        const schema = Joi.object().keys({
            id: Joi.number().required(),
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        //  Get plant lot growth stages
        sqlSelect = `SELECT DISTINCT  pl."lotNo", gs."listOrder", gs."name", pgs."startDate" "startDate"`;
        sqlFrom = ` FROM plant_lots pl , plants p , plant_growth_stages pgs , growth_stages gs`;
        sqlWhere = ` WHERE pl."id" = ${payload.id}`;
        sqlWhere += ` AND pl.id = p."plantLotId" and pgs."plantId" = p.id and pgs."growthStageId" = gs.id`;
        sqlWhere += ` AND pgs.id = (SELECT id FROM plant_growth_stages pgs2 WHERE pgs2."plantId" = p.id ORDER BY id DESC limit 1)`;
        sqlOrderBy = ` ORDER BY pl."lotNo" , gs."listOrder"`;

        //  Get growth stage end date (start date of next growth stage is end date of the current growth stage) using lead() function
        sqlStr = ` SELECT pgs3.* , lead(pgs3."startDate") over (partition by pgs3."lotNo" order by pgs3."startDate") "endDate"
        FROM (`;
        sqlStr += sqlSelect + sqlFrom + sqlWhere + sqlOrderBy;
        sqlStr += ` ) pgs3`;

        // console.log('get plant lot growth stages: ', sqlStr);

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

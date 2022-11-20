const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getGrowthStageTxn = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.number().required()
        });
        const result = Joi.validate(payload, schema);
        if (result && result.hasOwnProperty("error") && result.error) {
            return res.status(400).json({
                errors: [
                    { code: "VALIDATION_ERROR", message: result.error.message }
                ]
            });
        }

        sqlSelect = `SELECT pgst.*, pl."lotNo", pl."name" "plantName", l.name "locationName", sl.name "subLocationName", gs.name "fromGrowthStageName"
        , gs2.name "toGrowthStageName", s."name" "strainName", s2."name" "specieName", c."companyName"
        , rm.description "remark"
        `;

        sqlFrom = ` FROM plant_growth_stage_txns pgst
        LEFT JOIN remarks_master rm ON pgst.id = rm."entityId" and rm."entityType" = 'plant_change_growth_stage'
        , plant_lots pl, growth_stages gs, growth_stages gs2, locations l, sub_locations sl, strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE pgst.id = ${payload.id} AND pgst."orgId" = ${orgId}`;
        sqlWhere += ` AND pgst."plantLotId" = pl.id AND pgst."fromGrowthStageId" = gs.id AND pgst."toGrowthStageId" = gs2.id`;
        sqlWhere += ` AND pgst."locationId" = l.id AND pgst."subLocationId" = sl.id AND pl."strainId" = s.id AND pl."specieId" = s2.id and pl."companyId" = c.id `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant growth stage txn detail!"
        });

    } catch (err) {
        console.log("[controllers][plants][getGrowthStageTxn] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getGrowthStageTxn;

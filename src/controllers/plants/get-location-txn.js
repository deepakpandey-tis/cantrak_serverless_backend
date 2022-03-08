const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getLocationTxn = async (req, res) => {
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

        sqlSelect = `SELECT plt.*, pl."lotNo", l.name "fromLocationName", sl.name "fromSubLocationName", l2.name "toLocationName", sl2.name "toSubLocationName"
        , gs.name "growthStageName", s."name" "strainName", s2."name" "specieName", c."companyName"
        , rm.description "remark"
        `;

        sqlFrom = ` FROM plant_location_txns plt
        LEFT JOIN remarks_master rm ON pgst.id = rm."entityId" and rm."entityType" = 'plant_change_location'
        , plant_lots pl, locations l, sub_locations sl, locations l2, sub_locations sl2
        , growth_stages gs, strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE plt.id = ${payload.id} AND plt."orgId" = ${orgId}`;
        sqlWhere += ` AND plt."plantLotId" = pl.id AND plt."fromLocationId" = l.id AND plt."fromSubLocationId" = sl.id AND plt."toLocationId" = l2.id AND plt."toSubLocationId" = sl2.id`;
        sqlWhere += ` AND plt."growthStageId" = gs.id AND pl."strainId" = s.id AND pl."specieId" = s2.id and pl."companyId" = c.id `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant location txn detail!"
        });

    } catch (err) {
        console.log("[controllers][plants][getLocationTxn] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getLocationTxn;

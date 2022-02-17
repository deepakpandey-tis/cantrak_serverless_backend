const Joi = require("@hapi/joi");
const knexReader = require("../../db/knex-reader");

const getLocationTxnPlants = async (req, res) => {
    try {
        let orgId = req.me.orgId;
        let userId = req.me.id;

        let payload = req.body;

        let sqlStr, sqlSelect, sqlFrom, sqlWhere;

        const schema = Joi.object().keys({
            id: Joi.string().required()
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
        , (SELECT json_agg(row_to_json(p.*)) "plants" 
        FROM (
            SELECT pl.*, p."plantSerial" FROM plant_locations pl, plants p
            WHERE pl."plantLocationTxnId" = plt.id AND pl."plantId" = p.id
            ORDER BY p."plantSerial"
            ) p
        )
        `;

        sqlFrom = ` FROM plant_location_txns plt, plant_lots pl, locations l, sub_locations sl, locations l2, sub_locations sl2
        , growth_stages gs, strains s, species s2, companies c
        `;

        sqlWhere = ` WHERE plt.id = ${payload.id} AND pl."orgId" = ${orgId} `;
        sqlWhere += ` AND plt."plantLotId" = pl.id AND plt."fromLocationId" = l.id AND plt."fromSubLocationId" = sl.id AND plt."toLocationId" = l2.id AND plt."toSubLocationId" = sl2.id`;
        sqlWhere += ` AND plt."growthStageId" = gs.id AND pl."strainId" = s.id AND pl."specieId" = s2.id and pl."companyId" = c.id `;

        sqlStr = sqlSelect + sqlFrom + sqlWhere;

        var selectedRecs = await knexReader.raw(sqlStr);

        return res.status(200).json({
            data: {
                record: selectedRecs.rows[0],
            },
            message: "Plant location txn plants!"
        });

    } catch (err) {
        console.log("[controllers][plants][getLocationTxnPlants] :  Error", err);
        return res.status(500).json({
            errors: [{ code: "UNKNOWN_SERVER_ERROR", message: err.message }],
        });

    }

}

module.exports = getLocationTxnPlants;
